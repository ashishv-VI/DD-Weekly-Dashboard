interface ReportData {
  clientName: string
  domain: string
  period: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  sessions: number
  users: number
  engagementRate: number
  clickTrend: number
  sessionTrend: number
  topKeyword: string
  topKeywordClicks: number
}

export function weeklyReportHtml(data: ReportData): string {
  const { clientName, domain, period, clicks, impressions, ctr, position,
    sessions, users, engagementRate, clickTrend, sessionTrend, topKeyword, topKeywordClicks } = data

  const trendArrow = (v: number) => v > 0 ? "▲" : v < 0 ? "▼" : "—"
  const trendColor = (v: number) => v > 0 ? "#16a34a" : v < 0 ? "#dc2626" : "#6b7280"

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SEO Weekly Report — ${clientName}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

  <!-- HEADER -->
  <tr>
    <td style="background:#1e3a5f;padding:32px 40px;">
      <div style="font-size:13px;color:#93c5fd;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Weekly SEO Report</div>
      <div style="font-size:24px;font-weight:800;color:#ffffff;margin-bottom:4px;">${clientName}</div>
      <div style="font-size:13px;color:#93c5fd;">${domain} · ${period}</div>
    </td>
  </tr>

  <!-- SEARCH CONSOLE -->
  <tr>
    <td style="padding:32px 40px 0;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">
        Google Search Console
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="25%" style="text-align:center;padding:16px 8px;">
            <div style="font-size:28px;font-weight:800;color:#1e40af;">${clicks.toLocaleString()}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">Clicks</div>
            <div style="font-size:12px;font-weight:600;color:${trendColor(clickTrend)};margin-top:4px;">${trendArrow(clickTrend)} ${Math.abs(clickTrend).toFixed(0)}%</div>
          </td>
          <td width="25%" style="text-align:center;padding:16px 8px;border-left:1px solid #f3f4f6;">
            <div style="font-size:28px;font-weight:800;color:#1e3a5f;">${impressions >= 1000 ? (impressions/1000).toFixed(1)+"K" : impressions}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">Impressions</div>
          </td>
          <td width="25%" style="text-align:center;padding:16px 8px;border-left:1px solid #f3f4f6;">
            <div style="font-size:28px;font-weight:800;color:#1e3a5f;">${ctr.toFixed(2)}%</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">CTR</div>
          </td>
          <td width="25%" style="text-align:center;padding:16px 8px;border-left:1px solid #f3f4f6;">
            <div style="font-size:28px;font-weight:800;color:#1e3a5f;">${position.toFixed(1)}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">Avg Position</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ANALYTICS -->
  <tr>
    <td style="padding:24px 40px 0;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">
        Google Analytics
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" style="text-align:center;padding:16px 8px;">
            <div style="font-size:28px;font-weight:800;color:#166534;">${sessions.toLocaleString()}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">Sessions</div>
            <div style="font-size:12px;font-weight:600;color:${trendColor(sessionTrend)};margin-top:4px;">${trendArrow(sessionTrend)} ${Math.abs(sessionTrend).toFixed(0)}%</div>
          </td>
          <td width="33%" style="text-align:center;padding:16px 8px;border-left:1px solid #f3f4f6;">
            <div style="font-size:28px;font-weight:800;color:#166534;">${users.toLocaleString()}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">Users</div>
          </td>
          <td width="33%" style="text-align:center;padding:16px 8px;border-left:1px solid #f3f4f6;">
            <div style="font-size:28px;font-weight:800;color:#166534;">${engagementRate.toFixed(1)}%</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">Engagement</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- TOP KEYWORD -->
  ${topKeyword ? `
  <tr>
    <td style="padding:24px 40px 0;">
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#0369a1;margin-bottom:6px;">Top Keyword This Period</div>
        <div style="font-size:18px;font-weight:700;color:#0c4a6e;">"${topKeyword}"</div>
        <div style="font-size:13px;color:#0369a1;margin-top:4px;">${topKeywordClicks} clicks</div>
      </div>
    </td>
  </tr>` : ""}

  <!-- CTA -->
  <tr>
    <td style="padding:32px 40px;">
      <div style="text-align:center;">
        <a href="https://app-five-hazel-81.vercel.app/client/login"
          style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;">
          View Full Dashboard →
        </a>
      </div>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
      <div style="font-size:12px;color:#9ca3af;">Prepared by <strong style="color:#6b7280;">Damco Digital</strong> · SEO Intelligence Platform</div>
      <div style="font-size:11px;color:#d1d5db;margin-top:4px;">This report is generated automatically every week.</div>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`
}

export function weeklyReportText(data: ReportData): string {
  return `Weekly SEO Report — ${data.clientName}
${data.domain} · ${data.period}

SEARCH CONSOLE
Clicks: ${data.clicks.toLocaleString()}
Impressions: ${data.impressions.toLocaleString()}
CTR: ${data.ctr.toFixed(2)}%
Avg Position: ${data.position.toFixed(1)}

GOOGLE ANALYTICS
Sessions: ${data.sessions.toLocaleString()}
Users: ${data.users.toLocaleString()}
Engagement Rate: ${data.engagementRate.toFixed(1)}%

${data.topKeyword ? `Top Keyword: "${data.topKeyword}" (${data.topKeywordClicks} clicks)` : ""}

View full dashboard: https://app-five-hazel-81.vercel.app/client/login

Prepared by Damco Digital`
}
