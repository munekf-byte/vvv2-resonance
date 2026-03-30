"use client";
// =============================================================================
// VALVRAVE-RESONANCE: ログイン画面 (完全静止版)
// 自動リダイレクト一切なし。ログイン成功後は手動ボタンのみ。
// =============================================================================

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleLoginButton } from "./GoogleLoginButton";
import Link from "next/link";

function LoginContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  // ===== ログイン成功状態 =====
  if (success === "true") {
    return (
      <>
        {/* エンブレム */}
        <div className="w-full max-w-sm flex flex-col items-center gap-4 mb-8">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-v2-green opacity-60" />
            <div className="absolute inset-2 rounded-full border border-v2-green opacity-40" />
            <span className="text-v2-green font-mono font-black text-3xl select-none">✓</span>
          </div>
          <div className="text-center">
            <h1 className="font-mono font-black text-2xl tracking-widest text-v2-green">
              ログイン成功
            </h1>
            <p className="text-v2-text-muted text-xs mt-2 font-mono">
              認証が完了しました
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="v2-card p-6 flex flex-col gap-4">
            <p className="text-v2-text-secondary text-sm text-center font-mono">
              ダッシュボードに移動してください
            </p>
            <Link
              href="/dashboard"
              className="
                w-full flex items-center justify-center gap-2
                bg-v2-purple hover:bg-v2-purple-200 active:bg-v2-purple-400
                text-white font-mono font-black text-lg
                rounded-xl py-4
                transition-all duration-150 active:scale-95
                shadow-lg shadow-v2-purple-muted/50
              "
            >
              ダッシュボードへ →
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ===== 通常ログイン状態 =====
  return (
    <>
      {/* ロゴ・タイトルブロック */}
      <div className="w-full max-w-sm flex flex-col items-center gap-6 mb-10">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-v2-red opacity-60 animate-pulse" />
          <div className="absolute inset-2 rounded-full border border-v2-purple opacity-40" />
          <span className="text-v2-red font-mono font-black text-3xl select-none">V2</span>
        </div>

        <div className="text-center">
          <h1 className="font-mono font-black text-2xl tracking-widest text-v2-text-primary">
            VALVRAVE
          </h1>
          <p className="font-mono text-sm tracking-[0.3em] text-v2-purple-100 mt-0.5">
            RESONANCE
          </p>
          <p className="text-v2-text-muted text-xs mt-3 tracking-wide">
            実戦データ精密解析システム
          </p>
        </div>
      </div>

      {/* ログインカード */}
      <div className="w-full max-w-sm">
        <div className="v2-card p-6 flex flex-col gap-5">
          {/* エラー表示 */}
          {error && (
            <div className="bg-v2-red-bg border border-v2-red-muted rounded-md px-4 py-3">
              <p className="text-v2-red-50 text-sm font-mono">
                {error === "no_code" && "認証コードが取得できませんでした。"}
                {error === "auth_failed" && "認証に失敗しました。再度お試しください。"}
                {error !== "no_code" && error !== "auth_failed" && "エラーが発生しました。"}
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-v2-text-secondary text-sm leading-relaxed">
              Googleアカウントでログインして
              <br />
              実戦データの記録を開始する
            </p>
          </div>

          <GoogleLoginButton />

          <div className="border-t border-v2-border pt-4">
            <p className="text-v2-text-muted text-xs text-center leading-relaxed">
              ログインすることで利用規約および
              <br />
              プライバシーポリシーに同意したものとみなします
            </p>
          </div>
        </div>

        <p className="text-center text-v2-text-muted text-xs font-mono mt-4 opacity-40">
          Ver 0.1.0 — VALVRAVE-RESONANCE
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-v2-black flex flex-col items-center justify-center p-4">
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(102,0,170,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(204,0,0,0.10) 0%, transparent 70%)",
        }}
      />
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-v2-purple border-t-transparent animate-spin" />
            <p className="text-v2-text-muted text-xs font-mono">読み込み中...</p>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </main>
  );
}
