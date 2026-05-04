# Stripe決済 → Pro化 → Discord OAuth連携 → ロール自動付与 スキル

**目的**: 「買い切り決済で Pro 化 → Discord を OAuth でワンタップ連携 → 専用チャンネル解放」という **固定パターン** を、新規アプリでも100%再現できるようにする。

**適用範囲**: Next.js 15 (App Router) + Supabase + Stripe + Discord Bot 構成のアプリ全般。

**起点**: このスキルは TGR Resonance での実運用 E2E 検証済み（2026-04-22）パターンを基にしている。

---

## 0. このスキルを読む順序

| セクション | いつ読むか |
|-----------|-----------|
| 1. 全体アーキテクチャ | 最初に必ず。フロー全体を頭に入れる |
| 2. 前提条件 | 着手前。足りないものがあれば先に用意 |
| 3. 実装順序 | 作業開始時。上から順に実行 |
| 4. ファイルテンプレート | 実装中に各ファイルをコピペ |
| 5. 外部サービス設定 | Discord/Stripe/Vercel/Supabase の UI 作業 |
| 6. 環境変数一覧 | 設定漏れ防止 |
| 7. E2E テスト手順 | 動作確認 |
| 8. トラブルシュート | 詰まった時 |
| 9. 今日の学び（固定ルール） | 毎回守るべきこと |

---

## 1. 全体アーキテクチャ

### 1.1 登場人物

1. **本体アプリ（Next.js on Vercel）** — ユーザーが触る Web アプリ
2. **Supabase** — DB + Auth + RLS
3. **Stripe** — 決済（Checkout + Webhook）
4. **Discord Developer Portal** — OAuth アプリケーション登録
5. **Discord Bot（別サーバー、例: Render）** — ロール付与 API を提供
6. **Discord サーバー本体** — ユーザーがロールを受け取る場所

### 1.2 フロー（正常系）

```
[無料ユーザー]
   ↓ /pro にアクセス → 決済ボタン押す
   ↓
[Stripe Checkout] ← 買い切り価格 ¥X,XXX
   ↓ 決済完了
   ↓ Stripe が webhook を叩く
[/api/webhook/stripe]
   ├── profiles.is_pro = true に更新
   └── discord_id があれば Bot API に POST → ロール付与
   ↓ ユーザーは /pro?success=true に戻る
[/pro（VIP ROOM）]
   ↓ 「Discord で連携する」ボタン（既に連携済みでなければ）
   ↓
[/api/discord-oauth/start]
   ↓ state cookie 発行 → Discord 認可画面へ
   ↓
[Discord.com OAuth 認可]
   ↓ ユーザーが「認証」を押す
   ↓
[/api/discord-oauth/callback]
   ├── state 検証
   ├── code → access_token 交換
   ├── access_token → Discord user id 取得
   ├── profiles.discord_id を更新
   └── is_pro = true なら Bot API に POST → ロール付与
   ↓
[/pro?discord=success]
   → VIP ROOM に「✓ 連携済み」表示
   → Discord サーバーでカテゴリが見える
```

### 1.3 2つの経路の両立

ロール付与のトリガーは **2箇所** にあり、どちらの順番でも動くように設計する。

| 先に起きること | 後から起きること | ロール付与のタイミング |
|---------------|----------------|---------------------|
| Discord 連携 | Stripe 決済 | Webhook 内で discord_id が既にあるのでその場で付与 |
| Stripe 決済 | Discord 連携 | OAuth callback 内で is_pro = true なのでその場で付与 |

両エンドポイントに同じロール付与ヘルパーを呼ばせる。

---

## 2. 前提条件

着手前に以下が揃っていること。足りなければ先にこっちを整える。

- [ ] Next.js 15 (App Router) + TypeScript のプロジェクトが動いている
- [ ] Supabase プロジェクトが作成され、`profiles` テーブルがある（または作る）
  - 最低カラム: `id (uuid, PK, auth.users 参照)`, `is_pro (boolean, default false)`
- [ ] Supabase Auth（メール/パスワードまたは OAuth）でログイン導線がある
- [ ] Stripe アカウント（最初はサンドボックスで OK）
- [ ] Discord Bot が別サービスで稼働していて、以下の HTTP API を提供する
  - `POST /api/discord/grant-role`
    - Header: `Authorization: Bearer <BOT_API_SECRET>`
    - Body: `{ "discord_id": "123...", "role": "SomeRole" }`
    - 成功時 200 を返す
  - Bot に該当ロール名（例: `TGR-Pro`）が事前に作成されている
- [ ] Discord サーバーの Member Intent が Bot に許可されている
- [ ] 本体アプリと Discord Bot で **共通の `BOT_API_SECRET`** を持っている

**Bot がまだ無い場合**: 別スキル `discord-bot-role-granter`（未作成）か、外部で Python/Node.js Bot を立てて上記 API を実装する。本スキルの範囲外。

---

## 3. 実装順序

上から順に実行。1ステップ終わるごとに動作確認する。

### Step 1: Supabase に `discord_id` カラム追加

ファイル: `supabase/migrations/NNN_add_discord_id.sql`（連番は既存に合わせる）

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS discord_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_discord_id
ON public.profiles(discord_id)
WHERE discord_id IS NOT NULL;
```

**重要**: マイグレーションファイルを作るだけでは DB に反映されない。Supabase Dashboard → SQL Editor で **同じ SQL を実行** すること（または CLI で push）。

### Step 2: 型定義の更新

ファイル: `src/lib/supabase/client.ts`（または型定義ファイル）

`profiles` テーブルの `Row` / `Insert` / `Update` すべてに `discord_id: string | null`（Insert/Update は optional）を追加。

### Step 3: Stripe 決済ルート作成（既にあればスキップ）

ファイル: `src/app/api/checkout/route.ts`
（テンプレートは §4.1）

ポイント:
- `client_reference_id` に `user.id`（Supabase の auth user id）を必ず入れる
- `success_url` は `${origin}/pro?success=true` に設定
- `cancel_url` は `${origin}/pro` に設定

### Step 4: Stripe Webhook ルート作成

ファイル: `src/app/api/webhook/stripe/route.ts`
（テンプレートは §4.2）

ポイント:
- `runtime = "nodejs"` / `dynamic = "force-dynamic"`
- 署名検証必須
- `is_pro = true` 更新後に **共通ヘルパー** `grantDiscordRoleForUser()` を呼ぶ
- Discord ロール付与の失敗は決済成功を妨げない（try-catch で握りつぶし、ログだけ）

### Step 5: Discord OAuth 開始ルート

ファイル: `src/app/api/discord-oauth/start/route.ts`
（テンプレートは §4.3）

ポイント:
- `randomUUID()` で state 生成
- `httpOnly: true, sameSite: "lax", maxAge: 600` の cookie に state 保存
- `scope=identify` のみ（ロール付与は Bot 側で行うため、`guilds.join` は不要）
- `prompt=none` でログイン済みならスキップ

### Step 6: Discord OAuth コールバックルート

ファイル: `src/app/api/discord-oauth/callback/route.ts`
（テンプレートは §4.4）

ポイント:
- Next.js 15 は `await cookies()` を使う（同期ではない）
- state 一致検証
- `code` → `access_token` 交換
- `access_token` → `/api/users/@me` で Discord ID 取得
- Discord ID は `^\d{17,20}$` でバリデーション
- `profiles.discord_id` を更新
- `is_pro = true` なら `grantDiscordRole()` を呼ぶ
- エラー分類をクエリパラメータで /pro に返す（`?discord=denied|invalid|state_mismatch|...`）

### Step 7: 手動 Discord ID 保存ルート（フォールバック、任意）

ファイル: `src/app/api/discord-link/route.ts`
（テンプレートは §4.5）

OAuth ルートが本筋だが、万が一のフォールバックまたは管理用途で残しておくとよい。不要なら削除してもよい。

### Step 8: `/pro` ページ UI

ファイル: `src/app/pro/page.tsx`
（テンプレートは §4.6）

3つの状態を扱う:

- **無料ユーザー**: 3大特典 + 価格カード + 決済ボタン + 決済成功メッセージ
- **Pro ユーザー + 未連携**: ゴールドバッジ + 特典一覧 + **「Discord で連携する」OAuth ボタン** + Discord招待
- **Pro ユーザー + 連携済み**: 上記の OAuth ボタン箇所が「✓ 連携済み」に切り替わる

**必ず入れる UX 要素**:
1. OAuth ボタン押下時は即 `disabled` + スピナー + 「Discord へ接続中…」表示（連打防止）
2. ローディング中は補助テキストで「数秒かかる」ことを明示
3. コールバック後の `?discord=success|<error>` を `useEffect` で拾ってユーザーに表示

### Step 9: 環境変数追加

`.env.local` と Vercel（Production / Preview / Development 全てにチェック）に以下を追加:

| Key | 値 | 用途 |
|-----|---|------|
| `DISCORD_CLIENT_ID` | Discord Developer Portal | OAuth |
| `DISCORD_CLIENT_SECRET` | Discord Developer Portal | OAuth |
| `DISCORD_BOT_API_URL` | Bot の URL（末尾スラッシュなし） | ロール付与 |
| `DISCORD_BOT_API_SECRET` | Bot 側の `BOT_API_SECRET` と同値 | ロール付与 |
| `STRIPE_SECRET_KEY` | Stripe | 決済 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | 決済 |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | Stripe Price ID | 決済 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook | 署名検証 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Webhook で admin 操作 |

### Step 10: 外部サービスの設定

§5 を参照。

### Step 11: E2E テスト

§7 を参照。

---

## 4. ファイルテンプレート

**識別子の置き換えルール**: 以下のテンプレートで `TGR-Pro` になっている箇所は、新規プロジェクトでは各自のロール名（例: `ZZZ-Pro`）に置き換える。他にプロジェクト固有の文字列はない。

### 4.1 Stripe Checkout ルート

ファイル: `src/app/api/checkout/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const origin = url.origin;
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!;

  const session = await getStripe().checkout.sessions.create({
    mode: "payment", // 買い切り
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id, // ← webhook で必須
    customer_email: user.email ?? undefined,
    success_url: `${origin}/pro?success=true`,
    cancel_url: `${origin}/pro`,
  });

  return NextResponse.json({ url: session.url });
}
```

`src/lib/stripe/server.ts`:
```typescript
import Stripe from "stripe";
let instance: Stripe | null = null;
export function getStripe(): Stripe {
  if (!instance) {
    instance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-11-20.acacia",
    });
  }
  return instance;
}
```

### 4.2 Stripe Webhook ルート

ファイル: `src/app/api/webhook/stripe/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRO_ROLE = "TGR-Pro"; // ← プロジェクトごとに差し替え

export async function POST(request: Request) {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !whSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, whSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Webhook] Sig verify failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const email = session.customer_email ?? "";

    if (!userId) {
      return NextResponse.json({ error: "No user ID" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ is_pro: true })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (updateErr) {
      console.error("[Webhook] Update error:", updateErr.message);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    if (updated) {
      await grantDiscordRoleForUser(supabaseAdmin, userId);
    } else {
      // プロフィール未作成なら新規作成
      const { error: insertErr } = await supabaseAdmin
        .from("profiles")
        .insert({ id: userId, email, is_pro: true });
      if (insertErr) {
        console.error("[Webhook] Insert error:", insertErr.message);
        return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
      }
      await grantDiscordRoleForUser(supabaseAdmin, userId);
    }
  }

  return NextResponse.json({ received: true });
}

async function grantDiscordRoleForUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
) {
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("discord_id")
      .eq("id", userId)
      .single();

    const discordId = (data as { discord_id?: string | null } | null)?.discord_id;
    if (!discordId) return;

    const botApiUrl = process.env.DISCORD_BOT_API_URL;
    const botApiSecret = process.env.DISCORD_BOT_API_SECRET;
    if (!botApiUrl || !botApiSecret) {
      console.warn("[Webhook] Bot API not configured");
      return;
    }

    const res = await fetch(`${botApiUrl}/api/discord/grant-role`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${botApiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ discord_id: discordId, role: PRO_ROLE }),
    });

    if (!res.ok) {
      console.error("[Webhook] Bot API error:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Webhook] Discord role grant failed:", err);
  }
}
```

### 4.3 Discord OAuth 開始ルート

ファイル: `src/app/api/discord-oauth/start/route.ts`

```typescript
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/pro?discord=unauth`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    console.error("[discord-oauth/start] DISCORD_CLIENT_ID not configured");
    return NextResponse.redirect(`${origin}/pro?discord=unconfigured`);
  }

  const state = randomUUID();
  const redirectUri = `${origin}/api/discord-oauth/callback`;

  const authUrl = new URL("https://discord.com/api/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "none");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("discord_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
```

### 4.4 Discord OAuth コールバックルート

ファイル: `src/app/api/discord-oauth/callback/route.ts`

```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRO_ROLE = "TGR-Pro"; // ← プロジェクトごとに差し替え

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const discordErr = url.searchParams.get("error");

  const back = (status: string) =>
    NextResponse.redirect(`${origin}/pro?discord=${status}`);

  if (discordErr) return back("denied");
  if (!code || !state) return back("invalid");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("discord_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return back("state_mismatch");
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return back("unauth");

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[discord-oauth/callback] OAuth not configured");
    return back("unconfigured");
  }

  // code → access_token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${origin}/api/discord-oauth/callback`,
    }),
  });
  if (!tokenRes.ok) {
    console.error("[discord-oauth/callback] token exchange failed:",
      tokenRes.status, await tokenRes.text());
    return back("token_failed");
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) return back("token_failed");

  // access_token → Discord user
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) {
    console.error("[discord-oauth/callback] user fetch failed:",
      userRes.status, await userRes.text());
    return back("user_failed");
  }
  const discordUser = (await userRes.json()) as { id?: string };
  const discordId = discordUser.id;
  if (!discordId || !/^\d{17,20}$/.test(discordId)) {
    return back("invalid_id");
  }

  // profiles に保存
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ discord_id: discordId })
    .eq("id", user.id);
  if (updateErr) {
    console.error("[discord-oauth/callback] update failed:", updateErr.message);
    return back("db_failed");
  }

  // is_pro なら即ロール付与
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .single();

  if (profile?.is_pro) {
    await grantDiscordRole(discordId, PRO_ROLE);
  }

  const response = back("success");
  response.cookies.delete("discord_oauth_state");
  return response;
}

async function grantDiscordRole(discordId: string, role: string) {
  const botApiUrl = process.env.DISCORD_BOT_API_URL;
  const botApiSecret = process.env.DISCORD_BOT_API_SECRET;
  if (!botApiUrl || !botApiSecret) {
    console.warn("[discord-oauth/callback] Bot API not configured");
    return;
  }
  try {
    const res = await fetch(`${botApiUrl}/api/discord/grant-role`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${botApiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ discord_id: discordId, role }),
    });
    if (!res.ok) {
      console.error("[discord-oauth/callback] bot api error:",
        res.status, await res.text());
    }
  } catch (err) {
    console.error("[discord-oauth/callback] bot api fetch failed:", err);
  }
}
```

### 4.5 手動 Discord ID 保存ルート（フォールバック、任意）

ファイル: `src/app/api/discord-link/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRO_ROLE = "TGR-Pro"; // ← プロジェクトごとに差し替え

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { discord_id } = await request.json();
    if (!discord_id || !/^\d{17,20}$/.test(discord_id)) {
      return NextResponse.json({ error: "無効な Discord ID です" }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ discord_id })
      .eq("id", user.id);
    if (updateErr) {
      return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    if (profile?.is_pro) {
      await grantDiscordRole(discord_id, PRO_ROLE);
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
  if (!botApiUrl || !botApiSecret) return;
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
      console.error("[discord-link] bot api error:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[discord-link] bot api fetch failed:", err);
  }
}
```

### 4.6 `/pro` ページ UI（抜粋）

**必要な state と useEffect:**

```typescript
const { profile } = useAuth();
const isPro = profile?.is_pro ?? false;
const searchParams = useSearchParams();

const [checkoutLoading, setCheckoutLoading] = useState(false);
const [successMsg, setSuccessMsg] = useState(false);
const [discordMsg, setDiscordMsg] = useState<
  { type: "success" | "error"; text: string } | null
>(null);
const [discordLoading, setDiscordLoading] = useState(false);

const discordId = profile?.discord_id ?? "";
const discordLinked = Boolean(profile?.discord_id);

// 決済成功のクエリを拾う
useEffect(() => {
  if (searchParams.get("success") === "true") {
    setSuccessMsg(true);
    const t = setTimeout(() => window.location.replace("/pro"), 3000);
    return () => clearTimeout(t);
  }
}, [searchParams]);

// OAuth リダイレクト結果を拾う
useEffect(() => {
  const status = searchParams.get("discord");
  if (!status) return;
  const errorMap: Record<string, string> = {
    denied: "Discord 側でアクセスが拒否されました",
    invalid: "認証リクエストが不正です",
    state_mismatch: "認証セッションが一致しません（やり直してください）",
    unauth: "ログインが必要です",
    unconfigured: "Discord 連携が未設定です（管理者へ連絡）",
    token_failed: "Discord トークン取得に失敗しました",
    user_failed: "Discord ユーザー情報の取得に失敗しました",
    invalid_id: "取得した Discord ID が不正です",
    db_failed: "保存に失敗しました",
  };
  if (status === "success") {
    setDiscordMsg({ type: "success", text: "Discord 連携が完了しました" });
  } else if (errorMap[status]) {
    setDiscordMsg({ type: "error", text: errorMap[status] });
  }
}, [searchParams]);
```

**Stripe Checkout ボタンのハンドラ:**

```typescript
async function handleStripeCheckout() {
  setCheckoutLoading(true);
  try {
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  } finally {
    setCheckoutLoading(false);
  }
}
```

**Discord 連携 UI（Pro ユーザー向けカード）:**

```tsx
{/* 🔗 Discord 連携カード */}
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
          ボタンを押して Discord にログインするだけで連携が完了します。機種別チャンネルへのアクセスが自動で有効になります。
        </p>
        {discordMsg && (
          <p className={`font-mono text-xs ${
            discordMsg.type === "success" ? "text-green-600" : "text-red-500"
          }`}>
            {discordMsg.text}
          </p>
        )}
        <button
          onClick={() => {
            if (discordLoading) return;
            setDiscordLoading(true);
            window.location.href = "/api/discord-oauth/start";
          }}
          disabled={discordLoading}
          className="w-full py-3 rounded-lg font-mono font-bold text-sm text-white active:scale-95 transition-transform disabled:opacity-70 disabled:active:scale-100"
          style={{ backgroundColor: "#5865F2" }}
        >
          {discordLoading ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                aria-hidden="true"
              />
              Discord へ接続中…
            </span>
          ) : (
            "Discord で連携する"
          )}
        </button>
        {discordLoading && (
          <p className="font-mono text-[11px] text-gray-500 text-center leading-relaxed">
            Discord のログイン画面を読み込んでいます。数秒かかることがあります。<br />
            画面が切り替わるまでお待ちください。
          </p>
        )}
      </div>
    )}
  </div>
</div>
```

**完全版**: `templates/pro-page.tsx.txt` を参照（本スキルと同ディレクトリ）。

---

## 5. 外部サービス設定

### 5.1 Discord Developer Portal

1. https://discord.com/developers/applications → **New Application**
2. アプリ名を入力（例: `ZZZ-Resonance`）
3. **OAuth2** タブ → **Redirects** に以下を追加 → **Save Changes**
   ```
   https://<your-domain>.vercel.app/api/discord-oauth/callback
   ```
   （開発時は `http://localhost:3000/api/discord-oauth/callback` も追加可）
4. **Client ID** をコピー → `DISCORD_CLIENT_ID` として登録
5. **Client Secret** の「Copy」ボタンを押す
   - **注意**: **IMEを英数モードに切り替えてから** 貼り付けること。日本語が混ざると動かない（実例: 先頭に「こ」が混入してエラーになった事件あり）
   - シークレットは初回表示後、再表示できない場合がある。ミスしたら迷わず「Reset Secret」
6. Client Secret を `DISCORD_CLIENT_SECRET` として登録

### 5.2 Discord サーバー側の準備

1. Bot を該当サーバーに招待済みであること
2. サーバーに `TGR-Pro`（または対応するロール名）を作成
3. Bot のロールを `TGR-Pro` より **上** に配置（下だと付与不可）
4. 対象カテゴリ/チャンネルの「ロール/メンバー」設定で `TGR-Pro` に閲覧権限を付与
5. デフォルト（@everyone）ではそれらのチャンネルは非表示にする

### 5.3 Stripe（サンドボックス → 本番）

**サンドボックス:**
1. 商品カタログ → 商品を追加 → 価格を設定（例: ¥1,500、一回限り）
2. Price ID をコピー → `NEXT_PUBLIC_STRIPE_PRICE_ID` として登録（テスト用）
3. 開発者 → Webhook → エンドポイント追加
   - URL: `https://<your-domain>.vercel.app/api/webhook/stripe`
   - イベント: `checkout.session.completed`
   - Webhook シークレットをコピー → `STRIPE_WEBHOOK_SECRET`
4. API キー（`sk_test_...`, `pk_test_...`）を取得 → 環境変数に登録

**本番切り替え時（サンドボックス E2E 成功後）:**
1. Stripe Dashboard を「本番モード」に切り替え
2. **本番モードで** 商品を再作成（価格も再入力）
3. **本番モードで** Webhook を再登録（URL は同じ）
4. 本番キー（`sk_live_...`, `pk_live_...`）と本番 Price ID / Webhook Secret を Vercel 環境変数に **上書き**
5. Vercel を Redeploy（環境変数の変更は自動反映されないので **必須**）
6. アプリ内のハードコードされた価格表示（例: `¥993`）があれば本番価格に更新

### 5.4 Vercel 環境変数

- Settings → Environment Variables
- **Production / Preview / Development の3つ全部にチェック**（デフォルトで Development だけになる場合がある）
- 機密値は「Sensitive」にチェック（鍵マークが付く ＝ 正常）
- 環境変数を **追加・変更した後は Redeploy 必須**（Deployments → 最新 → ⋯ → Redeploy）

### 5.5 Supabase

- SQL Editor で §3 Step 1 のマイグレーションを実行
- RLS: `profiles` テーブルの `discord_id` 更新は本人のみ許可されていること
  - マイグレーション `002_create_profiles.sql` 相当の既存 RLS ポリシーでカバーされているか確認
- Service Role Key は Webhook でのみ使用（他のクライアント経路からは使わない）

---

## 6. 環境変数一覧（最終形）

### `.env.local.example` に書くべき項目

```env
# ===== Supabase =====
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ===== Stripe =====
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=

# ===== Discord Bot（ロール付与API） =====
DISCORD_BOT_API_URL=https://<bot-host>
DISCORD_BOT_API_SECRET=

# ===== Discord OAuth（ユーザー連携） =====
# Developer Portal → OAuth2 から取得
# Redirects に https://<your-domain>/api/discord-oauth/callback を登録
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

---

## 7. E2E テスト手順

### 7.1 サンドボックスでの基本フロー確認

1. テスト用 Supabase アカウントでアプリにログイン
2. `/pro` にアクセス → 無料ユーザー画面が表示される
3. Stripe テストカード `4242 4242 4242 4242` / 任意の未来日 / 任意の CVC で決済
4. `/pro?success=true` に戻る → 「決済が完了しました！」表示 → 3秒後リロード
5. VIP ROOM 画面に切り替わり、Discord 連携カードに「Discord で連携する」ボタン表示
6. ボタンを押す → 即スピナー＋「Discord へ接続中…」表示（連打防止）
7. Discord 認可画面で「認証」
8. `/pro?discord=success` に戻る → 「Discord 連携が完了しました」＋「✓ 連携済み」
9. Discord サーバーで該当ユーザーに `TGR-Pro` ロールが付与されている
10. 該当ユーザーに専用カテゴリ/チャンネルが見える

### 7.2 逆順フロー（Discord 連携先 → 決済）

※ 現在の UI は Pro ユーザーのみに Discord 連携を見せる設計なので、このパターンは管理ツール等で discord_id を先に入れるケース限定。

1. Supabase SQL で discord_id を先に入れる
   ```sql
   UPDATE profiles SET discord_id = 'XXX' WHERE id = 'YYY';
   ```
2. 無料ユーザーのまま /pro で決済
3. Webhook 経由で is_pro = true + 自動ロール付与
4. ロールが付与されていることを確認

### 7.3 テスト用リセット SQL

連続テスト時に状態を戻す:

```sql
-- Discord ID を外す
UPDATE profiles SET discord_id = NULL WHERE id = 'USER_UUID';

-- Pro を外す
UPDATE profiles SET is_pro = false WHERE id = 'USER_UUID';

-- 両方同時に
UPDATE profiles SET discord_id = NULL, is_pro = false WHERE id = 'USER_UUID';
```

Discord 側のロール剥奪は手動で実施（サーバー → メンバー一覧 → 該当ユーザー → ロール解除）。

---

## 8. トラブルシュート

### 症状と原因

| 症状 | 原因・対処 |
|------|-----------|
| OAuth ボタン → `?discord=unconfigured` | `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` が未設定、または Production/Preview にチェックが入っていない → Vercel で追加して Redeploy |
| `?discord=state_mismatch` | cookie が別ドメインで発行されたか期限切れ。ブラウザを再読み込みして再試行。`sameSite: "lax"` と同一ドメインであることを確認 |
| `?discord=token_failed` | Redirect URI が Developer Portal に登録されていないケースが多い。Portal → OAuth2 → Redirects を確認 |
| `?discord=invalid_id` | Discord 側から返ってきた ID が 17〜20桁の数字ではない。通常は起こらない |
| Webhook が `is_pro = true` 更新したがロールが付かない | Bot API URL 末尾に `/` が入っている / BOT_API_SECRET 不一致 / Bot のロール階層が対象ロールより下 |
| OAuth ボタン押下から Discord 画面までタイムラグが長くユーザーが連打 | §4.6 のスピナー UI が入っていない。必ず入れる |
| Client Secret に日本語が混入 | IME を英数に切り替えてコピペし直す。ダメなら Developer Portal で Reset Secret |
| 決済成功後に Pro 反映されない | Webhook が Vercel に届いていない可能性。Stripe ダッシュボード → Developers → Webhooks → 該当エンドポイント → イベントログで 200 が返っているか確認 |
| Client Reference ID が null と webhook ログに出る | Checkout Session 作成時の `client_reference_id` に `user.id` を入れ忘れている |

### デバッグの起点

- Vercel: `https://vercel.com/<org>/<project>/logs` → Functions タブ → 該当エンドポイントを選択
- Supabase: Dashboard → SQL Editor で `profiles` の該当行を直接確認
- Discord Bot: 別サービス側のログ（例: Render Dashboard → Logs）でロール付与 API が 200 を返しているか

---

## 9. 今日の学び（固定ルール）

このパターンを再利用する時に **必ず守る** こと。逸脱すると今日踏んだ地雷を再踏する。

### 9.1 UX 必須要素

- **OAuth ボタン押下 → Discord 画面表示まで数秒のタイムラグがある**。必ず `disabled` + スピナー + 「接続中…」+ 補助テキストを入れる。連打によるエラーを防ぐ。
- 成功/エラーは `?discord=<status>` クエリで受け渡す。UI 側で `useEffect` で拾って日本語メッセージ化する。
- Pro ユーザー画面では連携済み/未連携で完全にカードを入れ替える（`✓ 連携済み` vs 「Discord で連携する」ボタン）。

### 9.2 セキュリティ必須要素

- OAuth state は `httpOnly` cookie で発行・検証。クエリだけでは不十分。
- Discord ID は必ず `^\d{17,20}$` でバリデーション（取得後も）。
- `profiles.discord_id` の更新はログイン中ユーザーの行だけ（RLS または `.eq("id", user.id)`）。
- Webhook は署名検証必須（`STRIPE_WEBHOOK_SECRET`）。
- Service Role Key は Webhook と Admin API のみ。他では anon key を使う。

### 9.3 実装順序の鉄則

- Supabase カラム追加 → **Dashboard でも実行** を忘れない（マイグレーションファイルだけでは反映されない）。
- 型定義（`profiles.Row/Insert/Update`）を先に更新してから API/UI を書く。型エラーで詰まらない。
- Vercel 環境変数追加 → **Redeploy 必須**（自動反映されない）。
- 本番切り替え時は商品・Webhook・API キーを **本番モード** で再作成。サンドボックスのものは本番では使えない。

### 9.4 外部サービスの罠

- Discord Developer Portal の Client Secret は **IME 日本語モードのまま貼り付けると先頭に日本語が混入** することがある。半角英字に切り替えてからコピペ。
- Vercel で環境変数を追加する時、デフォルトで Development のみにチェックが入ることがある。**Production / Preview / Development の3つ全部にチェック**。
- Bot のロール階層は付与対象ロールより上に置く（Discord の仕様）。
- Bot API URL の末尾にスラッシュを付けない。

### 9.5 開発・テストの進め方

- サンドボックスで E2E を全ケース通してから Stripe 本番切り替え。
- テストアカウントは **必ずサーバー管理者以外** を使う（管理者はロール付与の検証にならない）。
- テスト用 Discord アカウントのメールと、アプリ側のログインメールは一致させる必要はない。
- 連続テスト時は SQL リセット + Discord 手動ロール剥奪。

---

## 10. 新規プロジェクトでこのスキルを呼び出す方法

1. 本スキルの `SKILL.md` と `templates/` 一式を新規プロジェクトの `.claude/skills/stripe-discord-pro-upgrade/` にコピー
2. プロジェクトの `CLAUDE.md` に以下を追記:

```markdown
## Pro化 + Discord連携の実装
Stripe決済 → Pro化 → Discord OAuth → ロール付与の固定フロー。
参照: `.claude/skills/stripe-discord-pro-upgrade/SKILL.md`
```

3. Claude Code に「Stripe Pro化と Discord OAuth 連携を実装して」と指示
4. Claude はこのスキルを読み、§3 の実装順序に従って作業する
5. プロジェクト固有の置換点（ロール名 `TGR-Pro`、ドメイン、価格）を指示する

---

## 11. 変更履歴

- 2026-04-22: TGR Resonance での E2E 検証成功後に初版作成
  - 当初は手動 Discord ID 入力 UI だったが UX が破綻 → OAuth に切替
  - OAuth ボタンのローディング UI 不在による二重タップ問題を発見 → スピナー追加
  - Client Secret に日本語混入する地雷を踏んだ → 注意書き追加

---

## 付録: Discord Bot 側に期待する API 契約

本スキルは Bot 側で以下が実装されている前提。Bot を自作する場合の仕様:

**エンドポイント**: `POST /api/discord/grant-role`

**リクエスト:**
```
Headers:
  Authorization: Bearer <BOT_API_SECRET>
  Content-Type: application/json

Body:
  {
    "discord_id": "123456789012345678",
    "role": "TGR-Pro"
  }
```

**レスポンス:**
- 成功: `200 OK` / `{"success": true}`
- 認証失敗: `401 Unauthorized`
- ロール名不存在: `404 Not Found`
- Bot 権限不足: `403 Forbidden`
- その他: `500 Internal Server Error` + エラーメッセージ

**Bot 側の実装要点（参考）:**
- `discord.py` や `discord.js` で該当ユーザーに role を add
- Member Intent が必要
- ロール階層: Bot のロールが付与対象ロールより上にある必要がある
- ユーザーがサーバーに入っていない場合は `404 not a member` などを返す

**ロール剥奪 API（任意）**: `POST /api/discord/revoke-role` を同じ契約で用意しておくと、返金処理や管理操作で役立つ。
