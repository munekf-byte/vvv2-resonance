"use client";
// =============================================================================
// VALVRAVE-RESONANCE: Pro プラン案内 / VIPルーム
// 無課金 → 課金誘導 / Pro → Discordコミュニティ案内
// =============================================================================

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { Suspense } from "react";
import { LINK_X, LINK_DISCORD } from "@/lib/config/links";

export default function ProPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}><p className="font-mono text-gray-500">読み込み中...</p></div>}>
      <ProPageInner />
    </Suspense>
  );
}

function ProPageInner() {
  const { profile } = useAuth();
  const isPro = profile?.is_pro ?? false;
  const searchParams = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [discordMsg, setDiscordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [discordLoading, setDiscordLoading] = useState(false);

  const discordId = profile?.discord_id ?? "";
  const discordLinked = Boolean(profile?.discord_id);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessMsg(true);
      // 数秒後にリロードしてPro状態を反映
      const timer = setTimeout(() => window.location.replace("/pro"), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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

  async function handleStripeCheckout() {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "決済画面の起動に失敗しました");
      }
      window.location.href = data.url;
    } catch (err) {
      setCheckoutLoading(false);
      alert(err instanceof Error ? err.message : "決済画面の起動に失敗しました");
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>

      {/* ヘッダー */}
      <header style={{ backgroundColor: "#1f2937", borderBottom: "3px solid #92400e" }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/dashboard" className="text-gray-300 hover:text-white text-sm font-mono">← ダッシュボード</a>
          <span className="text-sm font-mono font-bold" style={{ color: "#fef3c7" }}>
            {isPro ? "VIP ROOM" : "Pro Plan"}
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">

        {isPro ? (
          /* ===== パターンB: Proユーザー向け VIPルーム ===== */
          <div className="space-y-6">

            {/* ゴールドバッジ */}
            <div className="text-center">
              <div
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-mono font-black text-lg"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
                  color: "#ffffff",
                  boxShadow: "0 0 20px rgba(245, 158, 11, 0.4)",
                }}
              >
                👑 Pro プラン有効
              </div>
              <p className="text-gray-500 font-mono text-xs mt-3">
                全機能がアンロックされています
              </p>
            </div>

            {/* 特典一覧 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3" style={{ backgroundColor: "#292524" }}>
                <p className="text-sm font-mono font-bold" style={{ color: "#fef3c7" }}>ご利用中の特典</p>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { icon: "📊", title: "稼働ログ無制限", desc: "セッション数の制限なし" },
                  { icon: "📈", title: "トータル数値分析", desc: "全セッション横断の統計分析" },
                  { icon: "💬", title: "専用Discordコミュニティ", desc: "メンバー限定の情報交換" },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="font-mono font-bold text-sm text-gray-900">{item.title}</p>
                      <p className="font-mono text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <span className="ml-auto text-green-600 font-mono font-bold text-xs">有効</span>
                  </div>
                ))}
              </div>
            </div>

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
                      ボタンを押して Discord にログインするだけで連携が完了します。機種別チャンネルへのアクセスが自動で有効になります。
                    </p>
                    {discordMsg && (
                      <p
                        className={`font-mono text-xs ${
                          discordMsg.type === "success" ? "text-green-600" : "text-red-500"
                        }`}
                      >
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

            {/* Discord招待 */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "2px solid #5865F2" }}
            >
              <div className="px-5 py-4 text-center" style={{ backgroundColor: "#5865F2" }}>
                <p className="text-white font-mono font-bold text-base">専用Discordコミュニティ</p>
                <p className="text-indigo-200 font-mono text-xs mt-1">
                  攻略情報・設定判別の議論・稼働報告をメンバーと共有
                </p>
              </div>
              <div className="bg-white px-5 py-5 text-center">
                <button
                  onClick={() => alert("現在パイロット版で準備中です")}
                  className="px-8 py-3 rounded-lg font-mono font-bold text-sm text-white active:scale-95 transition-transform"
                  style={{ backgroundColor: "#5865F2" }}
                >
                  Discordに参加する →
                </button>
                <p className="text-gray-400 font-mono text-[10px] mt-3">
                  現在準備中です
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ===== パターンA: 無課金ユーザー向け ===== */
          <div className="space-y-6">

            {/* ヒーローセクション */}
            <div className="text-center py-4">
              <p className="text-3xl mb-2">👑</p>
              <h1 className="font-mono font-black text-xl text-gray-900">Pro プラン</h1>
              <p className="font-mono text-gray-500 text-sm mt-1">
                本気で設定を追うあなたへ
              </p>
            </div>

            {/* 3大特典カード */}
            <div className="space-y-3">
              {[
                {
                  icon: "📊",
                  title: "稼働ログ無制限",
                  desc: "無料版は3件まで。Proなら何件でも記録・保存できます。過去の稼働を全て残し、長期的な設定判別に活用。",
                  color: "#2563eb",
                },
                {
                  icon: "📈",
                  title: "トータル数値分析",
                  desc: "全セッションを横断した合算集計。CZ確率・AT確率・ゾーン分布を長期データで分析し、設定の傾向を可視化。",
                  color: "#7c3aed",
                },
                {
                  icon: "💬",
                  title: "専用Discordコミュニティ",
                  desc: "Proメンバー限定の情報交換コミュニティ。攻略情報の共有、設定判別の議論、稼働報告をリアルタイムで。",
                  color: "#5865F2",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-white rounded-xl overflow-hidden"
                  style={{ border: `2px solid ${item.color}20` }}
                >
                  <div className="flex items-start gap-3 px-4 py-4">
                    <span className="text-2xl mt-0.5">{item.icon}</span>
                    <div>
                      <p className="font-mono font-bold text-sm" style={{ color: item.color }}>{item.title}</p>
                      <p className="font-mono text-xs text-gray-600 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 価格カード */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #1f2937 0%, #292524 100%)",
                border: "2px solid #f59e0b",
              }}
            >
              <div className="px-6 py-6 text-center">
                <p className="font-mono text-gray-400 text-xs">買い切り価格</p>
                <p className="font-mono font-black text-4xl mt-1" style={{ color: "#fef3c7" }}>
                  ¥1,500
                </p>
                <p className="font-mono text-gray-500 text-xs mt-1">（税込・月額ではありません）</p>

                {/* Stripe 決済ボタン */}
                <button
                  onClick={handleStripeCheckout}
                  disabled={checkoutLoading}
                  className="w-full mt-5 py-4 rounded-lg font-mono font-bold text-base active:scale-95 transition-transform disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #635bff 0%, #7c3aed 100%)",
                    color: "#ffffff",
                  }}
                >
                  {checkoutLoading ? "決済画面を準備中..." : "クレジットカードで購入（1,500円）"}
                </button>

                {/* PayPay 手動決済 */}
                <div className="mt-4 bg-white/10 rounded-lg px-4 py-3">
                  <p className="font-mono text-xs font-bold" style={{ color: "#fef3c7" }}>
                    PayPay での手動決済も受付中
                  </p>
                  <p className="font-mono text-[10px] text-gray-400 mt-1 leading-relaxed">
                    送金完了後、X のDMでユーザー名をお知らせください
                  </p>
                </div>

                <a
                  href={LINK_X}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-8 py-2.5 rounded-lg font-mono font-bold text-xs active:scale-95 transition-transform"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "#ffffff",
                  }}
                >
                  お問い合わせ（X / Twitter）
                </a>
              </div>
            </div>

            {/* 成功メッセージ */}
            {successMsg && (
              <div className="bg-green-50 border-2 border-green-500 rounded-xl px-5 py-4 text-center">
                <p className="font-mono font-bold text-green-700 text-sm">決済が完了しました！</p>
                <p className="font-mono text-green-600 text-xs mt-1">権限が反映されるまで数秒お待ちください...</p>
              </div>
            )}

            {/* 補足 */}
            <p className="text-center text-gray-400 font-mono text-[10px] leading-relaxed">
              ※ クレジットカード決済は Stripe を利用<br />
              ※ 一度の購入で永久利用可能です
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
