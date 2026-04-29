// =============================================================================
// メール送信ヘルパー
// Resend REST API を fetch で呼ぶ薄いラッパー。
// RESEND_API_KEY が未設定なら no-op（ログ出力のみ）して上位ロジックを止めない。
// =============================================================================

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://vvv2-resonance.vercel.app";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

async function sendMail({ to, subject, html }: SendMailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "TGR Resonance <noreply@example.com>";

  if (!apiKey) {
    console.warn("[sendMail] RESEND_API_KEY 未設定のため送信スキップ:", subject, "→", to);
    return;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[sendMail] Resend API error:", res.status, body);
    }
  } catch (err) {
    console.error("[sendMail] failed:", err);
  }
}

// ── Pro 昇格通知メール（ユーザー宛）──────────────────────────────────────
export async function sendProUpgradeEmail(params: {
  to: string;
  displayName?: string | null;
}): Promise<void> {
  const name = params.displayName?.trim() || "ユーザー";
  const subject = "【TGR】Proプランへの昇格が完了しました 🎉";
  const html = `
<div style="font-family:'Hiragino Sans','Noto Sans JP',sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.8;">
  <h2 style="color:#b45309;border-bottom:2px solid #fbbf24;padding-bottom:8px;">Proプランへの昇格が完了しました</h2>
  <p>${escapeHtml(name)} さん</p>
  <p>Proプランへの昇格が完了しました。<br>アプリにログインすると、すべてのPro機能がご利用いただけます。</p>
  <h3 style="color:#1f2937;margin-top:24px;">■ 利用可能になった機能</h3>
  <ul>
    <li>稼働ログ無制限保存</li>
    <li>トータル数値分析</li>
    <li>専用Discordコミュニティ（アプリ内から連携可能）</li>
  </ul>
  <p style="margin-top:24px;">
    <a href="${APP_URL}" style="display:inline-block;background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">アプリを開く</a>
  </p>
  <p style="color:#6b7280;font-size:12px;margin-top:32px;">ご不明点がございましたら、お気軽にお問い合わせください。<br>HiveMind_AkiraP &lt;akirap.vvv.666@gmail.com&gt;</p>
</div>`;
  await sendMail({ to: params.to, subject, html });
}

// ── 管理者通知メール（送金報告着信）──────────────────────────────────────
export async function sendAdminPaymentNotification(params: {
  userEmail: string;
  paymentDate: string;
  reportedAt: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.warn("[sendAdminPaymentNotification] ADMIN_NOTIFICATION_EMAIL 未設定のためスキップ");
    return;
  }
  const subject = "【TGR】新しい送金報告が届きました";
  const html = `
<div style="font-family:'Hiragino Sans','Noto Sans JP',sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.8;">
  <h2 style="color:#b91c1c;border-bottom:2px solid #ef4444;padding-bottom:8px;">📩 新しい送金報告</h2>
  <table style="width:100%;border-collapse:collapse;margin-top:12px;">
    <tr><td style="padding:6px 8px;background:#f9fafb;width:140px;font-weight:bold;">ユーザー</td><td style="padding:6px 8px;">${escapeHtml(params.userEmail)}</td></tr>
    <tr><td style="padding:6px 8px;background:#f9fafb;font-weight:bold;">送金日時</td><td style="padding:6px 8px;">${escapeHtml(params.paymentDate)}</td></tr>
    <tr><td style="padding:6px 8px;background:#f9fafb;font-weight:bold;">報告日時</td><td style="padding:6px 8px;">${escapeHtml(params.reportedAt)}</td></tr>
    <tr><td style="padding:6px 8px;background:#f9fafb;font-weight:bold;">金額</td><td style="padding:6px 8px;">¥1,500</td></tr>
  </table>
  <p style="margin-top:20px;">
    <a href="${APP_URL}/admin/payments" style="display:inline-block;background:#1f2937;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">管理画面を開く</a>
  </p>
</div>`;
  await sendMail({ to: adminEmail, subject, html });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
