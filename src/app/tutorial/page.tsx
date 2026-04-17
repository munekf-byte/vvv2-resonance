import Link from "next/link";

export default function TutorialPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0e8" }}>
      <header className="sticky top-0 z-10 border-b border-gray-200/60 backdrop-blur-sm" style={{ backgroundColor: "rgba(245,240,232,0.92)" }}>
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/dashboard" className="font-mono text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← 戻る
          </Link>
          <span className="font-mono font-black text-red-400 text-sm tracking-wider">TGR</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        <div className="bg-white/90 rounded-2xl border border-gray-200/60 shadow-sm px-6 py-8 sm:px-10 sm:py-10">

          <h1 className="font-sans font-bold text-xl text-gray-900 tracking-tight">
            使い方ガイド
          </h1>
          <p className="font-mono text-xs text-gray-400 mt-1">T.G.R. Resonance クイックチュートリアル</p>

          <hr className="my-6 border-gray-200" />

          {/* 1. セッションとは */}
          <Section num="1" title="セッションとは？">
            <p>
              セッション = <b>1回の稼働</b>のことです。<br />
              ホールに行って台に座り、やめるまでが1セッション。<br />
              日付・ホール名・台番号を入力してセッションを作成し、そこに全てのデータを記録していきます。
            </p>
          </Section>

          {/* 2. セッションの作り方 */}
          <Section num="2" title="セッションの作り方">
            <p>
              ダッシュボード下部の<Badge color="#b91c1c">＋ 新規セッション開始</Badge>をタップ。
            </p>
            <ul className="list-disc list-outside ml-5 mt-2 space-y-1">
              <li>日付（デフォルト: 今日）</li>
              <li>ホール名</li>
              <li>台番号</li>
            </ul>
            <p className="mt-2">
              入力して「上記の情報でセッション開始」をタップすると、自動でセッション名が生成されます。
            </p>
          </Section>

          {/* 3. 通常時の記録 */}
          <Section num="3" title="通常時の記録（周期追加）">
            <p>
              セッション画面の<Badge color="#b91c1c">＋ 周期追加</Badge>で、1周期（1イベント）分のデータを記録します。
            </p>
            <div className="bg-gray-50 rounded-lg px-4 py-3 mt-3 space-y-2 text-[13px]">
              <p><b>1周期 = CZやATに当選するまでの区間</b></p>
              <p>記録する項目: 実ゲーム数、ゾーン、当選契機、イベント（レミニセンス等）、前兆履歴、アイキャッチ、招待状 など</p>
            </div>
            <p className="mt-3">
              <b>AT初当たりを記録する場合</b>は、周期の入力画面で「AT Get」をONにしてください。これにより、AT記録タブにAT枠が自動生成されます。
            </p>
          </Section>

          {/* 4. CZ内容の入力 */}
          <Section num="4" title="CZ内容の入力ルール">
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mt-1">
              <p className="font-bold text-amber-800 text-[13px] mb-1">重要</p>
              <ul className="list-disc list-outside ml-5 space-y-1">
                <li>CZ中の役カウント（押順ベル、リプレイ等）の<b>プラスボタンはハズレ時のみ</b>使用</li>
                <li><b>当選した場合は「あたり」ボタン</b>（★マーク）で処理してください</li>
                <li>プッシュボタン（＋）で加算してから「あたり」を押すのはNG</li>
              </ul>
            </div>
          </Section>

          {/* 5. AT記録 */}
          <Section num="5" title="AT記録の入力">
            <p>
              通常時で「AT Get」を記録すると、<Badge color="#dc2626">AT記録</Badge>タブにAT枠が表示されます。
            </p>

            <h4 className="font-bold text-gray-800 text-[14px] mt-4 mb-1">SET行の追加</h4>
            <p>
              喰種対決の<b>1セット（1クリア）ごとに1行</b>追加します。<br />
              敵キャラ、BITES獲得、直乗せ、対決成績などを記録。
            </p>

            <h4 className="font-bold text-gray-800 text-[14px] mt-4 mb-1">有馬ジャッジメント行</h4>
            <p>
              有馬ジャッジメントは<b>SET行とは別の単独行</b>として追加してください。<br />
              「＋ ジャッジメント行追加」ボタンから入力します。
            </p>

            <h4 className="font-bold text-gray-800 text-[14px] mt-4 mb-1">エンディングボーナス（EDボナ）</h4>
            <p>
              敵キャラ選択で「EDボナ」を選ぶと、不要な入力項目が自動で非表示になります。<br />
              エンディングカードの入力欄が表示されるので、そこにカード情報を記録してください。
            </p>
          </Section>

          {/* 6. 集計タブ */}
          <Section num="6" title="集計タブ">
            <p>
              入力したデータが自動で集計されます。CZ確率・AT確率・赫眼・ゾーン分布・設定示唆などを一覧で確認できます。
            </p>
            <p className="mt-2">
              <b>TOTALゲーム数</b>は、稼働終了時に液晶メニュー画面の数値を転記してください。確率計算の分母になります。
            </p>
          </Section>

          {/* 7. ヒント */}
          <Section num="7" title="困ったら長押し">
            <div className="bg-blue-50 border border-blue-300 rounded-lg px-4 py-3 mt-1">
              <p className="text-blue-800 text-[13px] leading-relaxed">
                画面下部のボタンや画面上部のタブを<b>1.5秒間長押し</b>すると、その機能の説明が表示されます。初めて使う方はまず長押ししてみてください。
              </p>
            </div>
          </Section>

          <hr className="my-6 border-gray-200" />

          <div className="flex items-center justify-center">
            <Link href="/dashboard" className="font-mono font-bold text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ダッシュボードへ戻る →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-sans font-bold text-base text-gray-800 mb-2 flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black text-white" style={{ backgroundColor: "#b91c1c" }}>{num}</span>
        {title}
      </h2>
      <div className="text-sm text-gray-700 leading-[1.9] pl-8">
        {children}
      </div>
    </section>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-block font-mono font-bold text-[11px] px-1.5 py-0.5 rounded text-white mx-0.5" style={{ backgroundColor: color }}>
      {children}
    </span>
  );
}
