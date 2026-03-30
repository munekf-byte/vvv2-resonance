// =============================================================================
// VALVRAVE-RESONANCE: ダッシュボード [GHOST-BUSTERS MODE]
// 認証・リダイレクト完全排除 — GUEST_PROFILEで必ず描画する
// =============================================================================

import { SignOutButton } from "./SignOutButton";
import { NewSessionButton } from "./NewSessionButton";
import type { ProfileRow } from "@/lib/supabase/client";

// ゲストプロフィール (認証バイパス用)
const GUEST_PROFILE: ProfileRow = {
  id: "guest-user",
  email: "guest@example.com",
  display_name: "ゲスト",
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface DashboardViewProps {
  profile: ProfileRow;
}

function DashboardView({ profile }: DashboardViewProps) {
  const displayName = profile.display_name ?? profile.email;
  const avatarUrl = profile.avatar_url;

  return (
    <div className="min-h-screen bg-v2-black flex flex-col">
      {/* ===== ヘッダー ===== */}
      <header className="sticky top-0 z-40 bg-v2-black border-b border-v2-border safe-area-top">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-v2-red text-lg tracking-wider">V2</span>
            <span className="font-mono text-v2-text-muted text-xs tracking-widest">RESONANCE</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-7 h-7 rounded-full border border-v2-border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-v2-purple-muted border border-v2-border flex items-center justify-center">
                  <span className="text-v2-purple-100 text-xs font-mono font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-v2-text-secondary text-sm font-mono hidden sm:block">
                {displayName}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* ===== メインコンテンツ ===== */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-mono font-bold text-v2-text-primary">実戦セッション</h1>
          <p className="text-v2-text-muted text-xs font-mono mt-1">SESSION LIST</p>
        </div>

        <div className="v2-card p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-v2-black-50 border border-v2-border flex items-center justify-center">
            <span className="text-v2-text-muted text-xl">📋</span>
          </div>
          <p className="text-v2-text-secondary text-sm">実戦セッションがまだありません</p>
          <p className="text-v2-text-muted text-xs">「新規セッション開始」で記録を始めましょう</p>
        </div>

        <div className="mt-6">
          <NewSessionButton userId={profile.id} />
        </div>
      </main>
    </div>
  );
}

// どんな状況でも DashboardView(GUEST_PROFILE) を返すだけ
export default function DashboardPage() {
  return <DashboardView profile={GUEST_PROFILE} />;
}
