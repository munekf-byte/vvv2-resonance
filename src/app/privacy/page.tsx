import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b border-gray-200/60 backdrop-blur-sm" style={{ backgroundColor: "rgba(245,240,232,0.92)" }}>
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/dashboard" className="font-mono text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← 戻る
          </Link>
          <span className="font-mono font-black text-red-400 text-sm tracking-wider">TGR</span>
        </div>
      </header>

      {/* 本文 */}
      <main className="max-w-2xl mx-auto px-5 py-10">
        <div className="bg-white/90 rounded-2xl border border-gray-200/60 shadow-sm px-6 py-8 sm:px-10 sm:py-12">
          {/* タイトル */}
          <h1 className="font-sans font-bold text-xl sm:text-2xl text-gray-900 tracking-tight">
            プライバシーポリシー
          </h1>
          <p className="font-mono text-xs text-gray-400 mt-2">
            L東京喰種 RESONANCE
          </p>

          <hr className="my-8 border-gray-200" />

          {/* 1. 収集する個人情報 */}
          <section className="mb-10">
            <h2 className="font-sans font-bold text-base sm:text-lg text-gray-800 mb-3">
              1. 収集する個人情報
            </h2>
            <p className="text-sm sm:text-[15px] text-gray-700 leading-[1.9]">
              本サービスは、ユーザー認証のためにGoogleアカウントの「メールアドレス」および「ユーザー識別ID」を取得・保存します。
            </p>
          </section>

          {/* 2. 利用目的 */}
          <section className="mb-10">
            <h2 className="font-sans font-bold text-base sm:text-lg text-gray-800 mb-3">
              2. 利用目的
            </h2>
            <p className="text-sm sm:text-[15px] text-gray-700 leading-[1.9]">
              取得したメールアドレスは、本サービスにおける「アカウントの同一性確認（データ復元）」および「Proプラン購入時の権限付与（手動照合）」のみに使用し、その他の目的には一切使用いたしません。
            </p>
          </section>

          {/* 3. 第三者提供の禁止 */}
          <section className="mb-10">
            <h2 className="font-sans font-bold text-base sm:text-lg text-gray-800 mb-3">
              3. 第三者提供の禁止
            </h2>
            <p className="text-sm sm:text-[15px] text-gray-700 leading-[1.9]">
              運営者は、法令に基づく場合を除き、ユーザーのメールアドレスや個人を特定できる紐付けデータを、本人の同意なく第三者に提供・公開することは一切ありません。（※統計情報として公開されるのは、個人情報が完全に切り離された遊技データのみです）。
            </p>
          </section>

          {/* 4. データの保護 */}
          <section>
            <h2 className="font-sans font-bold text-base sm:text-lg text-gray-800 mb-3">
              4. データの保護
            </h2>
            <p className="text-sm sm:text-[15px] text-gray-700 leading-[1.9]">
              ユーザーのデータは強固なセキュリティ（Row Level Security）によって保護されており、他の一般ユーザーがあなたのデータやメールアドレスを閲覧することはできません。
            </p>
          </section>

          <hr className="my-8 border-gray-200" />

          {/* フッターリンク */}
          <div className="flex items-center justify-center gap-3 text-xs font-mono text-gray-400">
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              利用規約
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/tokushoho" className="hover:text-gray-600 transition-colors">
              特定商取引法
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/dashboard" className="hover:text-gray-600 transition-colors">
              ダッシュボード
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
