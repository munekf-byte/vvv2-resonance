"use client";
// =============================================================================
// /pro/activate — アクティベーションキー発行ページ（公開・ログイン不要）
//   note / BOOTH 有料コンテンツの裏に URL を貼って配布する。
//   サイトのナビ・フッター・サイトマップには含めない秘密ページ。
// =============================================================================

import { useState } from "react";

export default function ActivatePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [reused, setReused] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (loading) return;
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("メールアドレスを正しく入力してください。");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/activation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json()) as { ok: boolean; key?: string; existing?: boolean; error?: string };
      if (!res.ok || !data.ok || !data.key) {
        setError(data.error || `エラー (${res.status})`);
        return;
      }
      setIssuedKey(data.key);
      setReused(Boolean(data.existing));
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信エラー");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!issuedKey) return;
    try {
      await navigator.clipboard.writeText(issuedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("コピーに失敗しました。手動でコピーしてください。");
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>
      {/* ヘッダー */}
      <header style={{ backgroundColor: "#1f2937", borderBottom: "3px solid #92400e" }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
          <span className="text-sm font-mono font-bold" style={{ color: "#fef3c7" }}>
            アクティベーションキー
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="space-y-6">

          {!issuedKey ? (
            /* ── 初期状態: メール入力 ── */
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #1f2937 0%, #292524 100%)",
                border: "2px solid #f59e0b",
              }}
            >
              <div className="px-6 py-6">
                <p
                  className="text-center font-mono font-black text-lg"
                  style={{ color: "#fef3c7" }}
                >
                  🔑 Proプラン アクティベーション
                </p>
                <p className="text-center font-mono text-xs text-gray-400 mt-2 leading-relaxed">
                  アプリに登録しているメールアドレスを<br />
                  入力してください。
                </p>

                <div className="mt-6">
                  <label className="block font-mono font-bold text-[11px] text-gray-300 mb-2">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full px-3 py-3 rounded font-mono text-sm bg-white text-gray-900"
                    style={{ border: "2px solid #d97706" }}
                  />
                  {error && (
                    <p className="font-mono text-[11px] text-red-300 mt-2">{error}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full mt-5 py-4 rounded-lg font-mono font-bold text-base active:scale-95 transition-transform disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "#ffffff",
                    boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
                  }}
                >
                  {loading ? "生成中…" : "アクティベーションキーを生成 →"}
                </button>

                <p className="font-mono text-[10px] text-gray-500 mt-4 leading-relaxed text-center">
                  ※ 同じメールアドレスで既にキー発行済みの場合、<br />
                  既存のキーが再表示されます。
                </p>
              </div>
            </div>
          ) : (
            /* ── キー生成後 ── */
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #1f2937 0%, #292524 100%)",
                border: "2px solid #16a34a",
              }}
            >
              <div className="px-6 py-6">
                <p
                  className="text-center font-mono font-black text-lg"
                  style={{ color: "#dcfce7" }}
                >
                  ✅ キーが生成されました
                </p>
                {reused && (
                  <p className="text-center font-mono text-[11px] text-gray-400 mt-2">
                    既に発行済みのキーを再表示しています
                  </p>
                )}

                {/* キー表示 + コピー */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full mt-5 rounded-lg px-4 py-4 text-left active:scale-[0.98] transition-transform"
                  style={{
                    backgroundColor: copied ? "#dcfce7" : "#ffffff",
                    border: copied ? "2px dashed #16a34a" : "2px dashed #d97706",
                  }}
                >
                  <p className="font-mono text-[10px] text-gray-600 mb-1">アクティベーションキー</p>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="font-mono font-black text-base sm:text-lg tracking-wider break-all"
                      style={{ color: copied ? "#15803d" : "#1f2937" }}
                    >
                      {issuedKey}
                    </p>
                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded font-mono font-bold text-[10px] flex-shrink-0"
                      style={{
                        backgroundColor: copied ? "#16a34a" : "#d97706",
                        color: "#ffffff",
                      }}
                    >
                      {copied ? <>✓ コピー完了</> : <>📋 コピー</>}
                    </span>
                  </div>
                </button>

                {/* 次のステップ */}
                <div className="mt-6">
                  <p className="font-mono font-bold text-[12px] mb-2" style={{ color: "#fef3c7" }}>
                    次のステップ
                  </p>
                  <ol className="space-y-2">
                    {[
                      "アプリにログイン",
                      "「Pro 詳細」ページ（/pro）を開く",
                      "上記キーを貼り付けて送信",
                    ].map((t, i) => (
                      <li key={t} className="flex items-start gap-2">
                        <span
                          className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full font-mono font-bold text-[10px] text-white mt-0.5"
                          style={{ backgroundColor: "#d97706" }}
                        >
                          {i + 1}
                        </span>
                        <span className="font-mono text-[12px] text-gray-300 leading-relaxed">
                          {t}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <a
                  href="/pro"
                  className="block w-full mt-6 py-4 rounded-lg font-mono font-black text-sm active:scale-95 transition-transform text-center"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "#ffffff",
                    boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
                  }}
                >
                  アプリを開く →
                </a>
                <p className="font-mono text-[10px] text-gray-500 mt-3 text-center break-all">
                  https://vvv2-resonance.vercel.app/pro
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-gray-400 font-mono text-[10px] leading-relaxed">
            ※ キーは購入されたメールアドレス専用です<br />
            ※ 他のメールアドレスのアカウントでは使用できません
          </p>
        </div>
      </main>
    </div>
  );
}
