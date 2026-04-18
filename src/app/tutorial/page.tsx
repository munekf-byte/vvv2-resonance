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

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* タイトル */}
        <div className="bg-white/90 rounded-2xl border border-gray-200/60 shadow-sm px-5 py-5">
          <h1 className="font-sans font-bold text-lg text-gray-900">使い方ガイド</h1>
          <p className="font-mono text-[10px] text-gray-400 mt-0.5">T.G.R. Resonance クイックチュートリアル</p>
        </div>

        {/* 1. ダッシュボード */}
        <Card>
          <Step num="1" title="セッションを作る" />
          <Img src="/images/tutrial/IMG_2299.PNG" alt="ダッシュボード" caption="ダッシュボード画面" />
          <P>
            1回の稼働 = 1セッション。<br />
            画面下の<B color="#b91c1c">＋ 新規セッション開始</B>をタップしてセッションを作成します。
          </P>
          <Img src="/images/tutrial/IMG_2300.PNG" alt="セッション作成" caption="日付・ホール名・台番号を入力" />
          <P>
            日付・ホール名・台番号を入力して「上記の情報でセッション開始」をタップ。<br />
            自動でセッション名が生成されます。
          </P>
        </Card>

        {/* 2. セッション画面の構成 */}
        <Card>
          <Step num="2" title="セッション画面の構成" />
          <Img src="/images/tutrial/IMG_2301.PNG" alt="セッション画面" caption="セッション画面（初期状態）" />
          <P>
            セッション画面には<B color="#dc2626">3つのタブ</B>があります。
          </P>
          <div className="grid grid-cols-3 gap-2 my-3">
            <TabLabel color="#dc2626" label="通常時" desc="周期データを記録" />
            <TabLabel color="#dc2626" label="AT記録" desc="AT中の詳細を記録" />
            <TabLabel color="#dc2626" label="集計" desc="自動集計・分析" />
          </div>
          <LongPressNote text="各タブはアプリ上で1.5秒長押しすると、詳しい説明が表示されます。" />
          <P>画面下部の4つのボタン:</P>
          <div className="grid grid-cols-2 gap-2 my-3">
            <BtnLabel color="#1e40af" label="打ち出し設定" desc="途中から打つ場合にメニュー画面の情報を転記" />
            <BtnLabel color="#059669" label="収支入力" desc="投資額と交換枚数を記録" />
            <BtnLabel color="#92400e" label="推測設定" desc="自分が推測した設定を記録" />
            <BtnLabel color="#b91c1c" label="＋ 周期追加" desc="通常時1周期分のデータを追加" />
          </div>
          <LongPressNote text="これらのボタンもアプリ上で1.5秒長押しすると、それぞれの詳しい説明が表示されます。" />
        </Card>

        {/* 3. 通常時の記録 */}
        <Card>
          <Step num="3" title="通常時の記録" />
          <Img src="/images/tutrial/IMG_2302.PNG" alt="周期入力" caption="周期入力ダッシュボード" />
          <P>
            <B color="#b91c1c">＋ 周期追加</B>で1周期（CZやATに当たるまでの区間）を記録します。
          </P>
          <div className="bg-gray-50 rounded-lg px-4 py-3 my-3 space-y-1.5 text-[12px] text-gray-700 font-mono">
            <p><b>実G数</b> — その周期で回したゲーム数</p>
            <p><b>ゾーン</b> — 当選したゲーム数帯</p>
            <p><b>イベント</b> — レミニセンス、エピソードボーナス等</p>
            <p><b>AT初当たり</b> — ONにするとAT記録タブに枠が自動生成</p>
          </div>
          <Warn title="CZ内容の入力ルール">
            <li>役カウント（押順ベル、リプレイ等）の<b>PUSHボタンはハズレ時のみ</b>使用</li>
            <li><b>当選した場合は「当」ボタン</b>（赤丸）で処理</li>
            <li>PUSHで加算してから「当」を押すのはNG</li>
          </Warn>
        </Card>

        {/* 4. 保存ボタン */}
        <Card>
          <Step num="4" title="保存と一時保存" />
          <div className="flex gap-3 my-3">
            <div className="flex-1 rounded-lg border-2 border-gray-300 py-3 text-center font-mono font-bold text-sm text-gray-600">一時保存</div>
            <div className="flex-1 rounded-lg py-3 text-center font-mono font-bold text-sm text-white" style={{ backgroundColor: "#b91c1c" }}>保存</div>
          </div>
          <P>
            <b>一時保存</b> — 入力途中のデータを仮保存。画面を閉じずに続けて入力できます。タップすると緑色に変わって保存完了を知らせます。<br /><br />
            <b>保存</b> — 入力を確定して一覧画面に戻ります。データはクラウドに自動同期されます。
          </P>
        </Card>

        {/* 5. AT記録 */}
        <Card>
          <Step num="5" title="AT記録の入力" />
          <Img src="/images/tutrial/IMG_2303.PNG" alt="AT記録タブ" caption="AT記録タブ（AT1が自動生成）" />
          <P>
            通常時で「AT初当たり」をONにすると、AT記録タブにAT枠が表示されます。
          </P>

          <SubTitle text="SET行の追加" />
          <Img src="/images/tutrial/IMG_2304.PNG" alt="SET行入力" caption="SET行入力画面（敵キャラ・対決）" />
          <P>
            <B color="#374151">＋ SET行追加</B>で喰種対決の<b>1セット（1クリア）ごとに1行</b>追加。<br />
            敵キャラ、対決成績、BITES獲得、直乗せなどを記録します。
          </P>
          <Img src="/images/tutrial/IMG_2306.PNG" alt="BITES獲得" caption="BITES獲得・赫眼・枚数表示示唆" />

          <LongPressNote text="「＋ SET行追加」「＋ ジャッジメント行追加」もアプリ上で長押しすると説明が表示されます。" />
          <SubTitle text="有馬ジャッジメント行" />
          <Img src="/images/tutrial/IMG_2308.PNG" alt="ジャッジメント行" caption="有馬ジャッジメント入力画面" />
          <P>
            有馬ジャッジメントは<b>SET行とは別の単独行</b>として追加してください。<br />
            <B color="#92400e">＋ ジャッジメント行追加</B>から入力します。成否・役・CCGの死神枚数を記録。
          </P>

          <SubTitle text="エンディングボーナス（EDボナ）" />
          <P>
            敵キャラで「EDボナ」を選ぶと、不要な項目が自動で非表示に。<br />
            エンディングカードの入力欄が表示されます。
          </P>
        </Card>

        {/* 6. 集計 */}
        <Card>
          <Step num="6" title="集計タブ" />
          <P>
            入力したデータが自動で集計されます。CZ確率・AT確率・赫眼・ゾーン分布・設定示唆などを一覧で確認。
          </P>
          <P>
            <b>TOTALゲーム数</b>は、稼働終了時に液晶メニュー画面の数値を転記してください。確率計算の分母になります。
          </P>
          <Img src="/images/tutrial/TG_Normal.PNG" alt="通常時一覧" caption="記録が積み重なった通常時一覧（実際の稼働例）" />
        </Card>

        {/* 7. ヒント */}
        <Card>
          <Step num="7" title="困ったら長押し" />
          <div className="bg-blue-50 border border-blue-300 rounded-lg px-4 py-3 mt-2">
            <p className="text-blue-800 text-[13px] font-mono leading-relaxed">
              画面下部のボタンや画面上部のタブを<b>1.5秒間長押し</b>すると、その機能の説明が表示されます。
            </p>
          </div>
        </Card>

        {/* 戻るリンク */}
        <div className="text-center py-4">
          <Link href="/dashboard" className="font-mono font-bold text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ダッシュボードへ戻る →
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ── サブコンポーネント ── */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white/90 rounded-2xl border border-gray-200/60 shadow-sm px-5 py-5">{children}</div>;
}

function Step({ num, title }: { num: string; title: string }) {
  return (
    <h2 className="font-sans font-bold text-base text-gray-800 mb-3 flex items-center gap-2">
      <span className="flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-black text-white" style={{ backgroundColor: "#b91c1c" }}>{num}</span>
      {title}
    </h2>
  );
}

function SubTitle({ text }: { text: string }) {
  return <h3 className="font-bold text-[14px] text-gray-800 mt-5 mb-2 border-l-4 border-red-400 pl-2">{text}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-gray-700 leading-[1.8] font-mono">{children}</p>;
}

function B({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className="inline-block font-mono font-bold text-[11px] px-1.5 py-0.5 rounded text-white mx-0.5" style={{ backgroundColor: color }}>{children}</span>;
}

function Img({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <div className="my-3">
      <img src={src} alt={alt} className="w-full max-w-[280px] mx-auto rounded-xl border border-gray-300 shadow-md" />
      <p className="text-center text-[10px] font-mono text-gray-400 mt-1.5">{caption}</p>
    </div>
  );
}

function LongPressNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 my-2">
      <span className="text-[14px] shrink-0 mt-px">👆</span>
      <p className="text-[11px] font-mono text-indigo-700 leading-relaxed">{text}</p>
    </div>
  );
}

function Warn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 my-3">
      <p className="font-bold text-amber-800 text-[13px] mb-1.5">{title}</p>
      <ul className="list-disc list-outside ml-5 space-y-1 text-[12px] text-amber-900 font-mono leading-relaxed">{children}</ul>
    </div>
  );
}

function TabLabel({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="rounded-lg text-center py-2 px-1" style={{ backgroundColor: color }}>
      <p className="text-white font-mono font-bold text-[11px]">{label}</p>
      <p className="text-white/70 font-mono text-[8px] mt-0.5">{desc}</p>
    </div>
  );
}

function BtnLabel({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="rounded-lg px-3 py-2 flex items-start gap-2" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}40` }}>
      <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: color }} />
      <div>
        <p className="font-mono font-bold text-[11px]" style={{ color }}>{label}</p>
        <p className="font-mono text-[9px] text-gray-500 mt-0.5 leading-tight">{desc}</p>
      </div>
    </div>
  );
}
