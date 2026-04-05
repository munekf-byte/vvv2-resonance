"use client";
import { useAuth } from "./AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "#f5f0e8" }}>
        <div className="text-center">
          <span className="font-mono font-black text-red-400 text-2xl tracking-wider">TGR</span>
          <p className="font-mono text-gray-500 text-xs mt-2">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginOverlay />;
  }

  return <>{children}</>;
}

function LoginOverlay() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      console.error("[Login]", error.message);
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
      style={{ backgroundColor: "#f5f0e8" }}>
      <div className="w-full max-w-sm text-center space-y-6">
        {/* ロゴ */}
        <div>
          <span className="font-mono font-black text-red-500 text-3xl tracking-wider">TGR</span>
          <p className="font-mono text-gray-600 text-sm tracking-widest mt-1">RESONANCE</p>
          <p className="font-mono text-gray-400 text-xs mt-0.5">東京喰種 データ分析システム</p>
        </div>

        {/* 説明 */}
        <div className="bg-white/80 rounded-xl px-5 py-4 border border-gray-200 shadow-sm">
          <p className="text-gray-700 font-mono text-sm leading-relaxed">
            ご利用にはGoogleアカウントでのログインが必要です。
          </p>
          <p className="text-gray-400 font-mono text-xs mt-2">
            データはクラウドに安全に保存されます。
          </p>
        </div>

        {/* Google ログインボタン */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-medium text-sm rounded-lg border border-gray-300 px-4 py-3.5 transition-all shadow-sm hover:shadow-md disabled:opacity-60"
        >
          {isLoading ? (
            <span className="font-mono">認証中...</span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Googleでログイン</span>
            </>
          )}
        </button>

        <p className="text-gray-300 font-mono text-[10px]">© TGR RESONANCE</p>
      </div>
    </div>
  );
}
