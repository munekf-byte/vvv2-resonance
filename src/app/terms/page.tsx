import Link from "next/link";

export default function TermsPage() {
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
            L東京喰種 RESONANCE 利用規約
          </h1>
          <p className="font-mono text-xs text-gray-400 mt-2">
            最終更新日: 2025年12月26日（※適宜更新）
          </p>
          <p className="font-mono text-xs text-gray-400 mt-0.5">
            運営者: @puchun_dobadoba
          </p>

          <hr className="my-8 border-gray-200" />

          {/* 第1条 */}
          <section className="mb-10">
            <h2 className="font-sans font-bold text-base sm:text-lg text-gray-800 mb-3">
              第1条（適用）
            </h2>
            <p className="text-sm sm:text-[15px] text-gray-700 leading-[1.9]">
              本利用規約（以下「本規約」）は、運営者が提供するWebアプリケーション「L東京喰種
              RESONANCE」（以下「本サービス」）の利用条件を定めるものです。ユーザーは本サービスへのログインをもって、本規約に同意したものとみなします。
            </p>
          </section>

          {/* 第2条 */}
          <section className="mb-10">
            <h2 className="font-sans font-bold text-base sm:text-lg text-gray-800 mb-3">
              第2条（データの取り扱いと著作権）
            </h2>
            <ol className="list-decimal list-outside ml-5 space-y-3 text-sm sm:text-[15px] text-gray-700 leading-[1.9]">
              <li>
                本サービスに入力された遊技データ（ゲーム数、ゾーン、当選契機、終了画面示唆等）の集計・分析結果に関する著作権および所有権は、運営者に帰属します。
              </li>
              <li>
                運営者は、収集したデータを特定の個人（ユーザー名やメールアドレス等）が識別できない統計情報として加工した上で、限定コミュニティでの配信や有償レポート等の商用利用に用いることができるものとします。
              </li>
            </ol>
          </section>

          {/* 第3条 */}
          <section className="mb-10">
            <h2 className="font-sans font-bold text-base sm:text-lg text-gray-800 mb-3">
              第3条（禁止事項と不正利用時の措置）
            </h2>
            <ol className="list-decimal list-outside ml-5 space-y-3 text-sm sm:text-[15px] text-gray-700 leading-[1.9]">
              <li>
                本サービスのシステムの全部または一部を複製、改ざん、リバースエンジニアリング、または類似サービス開発へ流用することを固く禁じます。
              </li>
              <li>
                Proプラン（有料機能）のアクセス権（Discordコミュニティへの招待リンク等）を第三者へ譲渡・共有することを禁じます。
              </li>
              <li>
                本規約に違反する行為が確認された場合、運営者は事前の通知なく当該ユーザーの利用停止、コミュニティからの除名、および損害賠償請求を含む法的措置を講じることがあります。
              </li>
            </ol>
          </section>

          {/* 第4条 */}
          <section className="mb-10">
            <h2 className="font-sans font-bold text-base sm:text-lg text-gray-800 mb-3">
              第4条（免責事項）
            </h2>
            <ol className="list-decimal list-outside ml-5 space-y-3 text-sm sm:text-[15px] text-gray-700 leading-[1.9]">
              <li>
                本サービスが提供する分析結果および設定推定ロジックは、独自の実戦データと統計的推定に基づくものであり、その正確性、完全性、実際の遊技結果との一致を保証するものではありません。本サービスの情報に基づく遊技結果について、運営者は一切の責任を負いません。
              </li>
              <li>
                運営者は、システムのメンテナンス、サーバー障害（Supabase等）、または予期せぬ不具合によるデータの消失やサービスの一時停止について、いかなる責任も負いません。
              </li>
            </ol>
          </section>

          {/* 第5条 */}
          <section>
            <h2 className="font-sans font-bold text-base sm:text-lg text-gray-800 mb-3">
              第5条（準拠法・管轄裁判所）
            </h2>
            <p className="text-sm sm:text-[15px] text-gray-700 leading-[1.9]">
              本規約の解釈および適用は日本国法に準拠し、本サービスに関する一切の紛争については、運営者の住所地を管轄する裁判所を専属的合意管轄裁判所とします。
            </p>
          </section>

          <hr className="my-8 border-gray-200" />

          {/* フッターリンク */}
          <div className="flex items-center justify-center gap-3 text-xs font-mono text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">
              プライバシーポリシー
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
