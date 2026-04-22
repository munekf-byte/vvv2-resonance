import Link from "next/link";

type Row = { label: string; value: React.ReactNode };

const ROWS: Row[] = [
  { label: "事業者名", value: "HiveMind_AkiraP（個人事業）" },
  { label: "運営責任者", value: "請求があった場合に遅滞なく開示いたします" },
  { label: "所在地", value: "請求があった場合に遅滞なく開示いたします" },
  {
    label: "連絡先",
    value: (
      <div className="space-y-1">
        <div>
          メール:{" "}
          <a
            href="mailto:akirap.vvv.666@gmail.com"
            className="underline hover:text-gray-900 transition-colors"
          >
            akirap.vvv.666@gmail.com
          </a>
        </div>
        <div>
          X:{" "}
          <a
            href="https://x.com/puchun_dobadoba"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-900 transition-colors"
          >
            @puchun_dobadoba
          </a>
        </div>
      </div>
    ),
  },
  { label: "販売価格", value: "各サービスページに記載（税込表示）" },
  {
    label: "販売価格以外に必要な費用",
    value: "インターネット接続料金、通信料金（各サービスご利用時に発生）",
  },
  {
    label: "支払方法",
    value: "クレジットカード（Stripe決済） / PayPay（手動対応）",
  },
  { label: "支払時期", value: "購入時に即時決済" },
  {
    label: "商品の引渡時期",
    value: "決済完了後、即時にサービスを利用可能",
  },
  {
    label: "返品・返金について",
    value:
      "デジタルコンテンツの性質上、原則として返金はお受けしておりません。ただし、サービスに重大な不具合がある場合は個別に対応いたします。",
  },
  {
    label: "動作環境",
    value: "モダンブラウザ（Chrome, Safari, Edge 等の最新版）",
  },
];

export default function TokushohoPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>
      {/* ヘッダー */}
      <header
        className="sticky top-0 z-10 border-b border-gray-200/60 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(245,240,232,0.92)" }}
      >
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="font-mono text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← 戻る
          </Link>
          <span className="font-mono font-black text-red-400 text-sm tracking-wider">
            TGR
          </span>
        </div>
      </header>

      {/* 本文 */}
      <main className="max-w-2xl mx-auto px-5 py-10">
        <div className="bg-white/90 rounded-2xl border border-gray-200/60 shadow-sm px-6 py-8 sm:px-10 sm:py-12">
          {/* タイトル */}
          <h1 className="font-sans font-bold text-xl sm:text-2xl text-gray-900 tracking-tight">
            特定商取引法に基づく表記
          </h1>
          <p className="font-mono text-xs text-gray-400 mt-2">
            最終更新日: 2026年4月23日
          </p>
          <p className="font-mono text-xs text-gray-400 mt-0.5">
            運営者: HiveMind_AkiraP
          </p>

          <hr className="my-8 border-gray-200" />

          {/* 表記 */}
          <dl className="divide-y divide-gray-200">
            {ROWS.map((row) => (
              <div
                key={row.label}
                className="py-4 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-6"
              >
                <dt className="font-sans font-bold text-sm text-gray-800 mb-1 sm:mb-0">
                  {row.label}
                </dt>
                <dd className="text-sm sm:text-[15px] text-gray-700 leading-[1.9]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <hr className="my-8 border-gray-200" />

          {/* フッターリンク */}
          <div className="flex items-center justify-center gap-4 text-xs font-mono text-gray-400">
            <Link
              href="/terms"
              className="hover:text-gray-600 transition-colors"
            >
              利用規約
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/privacy"
              className="hover:text-gray-600 transition-colors"
            >
              プライバシーポリシー
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/dashboard"
              className="hover:text-gray-600 transition-colors"
            >
              ダッシュボード
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
