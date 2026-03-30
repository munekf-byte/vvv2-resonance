// =============================================================================
// VALVRAVE-RESONANCE: 共有型定義 (v2 — GAS実データ構造に準拠)
// Project: V2-Web-Analytic | Version: 0.2.0
// GAS参照: user-seat-ver.8.4.gs / master-seat-ver.4.0.gs
// =============================================================================

// -----------------------------------------------------------------------------
// 基本列挙型
// -----------------------------------------------------------------------------

/** 滞在モード (A/B/C/H=天国) */
export type V2Mode = "A" | "B" | "C" | "H";

/** セッションステータス */
export type SessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

// -----------------------------------------------------------------------------
// ドルシア攻防戦 (通常時の1フェーズ = 3セル: キャラ・攻撃・結果)
// GASヘッダー: '1-1','1-2','1-3' ... '5-1','5-2','5-3'
// -----------------------------------------------------------------------------

export interface DolciaPhase {
  /** キャラ名 (例: "リプ🟦", "ベル🟨", "V役🟩") */
  chara: string;
  /** 攻撃/アクション種別 */
  attack: string;
  /** 結果 (例: "✅", "✖️") */
  result: string;
}

// -----------------------------------------------------------------------------
// NormalBlock: 通常時の1周期 (3行ブロック)
// GAS参照: areaC = DZ86:FO196 (3行単位)
//   [0]=実G, [1]=規定pt履歴, [2]=周期, [3]=契機,
//   [4]=イベント1, [5]=イベント2, [6]=示唆, [7]=革ボ情報, [8]=革ボ獲得,
//   [9]=AT初当り, [10]=AT実績, [11]=AT獲得枚数,
//   [12-17]=ドルシア①②, [18-23]=ドルシア③④, [24-29]=ドルシア⑤,
//   [13]=自動メモ, [14]=手書きメモ1
// -----------------------------------------------------------------------------

export interface NormalBlock {
  id: string;

  // ----- ゲーム数 -----
  /** 通常G消費数 (r[0]) */
  games: number;
  /**
   * CZ消費G数 (CP列)
   * GAS: czG_Range = sheet.getRange('CP86:CP196')
   */
  czGames: number;

  // ----- 規定pt履歴 (ベイズ推定入力) -----
  /**
   * 規定pt履歴文字列 (r[1])
   * 例: "②②④" = 1周期目②、2周期目②、3周期目④
   */
  ptHistory: string;
  /**
   * 天井情報 (r[2])
   * 例: "2周期" → bayesUpdateCeiling(2) を呼ぶ
   */
  weekText: string;

  // ----- イベント -----
  /** 契機 (r[3]): "LD", "ニンゲン" 等 */
  trigger: string;
  /**
   * イベント1 (r[4])
   * 例: "CZ", "革命BONUS", "決戦BONUS"
   */
  event1: string;
  /**
   * イベント2 (r[5])
   * 例: "RUSH", "革命BONUS"
   * GAS計算: ev1.includes('革命BONUS') || ev2.includes('革命BONUS')
   */
  event2: string;
  /** 示唆 (r[6]) */
  suggestion: string;

  // ----- ボーナス -----
  /** 革ボ情報 (r[7]) */
  bonusInfo: string;
  /** 革ボ獲得 文字列 (r[8]) */
  bonusGainStr: string;
  /**
   * 実際のボーナス枚数入力値 (Z列 = zRange[i+2][0])
   * null = 規定値を使用 (成功:539, 失敗:468, 決戦:72)
   * GAS: inputBonus = extractNum(zRange[i+2][0])
   */
  bonusActual: number | null;

  // ----- AT -----
  /**
   * AT初当り キー (r[9])
   * 例: "AT1", "AT2", null = AT非当選
   * GAS: atKey = (at || '').toString().trim()
   */
  atKey: string | null;
  /** AT実績 (r[10]) */
  atActual: string;
  /** AT獲得枚数 (r[11]) */
  atGainStr: string;

  // ----- ドルシア攻防戦 (5フェーズ) -----
  /**
   * フェーズ①〜⑤ (null = 未発生)
   * GAS cols: [12-14]=①, [15-17]=②, [18-20]=③, [21-23]=④, [24-26]=⑤
   */
  dolciaPhases: [
    DolciaPhase | null, // ①
    DolciaPhase | null, // ②
    DolciaPhase | null, // ③
    DolciaPhase | null, // ④
    DolciaPhase | null, // ⑤
  ];

  // ----- メモ -----
  /** 自動反映メモ (r[13]) */
  memoAuto: string;
  /** 手書き入力メモ1 (r[14]) */
  memoHandwritten: string;

  // ----- 計算結果 (V2Engineによる) -----
  /**
   * 差枚スタンプ: 通常G消費直後 = 当選の底
   * GAS: hitBalance = Math.round(startDiff + myDiff) ← 通常G消費直後、ボーナス・AT前
   * null = 未計算
   */
  calculatedDiff: number | null;
}

// -----------------------------------------------------------------------------
// ATRound: 1AT内の1ラウンド (2行ブロック)
// GAS参照: atRange = FQ86:GJ384 (2行単位)
//   d[0]=AT番号, d[1]=R種別, d[2]=継続契機, d[3]=状態,
//   d[4]=枚数記録(入力), d[5]=切断フラグ, d[6]=道中乗せG,
//   d[7-9]=革命の剣, d[10]=特殊枚数, ...
//   d[18]=引戻しG (GI列 = retRange), d[19]=特殊G (GJ列)
// -----------------------------------------------------------------------------

export interface ATRound {
  id: string;

  /** 所属ATキー (例: "AT1") */
  atKey: string;
  /**
   * ラウンドインデックス (0始まり)
   * rIdx > 0 の場合ハラキリ消費あり
   * GAS: if (rIdx > 0) myDiff -= (3.3 * 1.529)
   */
  roundIndex: number;

  // ----- ラウンドデータ -----
  /**
   * R種別 (d[1])
   * 例: "10", "20", "50||D", "100||D", "200", "究極"
   * extractNum() で数値を取得
   */
  roundType: string;
  /**
   * 切断フラグ (d[5])
   * "切断║ED" の場合、ED特殊計算を適用
   * GAS: if (d[5] === '切断║ED') { gain += 200; gain -= retG*9; }
   * 通常: if (retG > 0) myDiff -= retG * 1.529
   */
  cutFlag: string;
  /**
   * 道中乗せG数 (d[6])
   * GAS: g += extractNum(d[6])
   */
  midBonusGames: number;
  /**
   * 引戻しG数 (d[18] = GI列 = retRange)
   * GAS: retVal = extractNum(retRange[round.idx][0])
   */
  returnGames: number;
  /**
   * 特殊G数 (d[19] = GJ列)
   * GAS: g += extractNum(d[19])
   */
  specialGames: number;

  // ----- その他記録 -----
  /** 継続契機 (d[2]) */
  continueTrigger: string;
  /** 状態 (d[3]) */
  stateText: string;
  /** 枚数記録 入力値 (d[4]) */
  stampInput: number | null;

  // ----- 計算結果 (V2Engineによる) -----
  /**
   * 差枚スタンプ: gain加算直後
   * GAS: round.diff = Math.round(startDiff + myDiff)
   * null = 未計算
   */
  calculatedDiff: number | null;
}

// -----------------------------------------------------------------------------
// ATEntry: 1ATセット (= ATラウンドのコンテナ)
// -----------------------------------------------------------------------------

export interface ATEntry {
  /** "AT1", "AT2", ... */
  atKey: string;
  /** 時系列順のラウンド一覧 */
  rounds: ATRound[];
}

// -----------------------------------------------------------------------------
// モード推定
// -----------------------------------------------------------------------------

/** モード別確率分布 (全要素の合計 = 1.0) */
export interface ModeProbabilities {
  A: number;
  B: number;
  C: number;
  H: number;
}

/** ベイズ更新の1ステップ記録 */
export interface BayesStep {
  prior: ModeProbabilities;
  /** 証拠の識別子 例: "②", "2周期", "memo:化け物" */
  evidence: string;
  posterior: ModeProbabilities;
}

/**
 * 1ブロックのモード推定結果
 * GAS: processBlockInMemory() の戻り値に対応
 */
export interface ModeInferenceResult {
  /** 事前確率 */
  priorProbs: ModeProbabilities;
  /** 最終確率 */
  probabilities: ModeProbabilities;
  /** 最有力モード */
  mostLikelyMode: V2Mode;
  /**
   * 特殊テーブル疑惑スコア (0.0 〜 1.0)
   * null = 評価対象外 (⑤⑥到達または直前が⑥)
   * GAS: calculateSpecialTableProb()
   */
  specialTableScore: number | null;
  /** 更新ステップ一覧 */
  steps: BayesStep[];
}

// -----------------------------------------------------------------------------
// セッションサマリー
// -----------------------------------------------------------------------------

export interface SessionSummary {
  /** 最終差枚 (myDiff) */
  totalDiff: number;
  /** 総G数 */
  totalGames: number;
  /** 通常G数 */
  normalGames: number;
  /** AT当選回数 */
  atCount: number;
  /** CZ発生回数 */
  czCount: number;
  /** CZ成功回数 */
  czSuccessCount: number;
  /** 革命BONUS発生回数 */
  kakuBonusCount: number;
  /** 革命BONUS → AT当選回数 */
  kakuBonusSuccessCount: number;
  /** 決戦BONUS発生回数 */
  kessBonusCount: number;
  /** 決戦BONUS → AT当選回数 */
  kessBonusSuccessCount: number;
}

// -----------------------------------------------------------------------------
// PlaySession: セッション全体
// -----------------------------------------------------------------------------

export interface PlaySession {
  id: string;
  userId: string;
  /** 機種名 */
  machineName: string;
  startedAt: string; // ISO 8601
  endedAt: string | null;
  status: SessionStatus;

  /**
   * セッション開始前差枚 (前セッションからの引き継ぎ)
   * GAS: startDiff = sheet.getRange('T81').getValue() || 0
   */
  startDiff: number;

  /**
   * 初期スルーカウント (前回までのAT非当選周期数)
   * GAS: initialThroughCount = parseInt(sheet.getRange('P83').getValue()) || 0
   */
  initialThroughCount: number;

  /** 通常時ブロック (時系列順) */
  normalBlocks: NormalBlock[];

  /** ATエントリ (atKeyでルックアップ) */
  atEntries: ATEntry[];

  /** 計算済みサマリー (V2Engine.recalculate() 後に設定) */
  summary: SessionSummary | null;

  /**
   * 各ブロックのモード推定結果 (normalBlocks と同じ長さ)
   * V2Engine.recalculate() 後に設定
   */
  modeInferences: (ModeInferenceResult | null)[];

  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// V2Engine I/O
// -----------------------------------------------------------------------------

export interface RecalculateInput {
  session: PlaySession;
}

export interface RecalculateOutput {
  /** 差枚スタンプ再計算済みブロック列 */
  normalBlocks: NormalBlock[];
  /** 差枚スタンプ再計算済みATエントリ */
  atEntries: ATEntry[];
  /** セッション集計 */
  summary: SessionSummary;
  /** 各ブロックのモード推定 */
  modeInferences: (ModeInferenceResult | null)[];
}

// -----------------------------------------------------------------------------
// Supabase DB Row 型 (snake_case)
// JSONB カラムは Supabase 標準の Json 型を使用する
// (Supabase v2.100+ の GenericSchema チェックを通すため)
// -----------------------------------------------------------------------------

/**
 * Supabase JSONB カラム用の汎用 Json 型
 * Supabase CLI が自動生成するものと同一定義
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface PlaySessionRow {
  id: string;
  user_id: string;
  machine_name: string;
  started_at: string;
  ended_at: string | null;
  status: SessionStatus;
  start_diff: number;
  initial_through_count: number;
  /** JSONB — アプリ側では NormalBlock[] にキャストして使用 */
  normal_blocks: Json;
  /** JSONB — アプリ側では ATEntry[] にキャストして使用 */
  at_entries: Json;
  /** JSONB — アプリ側では SessionSummary | null にキャストして使用 */
  summary: Json | null;
  /** JSONB — アプリ側では (ModeInferenceResult | null)[] | null にキャストして使用 */
  mode_inferences: Json | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}
