"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 管理者専用 クロス集計ダッシュボード
// PC専用・情報密度最優先・Claude ベージュ基調
// =============================================================================

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import type { PlaySession } from "@/types";
import {
  SETTING_SEGMENTS, ANALYSIS_BLOCKS, type AnalysisBlock, type MatrixBlock,
  buildSegmentMap, computeBlock, generateDiscordMarkdown,
} from "@/lib/tg/analytics-admin";

// ── セグメント列カラー ──────────────────────────────────────────────────────
const SEG_COLORS: Record<string, { bg: string; text: string }> = {
  "全体":     { bg: "#f5f0e8", text: "#374151" },
  "推定低設定": { bg: "#fef2f2", text: "#991b1b" },
  "推定4":     { bg: "#eff6ff", text: "#1e40af" },
  "推定456":   { bg: "#eef2ff", text: "#4338ca" },
  "推定56":    { bg: "#fdf4ff", text: "#7c3aed" },
  "推定6":     { bg: "#fff7ed", text: "#c2410c" },
  "確定6":     { bg: "#fefce8", text: "#a16207" },
};

export default function AdminAnalyticsPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matrixBlocks, setMatrixBlocks] = useState<MatrixBlock[]>([]);
  const [checkedBlocks, setCheckedBlocks] = useState<Set<number>>(new Set());
  const [commentary, setCommentary] = useState("");
  const [copied, setCopied] = useState(false);

  const isAdmin = profile?.is_admin ?? false;

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await fetch("/api/admin/analytics");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: PlaySession[] = await res.json();
        setSessions(data);

        // セグメントマップ構築 → 全ブロック集計
        const segMap = buildSegmentMap(data);
        const blocks = ANALYSIS_BLOCKS.map((name) => computeBlock(name, segMap));
        setMatrixBlocks(blocks);
      } catch (e) {
        setError(e instanceof Error ? e.message : "データ取得エラー");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  function toggleCheck(idx: number) {
    setCheckedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function handleCopy() {
    const selected = [...checkedBlocks].sort().map((i) => matrixBlocks[i]);
    const md = generateDiscordMarkdown(selected, commentary);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: "80px 40px", textAlign: "center", fontFamily: "monospace" }}>
        <h1 style={{ fontSize: "24px", color: "#991b1b" }}>403 Forbidden</h1>
        <p style={{ color: "#6b7280", marginTop: "12px" }}>管理者権限が必要です</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "80px 40px", textAlign: "center", fontFamily: "monospace" }}>
        <p style={{ fontSize: "16px", color: "#6b7280" }}>全ユーザーデータ読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "80px 40px", textAlign: "center", fontFamily: "monospace" }}>
        <h1 style={{ fontSize: "18px", color: "#991b1b" }}>エラー</h1>
        <p style={{ color: "#6b7280", marginTop: "8px" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f0e8", fontFamily: "monospace" }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: "#1f2937", padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "3px solid #92400e",
      }}>
        <div>
          <h1 style={{ color: "#fef3c7", fontSize: "20px", fontWeight: 800 }}>
            COMMANDER LAB — クロス集計ダッシュボード
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "12px", marginTop: "4px" }}>
            {sessions.length} セッション / {SETTING_SEGMENTS.length} セグメント / {ANALYSIS_BLOCKS.length} 分析ブロック
          </p>
        </div>
        <a href="/admin" style={{ color: "#9ca3af", fontSize: "13px", textDecoration: "none" }}>
          ← 管理画面に戻る
        </a>
      </header>

      {/* メインコンテンツ */}
      <main style={{ padding: "24px 32px" }}>

        {/* 全マトリクスブロック */}
        {matrixBlocks.map((block, blockIdx) => (
          <div key={blockIdx} style={{
            marginBottom: "24px", backgroundColor: "#ffffff",
            border: "1px solid #d6d3d1", borderRadius: "6px", overflow: "hidden",
          }}>
            {/* ブロックヘッダー */}
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "8px 16px", backgroundColor: "#292524", color: "#fef3c7",
            }}>
              <input
                type="checkbox"
                checked={checkedBlocks.has(blockIdx)}
                onChange={() => toggleCheck(blockIdx)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <span style={{ fontSize: "14px", fontWeight: 700 }}>{block.title}</span>
            </div>

            {/* テーブル */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr>
                    <th style={{
                      textAlign: "left", padding: "6px 12px",
                      backgroundColor: "#f5f0e8", borderBottom: "2px solid #92400e",
                      position: "sticky", left: 0, zIndex: 1, minWidth: "140px",
                    }}>
                      項目
                    </th>
                    {SETTING_SEGMENTS.map((seg) => (
                      <th key={seg} style={{
                        textAlign: "right", padding: "6px 10px",
                        backgroundColor: SEG_COLORS[seg].bg,
                        color: SEG_COLORS[seg].text,
                        borderBottom: "2px solid #92400e",
                        minWidth: "100px", fontWeight: 700,
                      }}>
                        {seg}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} style={{ backgroundColor: rowIdx % 2 === 0 ? "#ffffff" : "#faf9f7" }}>
                      <td style={{
                        padding: "4px 12px", fontWeight: 600, color: "#374151",
                        borderRight: "1px solid #e7e5e4", borderBottom: "1px solid #e7e5e4",
                        position: "sticky", left: 0, backgroundColor: rowIdx % 2 === 0 ? "#ffffff" : "#faf9f7",
                        zIndex: 1,
                      }}>
                        {row.label}
                      </td>
                      {row.values.map((val, ci) => (
                        <td key={ci} style={{
                          padding: "4px 10px", textAlign: "right",
                          borderRight: "1px solid #e7e5e4", borderBottom: "1px solid #e7e5e4",
                          fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
                        }}>
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Discordレポート生成エリア */}
        <div style={{
          backgroundColor: "#ffffff", border: "2px solid #92400e",
          borderRadius: "6px", padding: "20px", marginTop: "32px",
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#292524", marginBottom: "12px" }}>
            Discord レポート・ジェネレーター
          </h2>
          <p style={{ fontSize: "12px", color: "#78716c", marginBottom: "16px" }}>
            上記テーブルのチェックボックスで出力するブロックを選択してください（{checkedBlocks.size}個選択中）
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>
              考察入力欄
            </label>
            <textarea
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              placeholder="分析に対する考察やコメントを入力..."
              style={{
                width: "100%", minHeight: "100px", padding: "10px",
                border: "1px solid #d6d3d1", borderRadius: "4px",
                fontFamily: "monospace", fontSize: "13px", resize: "vertical",
              }}
            />
          </div>

          <button
            onClick={handleCopy}
            disabled={checkedBlocks.size === 0}
            style={{
              padding: "10px 24px", borderRadius: "6px",
              backgroundColor: checkedBlocks.size > 0 ? "#92400e" : "#d6d3d1",
              color: checkedBlocks.size > 0 ? "#ffffff" : "#9ca3af",
              fontWeight: 700, fontSize: "14px", cursor: checkedBlocks.size > 0 ? "pointer" : "not-allowed",
              border: "none", fontFamily: "monospace",
            }}
          >
            {copied ? "コピーしました" : `Markdown をクリップボードにコピー (${checkedBlocks.size}ブロック)`}
          </button>
        </div>
      </main>
    </div>
  );
}
