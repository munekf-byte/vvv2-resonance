# TGR アプリ側 Discord 連携改修 指示書

**目的**: TGR（vvv2-resonance）アプリに Discord 連携機能を追加し、Pro 購入後に Discord Bot が自動でロールを付与できるようにする。

**前提**: Discord Bot（hivemind-bot）は Render 上で稼働中。HTTP API エンドポイント `POST /api/discord/grant-role` が利用可能。

---

## 1. 概要

Pro ユーザーが Discord ID をアプリに登録すると、Bot が自動でロールを付与する仕組みを作る。

```
[ユーザーが VIP ROOM で Discord ID を入力・保存]
  ↓
[profiles テーブルに discord_id が保存される]
  ↓
[Stripe 決済完了 → webhook で is_pro = true に更新]
  ↓
[webhook 内で discord_id があれば Bot API を呼び出し]
  ↓
[Bot が TGR-Pro ロールを自動付与]
```

※ 既に Pro のユーザーが後から Discord ID を登録するケースもあるので、Discord ID 保存時にも is_pro = true なら即座に Bot API を呼ぶ。

---

## 2. Supabase スキーマ変更

### 2.1 マイグレーションファイル作成

ファイル: `supabase/migrations/009_add_discord_id.sql`

```sql
-- profiles テーブルに discord_id カラムを追加
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS discord_id TEXT DEFAULT NULL;

-- Bot からの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id
ON public.profiles(discord_id)
WHERE discord_id IS NOT NULL;
```

### 2.2 Supabase ダッシュボードで直接実行

上記 SQL を Supabase ダッシュボードの SQL Editor でも実行すること（マイグレーションファイルはコード管理用）。

---

## 3. 型定義の更新

### 3.1 `src/lib/supabase/client.ts`

`profiles` テーブルの `Row` / `Insert` / `Update` 型に `discord_id` を追加。

**Row に追加:**
```typescript
discord_id: string | null;
```

**Insert に追加:**
```typescript
discord_id?: string | null;
```

**Update に追加:**
```typescript
discord_id?: string | null;
```

---

## 4. Discord ID 保存用 API Route 作成

### ファイル: `src/app/api/discord-link/route.ts`（新規作成）

```typescript
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { discord_id } = await request.json();

    // Discord ID のバリデーション（17-20桁の数字）
    if (!discord_id || !/^\d{17,20}$/.test(discord_id)) {
      return NextResponse.json({ error: "無効な Discord ID です" }, { status: 400 });
    }

    // profiles テーブルに discord_id を保存
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ discord_id })
      .eq("id", user.id);

    if (updateErr) {
      console.error("[discord-link] Update error:", updateErr.message);
      return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
    }

    // is_pro = true なら即座に Bot API でロール付与
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    if (profile?.is_pro) {
      await grantDiscordRole(discord_id, "TGR-Pro");
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[discord-link] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function grantDiscordRole(discord_id: string, role: string) {
  const botApiUrl = process.env.DISCORD_BOT_API_URL;
  const botApiSecret = process.env.DISCORD_BOT_API_SECRET;

  if (!botApiUrl || !botApiSecret) {
    console.warn("[discord-link] Bot API URL/Secret not configured, skipping role grant");
    return;
  }

  try {
    const res = await fetch(`${botApiUrl}/api/discord/grant-role`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${botApiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ discord_id, role }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[discord-link] Bot API error:", res.status, body);
    } else {
      console.log("[discord-link] Role granted:", role, "to", discord_id);
    }
  } catch (err) {
    console.error("[discord-link] Bot API fetch failed:", err);
  }
}
```

---

## 5. Stripe Webhook の改修

### ファイル: `src/app/api/webhook/stripe/route.ts`（既存を改修）

**現在の処理フロー:**
1. Stripe signature 検証
2. `checkout.session.completed` イベント処理
3. `profiles.is_pro = true` に更新

**追加する処理（is_pro 更新成功の直後）:**

`is_pro = true` への更新が成功した後、`discord_id` を取得して Bot API を呼ぶ。

```typescript
// ===== 追加: Discord ロール自動付与 =====
// is_pro 更新成功後に discord_id を取得
const { data: profileData } = await supabaseAdmin
  .from("profiles")
  .select("discord_id")
  .eq("id", userId)
  .single();

if (profileData?.discord_id) {
  const botApiUrl = process.env.DISCORD_BOT_API_URL;
  const botApiSecret = process.env.DISCORD_BOT_API_SECRET;
  
  if (botApiUrl && botApiSecret) {
    try {
      await fetch(`${botApiUrl}/api/discord/grant-role`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${botApiSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          discord_id: profileData.discord_id,
          role: "TGR-Pro",
        }),
      });
      console.log("[Webhook] Discord role granted for", userId);
    } catch (err) {
      // Discord ロール付与失敗は決済成功を妨げない（ログだけ）
      console.error("[Webhook] Discord role grant failed:", err);
    }
  }
}
// ===== 追加ここまで =====
```

**挿入位置**: 既存コードの `console.log("[Webhook] SUCCESS: is_pro=true for", userId);` の直後（60行目付近）。insert ルートの後（77行目付近）にも同様の処理を追加。

---

## 6. VIP ROOM UI の改修

### ファイル: `src/app/pro/page.tsx`（既存を改修）

Pro ユーザー向け表示（パターンB: VIP ROOM）に Discord ID 連携セクションを追加する。

**追加位置**: 既存の「Discord招待」カードの直前（113行目付近）。

**必要な state 追加（コンポーネント冒頭）:**
```typescript
const [discordId, setDiscordId] = useState("");
const [discordLinked, setDiscordLinked] = useState(false);
const [discordSaving, setDiscordSaving] = useState(false);
const [discordError, setDiscordError] = useState("");
```

**useEffect で既存の discord_id を取得（コンポーネント冒頭）:**
```typescript
useEffect(() => {
  if (profile?.discord_id) {
    setDiscordId(profile.discord_id);
    setDiscordLinked(true);
  }
}, [profile]);
```

**注意**: `ProfileRow` 型に `discord_id` が追加されている前提。AuthContext の `fetchProfile` は `select("*")` なので、カラム追加だけで自動的に取得される。

**Discord ID 保存ハンドラ:**
```typescript
async function handleDiscordLink() {
  if (!discordId || !/^\d{17,20}$/.test(discordId)) {
    setDiscordError("Discord IDは17〜20桁の数字です");
    return;
  }
  setDiscordSaving(true);
  setDiscordError("");
  try {
    const res = await fetch("/api/discord-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discord_id: discordId }),
    });
    if (res.ok) {
      setDiscordLinked(true);
    } else {
      const data = await res.json();
      setDiscordError(data.error || "保存に失敗しました");
    }
  } catch {
    setDiscordError("通信エラーが発生しました");
  } finally {
    setDiscordSaving(false);
  }
}
```

**UIコンポーネント（Discord招待カードの直前に挿入）:**
```tsx
{/* Discord ID 連携 */}
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <div className="px-5 py-3" style={{ backgroundColor: "#292524" }}>
    <p className="text-sm font-mono font-bold" style={{ color: "#fef3c7" }}>
      🔗 Discord 連携
    </p>
  </div>
  <div className="px-5 py-4">
    {discordLinked ? (
      <div className="flex items-center gap-2">
        <span className="text-green-600 font-mono font-bold text-sm">✓ 連携済み</span>
        <span className="text-gray-400 font-mono text-xs">{discordId}</span>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="font-mono text-xs text-gray-500 leading-relaxed">
          Discord ユーザーID を入力すると、機種別チャンネルへのアクセスが自動で有効になります。
        </p>
        <p className="font-mono text-[10px] text-gray-400 leading-relaxed">
          ※ 確認方法: Discord設定 → マイアカウント → ユーザー名の下の「...」→ ユーザーIDをコピー（開発者モードONが必要）
        </p>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Discord ユーザーID（数字）"
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ""))}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 font-mono text-sm text-gray-900 placeholder:text-gray-400"
        />
        {discordError && (
          <p className="font-mono text-xs text-red-500">{discordError}</p>
        )}
        <button
          onClick={handleDiscordLink}
          disabled={discordSaving || !discordId}
          className="w-full py-3 rounded-lg font-mono font-bold text-sm text-white active:scale-95 transition-transform disabled:opacity-60"
          style={{ backgroundColor: "#5865F2" }}
        >
          {discordSaving ? "保存中..." : "連携する"}
        </button>
      </div>
    )}
  </div>
</div>
```

---

## 7. 環境変数の追加

### Vercel（TGRアプリ側）に以下の環境変数を追加:

| Key | Value | 説明 |
|-----|-------|------|
| `DISCORD_BOT_API_URL` | `https://hivemind-bot-li18.onrender.com` | Bot の Render URL |
| `DISCORD_BOT_API_SECRET` | （Bot側の .env にある `BOT_API_SECRET` と同じ値） | Bot API 認証用 |

### 設定場所:
- Vercel ダッシュボード → vvv2-resonance → Settings → Environment Variables

### ローカル開発用:
`.env.local` にも同じ値を追加。

---

## 8. 改修対象ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `supabase/migrations/009_add_discord_id.sql` | **新規** | discord_id カラム追加 |
| `src/lib/supabase/client.ts` | **改修** | ProfileRow 型に discord_id 追加 |
| `src/app/api/discord-link/route.ts` | **新規** | Discord ID 保存 + 即時ロール付与 API |
| `src/app/api/webhook/stripe/route.ts` | **改修** | is_pro 更新後に Bot API コール追加 |
| `src/app/pro/page.tsx` | **改修** | VIP ROOM に Discord ID 入力UI追加 |
| `.env.local` | **改修** | DISCORD_BOT_API_URL, DISCORD_BOT_API_SECRET 追加 |

---

## 9. 実装順序

1. Supabase で SQL 実行（discord_id カラム追加）
2. 型定義更新（client.ts）
3. API Route 作成（discord-link）
4. Stripe webhook 改修
5. VIP ROOM UI 改修
6. ローカルテスト
7. Vercel に環境変数追加
8. デプロイ

---

## 10. テスト手順

### ケースA: 既存Proユーザーが後から Discord ID を登録
1. Pro ユーザーでログイン
2. VIP ROOM で Discord ID を入力 →「連携する」
3. Discord でそのユーザーに TGR-Pro ロールが付与されているか確認

### ケースB: Discord ID 登録済みユーザーが Pro を購入
1. Discord ID を連携済みの無料ユーザーで Pro を購入
2. Stripe webhook 経由で is_pro = true に更新
3. 自動で Bot API が呼ばれ、TGR-Pro ロールが付与されるか確認

### ケースC: バリデーション
1. 数字以外の文字を入力 → エラーが出るか
2. 桁数が足りない → エラーが出るか

---

## 11. 既存コードの参照情報

これらのファイルは改修時に参照が必要:

- `src/components/auth/AuthContext.tsx` — profile の取得処理。`select("*")` なので discord_id 追加後は自動で取得される
- `src/lib/supabase/server.ts` — サーバー側 Supabase クライアント生成
- `src/lib/stripe/server.ts` — Stripe インスタンス生成
- `src/lib/config/links.ts` — LINK_DISCORD 等の外部リンク定義
- `src/lib/auth/access.ts` — canAccessTotalAnalysis 等のアクセス制御

---

## 12. 注意事項

- Discord ロール付与の失敗は Stripe 決済の成功を妨げてはならない（try-catch で握りつぶし、ログだけ出す）
- Bot API URL に末尾スラッシュを付けない（`https://hivemind-bot-li18.onrender.com` が正しい）
- Stripe はまだサンドボックス環境の可能性あり。本番切り替え時に webhook URL と API キーの更新が必要
- VIP ROOM の UI は既存デザインシステム（font-mono、ウォームベージュ背景、浮遊カード）に準拠すること
