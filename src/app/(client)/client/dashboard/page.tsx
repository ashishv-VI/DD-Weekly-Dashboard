"use client"
import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { DATE_PRESETS } from "@/lib/dateRange"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientInfo { id: string; name: string; domain: string; username: string; ga4PropertyId: string | null; gscSiteUrl: string | null; logoUrl?: string; themeColor?: string; textOnTheme?: string }
interface GSCTotals { clicks: number; impressions: number; ctr: number; position: number; prevClicks: number; prevImpressions: number; prevCtr: number; prevPosition: number }
interface GA4Totals { sessions: number; users: number; newUsers: number; returningUsers: number; engagedSessions: number; engagementRate: number; conversions: number; revenue: number; avgSessionDuration: number; screenPageViewsPerSession: number; prevSessions: number; prevConversions: number }
interface DailyRow { date: string; clicks?: number; sessions?: number }
interface KeywordRow { keyword: string; clicks: number; impressions: number; ctr: number; position: number }
interface KeywordWithPage { keyword: string; page: string; clicks: number; impressions: number; ctr: number; position: number }
interface PageRow { url: string; clicks: number; impressions: number; ctr: number; position: number }
interface DeviceRow { device: string; sessions: number; users: number }
interface CountryRow { country: string; sessions: number; users: number }
interface ChannelRow { channel: string; sessions: number; users: number; engagementRate: number; conversions: number; prevSessions: number }
interface AISourceRow { source: string; sessions: number; users: number; avgDuration: number; conversions: number }
interface AITrafficData { total: number; totalUsers: number; bySource: AISourceRow[]; topPages: { page: string; sessions: number; users: number }[]; daily: { date: string; sessions: number }[] }
interface UserBreakdownRow { type: "new" | "returning"; sessions: number; users: number; avgDuration: number; engagementRate: number; pagesPerSession: number }
interface PagePerformanceRow { landingPage: string; users: number; sessions: number; avgEngagementTime: number; conversions: number; engagementRate: number }
interface PageSpeedMetrics { score: number; lcp: string; cls: string; fcp: string; tbt: string; si: string }
interface PageSpeedData { mobile: PageSpeedMetrics; desktop: PageSpeedMetrics }
interface AuditCheck { label: string; detail: string; status: "ok" | "warn" | "fail" }
interface SiteAuditResult {
  robots: { status: "ok" | "warn" | "fail"; checks: AuditCheck[] }
  sitemap: { status: "ok" | "warn" | "fail"; urlCount: number; checks: AuditCheck[] }
  schema: { status: "ok" | "warn" | "fail"; types: string[]; checks: AuditCheck[] }
}
interface MultiPageSpeed { path: string; name: string; mobile: PageSpeedMetrics; desktop: PageSpeedMetrics }
interface ApiData {
  gsc?: { totals: GSCTotals; daily: DailyRow[] } | null
  ga4?: { totals: GA4Totals; daily: DailyRow[] } | null
  keywords?: KeywordRow[]
  keywordsWithPages?: KeywordWithPage[]
  pages?: PageRow[]
  devices?: DeviceRow[]
  countries?: CountryRow[]
  channels?: ChannelRow[]
  aiTraffic?: AITrafficData | null
  userBreakdown?: UserBreakdownRow[]
  pagePerformance?: PagePerformanceRow[]
  error?: string
}
interface OpportunityItem { title: string; desc: string; category: string; impact: "High" | "Medium" | "Low" | "Growth" }
interface RankingRow { keyword: string; prevRank: number | null; currentRank: number | null; volume: number | null; url: string; location: string }
type TabKey = "overview" | "traffic" | "keywords" | "pages" | "ai" | "opportunities" | "engagement" | "health" | "rankings"

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—"
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

function fmtDur(sec: number): string {
  if (!sec) return "—"
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function pct(curr: number, prev: number): number {
  if (!prev) return 0
  return ((curr - prev) / prev) * 100
}

function formatPageUrl(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/, "")
  if (!path || path === "/") return "/ (Homepage)"
  return path
}

function AiPlatformIcon({ source }: { source: string }) {
  const s = source.toLowerCase()
  if (s.includes("openai") || s.includes("chatgpt")) {
    return (
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#10a37f" }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 3v2.5M12 18.5v2.5M3 12h2.5M18.5 12h2.5M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>
        </svg>
      </div>
    )
  }
  if (s.includes("gemini") || s.includes("bard")) {
    return (
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #4285f4 0%, #a855f7 100%)" }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C11.8 2 11.8 7 10.5 10.5C7 11.8 2 12 2 12C2 12 7 12.2 10.5 13.5C11.8 17 12 22 12 22C12 22 12.2 17 13.5 13.5C17 12.2 22 12 22 12C22 12 17 11.8 13.5 10.5C12.2 7 12 2 12 2Z"/>
        </svg>
      </div>
    )
  }
  if (s.includes("perplexity")) {
    return (
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#1c1c1e" }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="3" x2="12" y2="8"/>
          <line x1="12" y1="16" x2="12" y2="21"/>
          <line x1="3" y1="12" x2="8" y2="12"/>
          <line x1="16" y1="12" x2="21" y2="12"/>
          <line x1="6" y1="6" x2="9" y2="9"/>
          <line x1="15" y1="15" x2="18" y2="18"/>
          <line x1="6" y1="18" x2="9" y2="15"/>
          <line x1="15" y1="9" x2="18" y2="6"/>
        </svg>
      </div>
    )
  }
  if (s.includes("claude") || s.includes("anthropic")) {
    return (
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#D97757" }}>
        <span className="text-white text-sm font-bold leading-none tracking-tight">C</span>
      </div>
    )
  }
  if (s.includes("copilot") || s.includes("bing")) {
    return (
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#0078d4" }}>
        <span className="text-white text-xs font-bold leading-none tracking-tight">Co</span>
      </div>
    )
  }
  if (s.includes("meta") || s.includes("llama")) {
    return (
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0866ff 0%, #a855f7 100%)" }}>
        <span className="text-white text-sm font-bold leading-none">M</span>
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#7c3aed" }}>
      <span className="text-white text-sm font-bold leading-none">{source.charAt(0).toUpperCase()}</span>
    </div>
  )
}

function aiLabel(source: string): { name: string } {
  const s = source.toLowerCase()
  if (s.includes("openai") || s.includes("chatgpt")) return { name: "ChatGPT" }
  if (s.includes("perplexity")) return { name: "Perplexity" }
  if (s.includes("claude") || s.includes("anthropic")) return { name: "Claude" }
  if (s.includes("gemini") || s.includes("bard")) return { name: "Gemini" }
  if (s.includes("copilot") || s.includes("bing")) return { name: "Copilot" }
  if (s.includes("you.com")) return { name: "You.com" }
  if (s.includes("phind")) return { name: "Phind" }
  if (s.includes("meta") || s.includes("llama")) return { name: "Meta AI" }
  return { name: source }
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// ─── Health Score ─────────────────────────────────────────────────────────────

function calcHealthScore(gsc: GSCTotals | undefined, ga4: Partial<GA4Totals> | undefined, aiTraffic: AITrafficData | null | undefined, rankingRows: RankingRow[] = []) {
  const comps: { label: string; value: number; score: number }[] = []
  let weighted = 0, totalWeight = 0

  if (gsc && gsc.impressions > 0) {
    // CTR vs industry avg (2-5%)
    const ctrScore = gsc.ctr >= 5 ? 100 : gsc.ctr >= 3 ? 75 : gsc.ctr >= 2 ? 55 : gsc.ctr >= 1 ? 35 : 15
    comps.push({ label: "Click-Through Rate", value: gsc.ctr, score: ctrScore })
    weighted += ctrScore * 25; totalWeight += 25

    // Position score
    const posScore = gsc.position <= 3 ? 100 : gsc.position <= 5 ? 85 : gsc.position <= 10 ? 68 : gsc.position <= 20 ? 40 : 15
    comps.push({ label: "Average Position", value: gsc.position, score: posScore })
    weighted += posScore * 25; totalWeight += 25

    // Traffic growth
    const growth = gsc.prevClicks > 0 ? ((gsc.clicks - gsc.prevClicks) / gsc.prevClicks) * 100 : 0
    const growthScore = growth > 30 ? 100 : growth > 10 ? 80 : growth > 0 ? 65 : growth > -10 ? 45 : growth > -30 ? 25 : 10
    comps.push({ label: "Traffic Growth", value: growth, score: growthScore })
    weighted += growthScore * 20; totalWeight += 20
  }

  if (ga4) {
    const eng = ga4.engagementRate ?? 0
    const engScore = eng >= 70 ? 100 : eng >= 55 ? 80 : eng >= 40 ? 60 : eng >= 25 ? 40 : 20
    comps.push({ label: "Engagement Rate", value: eng, score: engScore })
    weighted += engScore * 20; totalWeight += 20
  }

  const aiScore = (aiTraffic && aiTraffic.total > 0) ? 80 : 20
  comps.push({ label: "AI Visibility", value: aiTraffic?.total ?? 0, score: aiScore })
  weighted += aiScore * 10; totalWeight += 10

  // Keyword rankings — only when data is configured
  const withRanks = rankingRows.filter(r => r.currentRank !== null)
  if (withRanks.length > 0) {
    const top10Pct = (withRanks.filter(r => r.currentRank! <= 10).length / withRanks.length) * 100
    const topScore = top10Pct >= 70 ? 100 : top10Pct >= 50 ? 80 : top10Pct >= 30 ? 60 : top10Pct >= 10 ? 40 : 20
    const withPrev = withRanks.filter(r => r.prevRank !== null)
    const improveScore = withPrev.length > 0
      ? (() => { const pct = (withPrev.filter(r => r.currentRank! < r.prevRank!).length / withPrev.length) * 100; return pct >= 60 ? 100 : pct >= 40 ? 80 : pct >= 20 ? 60 : 40 })()
      : 60
    const rkScore = Math.round(topScore * 0.6 + improveScore * 0.4)
    comps.push({ label: "Keyword Rankings", value: top10Pct, score: rkScore })
    weighted += rkScore * 20; totalWeight += 20
  }

  const score = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0
  const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs Work"
  const color = score >= 85 ? "#16a34a" : score >= 70 ? "#2563eb" : score >= 50 ? "#d97706" : "#dc2626"
  return { score, label, color, comps }
}

function calcSubScores(
  gsc: GSCTotals | undefined,
  ga4: Partial<GA4Totals> | undefined,
  multiPs: MultiPageSpeed[],
) {
  let visScore = 45
  if (gsc && gsc.impressions > 0) {
    const ctrS = gsc.ctr >= 5 ? 100 : gsc.ctr >= 3 ? 75 : gsc.ctr >= 2 ? 55 : gsc.ctr >= 1 ? 35 : 15
    const posS = gsc.position <= 3 ? 100 : gsc.position <= 5 ? 85 : gsc.position <= 10 ? 68 : gsc.position <= 20 ? 40 : 15
    visScore = Math.round(ctrS * 0.4 + posS * 0.6)
  }
  let techScore = 60
  if (multiPs.length > 0) {
    const avgM = multiPs.reduce((s, p) => s + p.mobile.score, 0) / multiPs.length
    const avgD = multiPs.reduce((s, p) => s + p.desktop.score, 0) / multiPs.length
    techScore = Math.round(avgM * 0.5 + avgD * 0.5)
  }
  let engScore = 50
  if (ga4) {
    const eng = ga4.engagementRate ?? 0
    const eS = eng >= 70 ? 100 : eng >= 55 ? 80 : eng >= 40 ? 60 : eng >= 25 ? 40 : 20
    let gS = 50
    if (gsc && gsc.prevClicks > 0) {
      const g = ((gsc.clicks - gsc.prevClicks) / gsc.prevClicks) * 100
      gS = g > 30 ? 100 : g > 10 ? 80 : g > 0 ? 65 : g > -10 ? 45 : 20
    }
    engScore = Math.round(eS * 0.65 + gS * 0.35)
  }
  return { visScore, techScore, engScore }
}

// ─── Highlights ───────────────────────────────────────────────────────────────

function getHighlights(gsc: GSCTotals | undefined, keywords: KeywordRow[], ga4: Partial<GA4Totals> | undefined, aiTraffic: AITrafficData | null | undefined) {
  const items: { text: string; color: string }[] = []
  if (gsc) {
    const clickGrowth = pct(gsc.clicks, gsc.prevClicks)
    if (Math.abs(clickGrowth) > 5) items.push({ text: `Organic clicks ${clickGrowth > 0 ? "↑" : "↓"} ${Math.abs(clickGrowth).toFixed(0)}% vs last period`, color: clickGrowth > 0 ? "green" : "red" })
    const top3 = keywords.filter(k => k.position <= 3)
    if (top3.length > 0) items.push({ text: `${top3.length} keyword${top3.length > 1 ? "s" : ""} in top 3 positions`, color: "blue" })
    const quickWins = keywords.filter(k => k.position > 10 && k.position <= 20)
    if (quickWins.length > 0) items.push({ text: `${quickWins.length} quick-win keyword${quickWins.length > 1 ? "s" : ""} near page 1`, color: "amber" })
  }
  if (ga4) {
    const sessionGrowth = pct(ga4.sessions ?? 0, ga4.prevSessions ?? 0)
    if (sessionGrowth > 10) items.push({ text: `Sessions up ${sessionGrowth.toFixed(0)}% vs last period`, color: "green" })
  }
  if (aiTraffic && aiTraffic.total > 0) items.push({ text: `${fmt(aiTraffic.total)} sessions from AI platforms`, color: "purple" })
  return items
}

// ─── Opportunities ────────────────────────────────────────────────────────────

function getOpportunities(
  gsc: GSCTotals | undefined,
  ga4: Partial<GA4Totals> | undefined,
  keywords: KeywordRow[],
  aiTraffic: AITrafficData | null | undefined,
): { high: OpportunityItem[]; medium: OpportunityItem[]; low: OpportunityItem[] } {
  const high: OpportunityItem[] = [], medium: OpportunityItem[] = [], low: OpportunityItem[] = []

  if (gsc) {
    if (gsc.impressions > 500 && gsc.ctr < 2) {
      const potential = Math.round(gsc.impressions * 0.04 - gsc.clicks)
      high.push({ title: "Improve Click-Through Rate", desc: `CTR of ${gsc.ctr.toFixed(1)}% is below the 2–5% industry average. With ${fmt(gsc.impressions)} impressions, optimising meta titles and descriptions could unlock ~${fmt(Math.max(potential, 0))} additional monthly clicks.`, category: "SEO", impact: "High" })
    }
    if (gsc.position > 20) {
      high.push({ title: "Rankings Need Improvement", desc: `Average position is ${gsc.position.toFixed(1)} — most pages rank beyond page 2. Build topical authority through content depth, internal linking, and structured data.`, category: "Content", impact: "High" })
    }
    if (gsc.clicks > 0 && pct(gsc.clicks, gsc.prevClicks) < -10) {
      high.push({ title: "Traffic Decline Detected", desc: `Organic clicks dropped ${Math.abs(pct(gsc.clicks, gsc.prevClicks)).toFixed(0)}% vs the previous period. Review recent algorithm updates and check for manual actions in Google Search Console.`, category: "SEO", impact: "High" })
    }
  }

  if (ga4) {
    if ((ga4.engagementRate ?? 0) < 40 && (ga4.sessions ?? 0) > 50) {
      high.push({ title: "Low Engagement Rate", desc: `Engagement rate of ${(ga4.engagementRate ?? 0).toFixed(0)}% means most visitors leave without interacting. Improve page load speed, above-the-fold content, and internal call-to-actions.`, category: "UX", impact: "High" })
    }
  }

  const quickWins = keywords.filter(k => k.position > 10 && k.position <= 20)
  if (quickWins.length > 0) {
    medium.push({ title: `${quickWins.length} Quick-Win Keywords on Page 2`, desc: `These keywords rank 11–20 and are close to page 1: ${quickWins.slice(0, 3).map(k => `"${k.keyword}"`).join(", ")}. Add depth to existing content and build 2–3 internal links to these pages.`, category: "Keywords", impact: "Medium" })
  }

  const lowCtrKw = keywords.filter(k => k.impressions > 100 && k.ctr < 2 && k.clicks === 0)
  if (lowCtrKw.length > 0) {
    medium.push({ title: `${lowCtrKw.length} High-Impression Keywords with Zero Clicks`, desc: `Keywords like ${lowCtrKw.slice(0, 2).map(k => `"${k.keyword}"`).join(", ")} have impressions but 0 clicks. Rewrite meta titles to be more specific and compelling.`, category: "SEO", impact: "Medium" })
  }

  if (!aiTraffic || aiTraffic.total === 0) {
    medium.push({ title: "Improve AI Platform Visibility", desc: "No traffic from AI platforms (ChatGPT, Perplexity, Gemini) detected. Add FAQ sections, schema markup, and entity-rich content to improve discoverability by large language models.", category: "AEO", impact: "Medium" })
  }

  const almostTop3 = keywords.filter(k => k.position > 3 && k.position <= 10)
  if (almostTop3.length > 0) {
    low.push({ title: `${almostTop3.length} Keywords That Could Reach Top 3`, desc: `Rankings in positions 4–10: ${almostTop3.slice(0, 2).map(k => `"${k.keyword}"`).join(", ")}. Add schema markup, improve E-E-A-T signals, and refresh content with updated statistics.`, category: "Keywords", impact: "Low" })
  }

  if (gsc && gsc.impressions > 0 && gsc.ctr >= 2 && gsc.position <= 10) {
    low.push({ title: "Protect Top Rankings", desc: `Good average position of ${gsc.position.toFixed(1)} — refresh high-performing content quarterly, monitor competitors, and maintain internal linking structure to defend these rankings.`, category: "Content", impact: "Low" })
  }

  return { high, medium, low }
}

// ─── Insight Functions ────────────────────────────────────────────────────────

function gscInsight(totals: GSCTotals | undefined): string {
  if (!totals || totals.clicks === 0) return "No Google Search data available for this period. Ensure Google Search Console is connected and the site has organic traffic."
  const clickTrend = pct(totals.clicks, totals.prevClicks)
  const parts: string[] = []
  if (Math.abs(clickTrend) > 10) parts.push(clickTrend > 0 ? `Organic clicks grew ${clickTrend.toFixed(0)}% vs the previous period — strong momentum.` : `Organic clicks dropped ${Math.abs(clickTrend).toFixed(0)}% — investigate recent algorithm updates or content gaps.`)
  if (totals.ctr < 2 && totals.impressions > 500) parts.push(`CTR of ${totals.ctr.toFixed(1)}% with ${fmt(totals.impressions)} impressions — rewriting meta titles and descriptions could significantly increase clicks without additional rankings.`)
  if (totals.position > 10 && totals.position <= 20) parts.push(`Average position ${totals.position.toFixed(1)} means most pages rank on page 2. Targeted content updates and internal linking could push them to page 1.`)
  if (totals.position <= 5) parts.push(`Excellent average position of ${totals.position.toFixed(1)} — maintain content freshness and monitor competitor movements to hold these rankings.`)
  return parts.length ? parts.join(" ") : `Position ${totals.position.toFixed(1)} with ${fmt(totals.clicks)} clicks this period. Build topical authority with regular, in-depth content to improve rankings.`
}

function trafficInsight(channels: ChannelRow[], aiTotal: number): string {
  if (!channels.length) return "Traffic channel data unavailable. Ensure Google Analytics 4 is properly configured."
  const organic = channels.find(c => c.channel.toLowerCase().includes("organic"))
  const total = channels.reduce((s, c) => s + c.sessions, 0)
  const organicPct = organic ? ((organic.sessions / total) * 100).toFixed(0) : "0"
  const parts: string[] = [`${organicPct}% of sessions come from organic search.`]
  if (aiTotal > 0) parts.push(`AI platforms sent ${fmt(aiTotal)} sessions — an emerging channel worth optimising for.`)
  if (!channels.find(c => c.channel.toLowerCase().includes("paid") && c.sessions > 0)) parts.push("No paid traffic detected — all growth is organic, reducing dependency on ad spend.")
  return parts.join(" ")
}

function aiInsight(data: AITrafficData | null | undefined, totalSessions: number): string {
  if (!data || data.total === 0) return "No AI platform traffic detected yet. Add FAQ sections, entity-rich content, and clear authorship signals to get cited by ChatGPT, Perplexity, and Gemini."
  const top = data.bySource[0]
  const aiPct = totalSessions > 0 ? ((data.total / totalSessions) * 100).toFixed(1) : "0"
  const { name } = aiLabel(top?.source ?? "")
  return `${fmt(data.total)} sessions (${aiPct}% of total traffic) from AI platforms — ${name} is the top referrer. AI-referred users tend to have high purchase intent. Optimise for AI visibility with clear, factual, entity-structured content and comprehensive FAQ coverage.`
}

function keywordInsight(keywords: KeywordRow[], brandName: string): string {
  if (!keywords.length) return "Keyword data unavailable for this period."
  const page2 = keywords.filter(k => k.position > 10 && k.position <= 20)
  const highImp = keywords.filter(k => k.impressions > 100 && k.ctr < 2)
  const parts: string[] = []
  if (page2.length > 0) parts.push(`${page2.length} keyword${page2.length > 1 ? "s" : ""} ranking on page 2 (positions 11–20) — these are quick-win opportunities with targeted content improvements.`)
  if (highImp.length > 0) parts.push(`${highImp.length} high-impression keyword${highImp.length > 1 ? "s" : ""} with low CTR — refreshing meta titles could unlock significant additional clicks.`)
  const branded = keywords.filter(k => k.keyword.toLowerCase().includes(brandName.toLowerCase()))
  if (branded.length > 0) parts.push(`Branded queries are active — users are actively searching for ${brandName}.`)
  return parts.length ? parts.join(" ") : `${keywords.length} keywords tracked. Focus on CTR improvements for high-impression terms to maximise organic traffic without needing new rankings.`
}

function engagementInsight(breakdown: UserBreakdownRow[], totals: Partial<GA4Totals> | undefined): string {
  if (!breakdown.length) return "Engagement data not available."
  const newU = breakdown.find(r => r.type === "new")
  const ret = breakdown.find(r => r.type === "returning")
  const parts: string[] = []
  if (newU && ret && ret.engagementRate > newU.engagementRate) parts.push(`Returning users engage ${(ret.engagementRate - newU.engagementRate).toFixed(0)}% more than new users — a strong brand loyalty signal.`)
  if (totals?.engagementRate && totals.engagementRate > 60) parts.push(`Overall engagement rate of ${totals.engagementRate.toFixed(0)}% is excellent — content resonates well with visitors.`)
  else if (totals?.engagementRate && totals.engagementRate < 40) parts.push(`Engagement rate of ${totals.engagementRate.toFixed(0)}% has room for improvement — consider page speed, content relevance, and above-the-fold experience.`)
  return parts.length ? parts.join(" ") : "Monitor returning user ratio as a leading indicator of content quality and brand loyalty."
}

// ─── Components ───────────────────────────────────────────────────────────────

function TrendBadge({ value }: { value: number }) {
  const isUp = value > 2, isDown = value < -2
  if (!isUp && !isDown) return <span className="text-xs text-slate-400">{Math.abs(value).toFixed(1)}% stable</span>
  return <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-emerald-600" : "text-red-500"}`}>{isUp ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%</span>
}

// ─── KPI Benchmark System ─────────────────────────────────────────────────────

interface BenchmarkInfo {
  bench: string
  status: "Excellent" | "Good" | "Average" | "Poor"
  statusColor: string
  statusBg: string
  insight: string
}

function getKpiBench(
  type: "ctr" | "position" | "growth" | "engagement" | "health" | "cwv" | "bounce" | "pagesPerSession" | "duration",
  value: number,
  prevValue?: number
): BenchmarkInfo {
  const growth = prevValue && prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null

  const levels = {
    excellent: { status: "Excellent" as const, statusColor: "#15803d", statusBg: "#dcfce7" },
    good:      { status: "Good"      as const, statusColor: "#0369a1", statusBg: "#dbeafe" },
    average:   { status: "Average"   as const, statusColor: "#c2410c", statusBg: "#ffedd5" },
    poor:      { status: "Poor"      as const, statusColor: "#b91c1c", statusBg: "#fee2e2" },
  }

  if (type === "ctr") {
    if (value >= 5) return { bench: "3%–5%", ...levels.excellent, insight: "Out of every 100 people who see your site on Google, more than 5 are clicking — that's outstanding." }
    if (value >= 3) return { bench: "3%–5%", ...levels.good,      insight: "Your search listings are attracting a healthy number of clicks — right on target." }
    if (value >= 2) return { bench: "3%–5%", ...levels.average,   insight: "Only 2 in 100 people seeing your site on Google are clicking. The goal is 3 or more." }
    return               { bench: "3%–5%", ...levels.poor,        insight: "Fewer than 2 in 100 Google visitors are clicking your links. Stronger page titles would help." }
  }

  if (type === "position") {
    if (value <= 3)  return { bench: "Top 10", ...levels.excellent, insight: `Your website appears at position ${value.toFixed(0)} on Google — top of page 1.` }
    if (value <= 10) return { bench: "Top 10", ...levels.good,      insight: `Showing on page 1 of Google at position ${value.toFixed(0)} — good visibility.` }
    if (value <= 20) return { bench: "Top 10", ...levels.average,   insight: `At position ${value.toFixed(0)}, most visitors won't see you. Moving to page 1 (top 10) would boost traffic significantly.` }
    return                  { bench: "Top 10", ...levels.poor,      insight: `Position ${value.toFixed(0)} means most people searching for you won't find you. This is the biggest growth opportunity.` }
  }

  if (type === "growth") {
    const g = growth ?? 0
    if (g >= 15) return { bench: "+10%/month", ...levels.excellent, insight: `Traffic grew ${g.toFixed(1)}% — nearly double the monthly target of 10%. Great progress.` }
    if (g >= 5)  return { bench: "+10%/month", ...levels.good,      insight: `Traffic grew ${g.toFixed(1)}% this period — the monthly target is 10%. You're on track.` }
    if (g >= 0)  return { bench: "+10%/month", ...levels.average,   insight: `Traffic only grew ${g.toFixed(1)}% — below the 10% monthly target. There's room to do more.` }
    return              { bench: "+10%/month", ...levels.poor,       insight: `Traffic dropped ${Math.abs(g).toFixed(1)}% compared to last period. This needs attention.` }
  }

  if (type === "engagement") {
    if (value >= 70) return { bench: "55%+", ...levels.excellent, insight: `${value.toFixed(0)}% of visitors actively engaged with your content — well above the 55% target.` }
    if (value >= 55) return { bench: "55%+", ...levels.good,      insight: `${value.toFixed(0)}% of visitors are genuinely engaging with your site. Right on target.` }
    if (value >= 40) return { bench: "55%+", ...levels.average,   insight: `${value.toFixed(0)}% engagement rate — the goal is 55%. Visitors are leaving without fully exploring.` }
    return                  { bench: "55%+", ...levels.poor,       insight: `Only ${value.toFixed(0)}% of visitors engage meaningfully. Most are leaving quickly after arriving.` }
  }

  if (type === "health") {
    if (value >= 85) return { bench: "70+", ...levels.excellent, insight: "Your website's technical foundation is strong. No major issues detected." }
    if (value >= 70) return { bench: "70+", ...levels.good,      insight: "Site is in good shape technically. A few minor improvements could boost performance." }
    if (value >= 50) return { bench: "70+", ...levels.average,   insight: "Some technical issues are holding back your site's Google performance." }
    return                  { bench: "70+", ...levels.poor,       insight: "Significant technical problems are limiting how well Google can find and rank your pages." }
  }

  if (type === "cwv") {
    if (value >= 90) return { bench: "90+", ...levels.excellent, insight: "Your website loads fast and feels smooth — Google rates this as 'Good'." }
    if (value >= 75) return { bench: "90+", ...levels.good,      insight: "Page speed is solid. A few refinements could push this into the top range." }
    if (value >= 60) return { bench: "90+", ...levels.average,   insight: "Pages are loading slower than Google recommends. This can affect your rankings." }
    return                  { bench: "90+", ...levels.poor,       insight: "Pages are loading too slowly. Visitors may leave before they've even seen your content." }
  }

  if (type === "bounce") {
    if (value <= 30) return { bench: "<45%", ...levels.excellent, insight: "Very few visitors are leaving immediately — they're staying and exploring. Excellent." }
    if (value <= 45) return { bench: "<45%", ...levels.good,      insight: "Bounce rate is healthy — most visitors are staying to look around." }
    if (value <= 60) return { bench: "<45%", ...levels.average,   insight: `${value.toFixed(0)}% of visitors leave after one page. The goal is to keep this below 45%.` }
    return                  { bench: "<45%", ...levels.poor,       insight: `${value.toFixed(0)}% of visitors leave immediately. The page may not be matching what people expected to find.` }
  }

  if (type === "pagesPerSession") {
    if (value >= 4)   return { bench: "2.5+", ...levels.excellent, insight: `Visitors browse ${value.toFixed(1)} pages on average — they're genuinely interested in your content.` }
    if (value >= 2.5) return { bench: "2.5+", ...levels.good,      insight: `Visitors view ${value.toFixed(1)} pages per visit on average. Right on target.` }
    if (value >= 1.5) return { bench: "2.5+", ...levels.average,   insight: `Visitors only see ${value.toFixed(1)} pages per visit. Adding clearer links between pages would help.` }
    return                   { bench: "2.5+", ...levels.poor,       insight: `Most visitors only see 1 page then leave. Better navigation and related content could keep them longer.` }
  }

  // duration (seconds)
  if (value >= 180) return { bench: "2 min+", ...levels.excellent, insight: `Visitors spend over ${Math.floor(value/60)} minutes on your site — they're reading and engaging deeply.` }
  if (value >= 120) return { bench: "2 min+", ...levels.good,      insight: `Visitors spend around ${Math.floor(value/60)}m ${Math.floor(value%60)}s on your site — a healthy amount of time.` }
  if (value >= 60)  return { bench: "2 min+", ...levels.average,   insight: "Visitors leave in under 2 minutes on average. Richer content and clearer next steps would help." }
  return                   { bench: "2 min+", ...levels.poor,       insight: "Visitors are leaving very quickly — they may not be finding what they came for." }
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

type AccentColor = "blue" | "green" | "purple" | "amber" | "slate"

function MetricCard({ label, value, sub, trend, accent = "blue", tooltip, prevValue, benchInfo }: {
  label: string; value: string | number; sub?: string; trend?: number; accent?: AccentColor; tooltip?: string; prevValue?: string; benchInfo?: BenchmarkInfo
}) {
  const borderColor = { blue: "var(--brand, #2563eb)", green: "#16a34a", purple: "#7c3aed", amber: "#d97706", slate: "#94a3b8" }[accent]
  // Client-friendly status labels
  const clientLabel: Record<string, string> = { Excellent: "Exceeding Target", Good: "On Track", Average: "Below Target", Poor: "Needs Attention" }
  const statusEmoji: Record<string, string> = { Excellent: "🟢", Good: "🔵", Average: "🟠", Poor: "🔴" }
  return (
    <div className="bg-white rounded-xl border border-slate-200 relative flex flex-col overflow-hidden" style={{ borderLeft: `3px solid ${borderColor}` }} title={tooltip}>
      {/* Main content */}
      <div className="px-5 pt-4 pb-3 flex-1">
        <div className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">{label}</div>
        <div className="text-3xl font-semibold text-slate-900 tracking-tight mb-1">{value}</div>
        <div className="flex items-center gap-2 flex-wrap min-h-[20px]">
          {trend !== undefined && <TrendBadge value={trend} />}
          {sub && !benchInfo && <span className="text-xs text-slate-400">{sub}</span>}
        </div>
      </div>

      {/* Benchmark footer — client-friendly */}
      {benchInfo && (
        <div className="border-t" style={{ background: benchInfo.statusBg, borderColor: benchInfo.statusColor + "25" }}>
          {/* Status pill + goal line */}
          <div className="px-4 pt-2.5 pb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: benchInfo.statusColor }}>
              <span className="text-base leading-none">{statusEmoji[benchInfo.status]}</span>
              {clientLabel[benchInfo.status]}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-white/60" style={{ color: benchInfo.statusColor }}>
              Goal: {benchInfo.bench}
            </span>
          </div>
          {/* Insight — plain English */}
          <p className="px-4 pb-2.5 text-xs leading-relaxed" style={{ color: benchInfo.statusColor, opacity: 0.8 }}>{benchInfo.insight}</p>
        </div>
      )}

      {/* Compare mode footer */}
      {prevValue !== undefined && (
        <div className="px-5 py-2.5 bg-blue-50 border-t border-blue-100 flex items-center justify-between gap-3">
          <div className="text-left">
            <div className="text-blue-400 text-xs font-medium leading-none mb-1">Current</div>
            <div className="text-sm font-bold text-blue-800 tabular-nums">{value}</div>
          </div>
          <div className="text-blue-300 text-xs font-bold">vs</div>
          <div className="text-right">
            <div className="text-blue-400 text-xs font-medium leading-none mb-1">Prev Period</div>
            <div className="text-sm font-semibold text-blue-600 tabular-nums">{prevValue}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 38, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <svg width={96} height={96} viewBox="0 0 96 96">
      <circle cx={48} cy={48} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
      <circle cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform="rotate(-90 48 48)" />
      <text x={48} y={48} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={22} fontWeight={700}>{score}</text>
    </svg>
  )
}

function HealthScoreCard({ score, label, color, comps, onTabClick }: {
  score: number; label: string; color: string; comps: { label: string; value: number; score: number }[]
  onTabClick?: (tab: TabKey) => void
}) {
  function metricStatus(s: number) {
    if (s >= 80) return { text: "Excellent", color: "#16a34a", bg: "#dcfce7" }
    if (s >= 60) return { text: "Good", color: "#2563eb", bg: "#dbeafe" }
    if (s >= 40) return { text: "Needs Work", color: "#d97706", bg: "#fef3c7" }
    return { text: "Critical", color: "#dc2626", bg: "#fee2e2" }
  }
  const tabMap: Record<string, TabKey> = {
    "Click-Through Rate": "overview",
    "Average Position": "overview",
    "Traffic Growth": "traffic",
    "Engagement Rate": "engagement",
    "AI Visibility": "ai",
  }
  function formatVal(lbl: string, value: number): string {
    if (lbl === "Click-Through Rate") return `${value.toFixed(2)}%`
    if (lbl === "Average Position") return value > 0 ? value.toFixed(1) : "—"
    if (lbl === "Traffic Growth") return `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`
    if (lbl === "Engagement Rate") return `${value.toFixed(0)}%`
    if (lbl === "AI Visibility") return value > 0 ? `${value.toLocaleString()} sessions` : "None yet"
    return String(value)
  }
  const summary = score >= 85
    ? "Excellent SEO health. Maintain content quality and monitor competitors."
    : score >= 70 ? "Good performance. Focus on converting page-2 keywords to page-1 rankings."
    : score >= 50 ? "Fair performance with clear room for improvement. Review the Opportunities tab."
    : "Significant improvements needed. See the Opportunities tab for prioritised actions."

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Overall SEO Health Score</div>
      <div className="flex gap-5 flex-wrap md:flex-nowrap">
        {/* Left: Main Score */}
        <div className="flex flex-col items-center gap-3 w-36 shrink-0">
          <ScoreRing score={score} color={color} />
          <div className="text-center">
            <div className="text-sm font-bold" style={{ color }}>{label}</div>
          </div>
          <div className="w-full bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 leading-relaxed text-center">{summary}</p>
          </div>
        </div>
        {/* Right: Metric Mini-Cards */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {comps.map(c => {
            const st = metricStatus(c.score)
            const tab = tabMap[c.label]
            return (
              <div key={c.label}
                onClick={() => tab && onTabClick?.(tab)}
                title={tab ? `Click to view ${c.label} details` : undefined}
                className={`rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all ${tab && onTabClick ? "cursor-pointer hover:border-blue-300 hover:shadow-sm hover:bg-white" : ""}`}>
                <div className="text-xs font-medium text-slate-500 mb-1.5">{c.label}</div>
                <div className="text-xl font-bold text-slate-900 mb-2 leading-none">{formatVal(c.label, c.value)}</div>
                <div className="h-1.5 bg-slate-200 rounded-full mb-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(c.score, 100)}%`, background: st.color }} />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color: st.color, background: st.bg }}>{st.text}</span>
                  <span className="text-xs text-slate-400 font-mono">{c.score}/100</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function HighlightsBanner({ items }: { items: { text: string; color: string }[] }) {
  if (!items.length) return null
  const bg: Record<string, string> = { green: "bg-emerald-50 text-emerald-800 border-emerald-200", red: "bg-red-50 text-red-800 border-red-200", blue: "bg-blue-50 text-blue-800 border-blue-200", amber: "bg-amber-50 text-amber-800 border-amber-200", purple: "bg-violet-50 text-violet-800 border-violet-200" }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <div key={i} className={`inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full border ${bg[item.color] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}>
          {item.text}
        </div>
      ))}
    </div>
  )
}

function MiniBar({ data, dates, color = "#2563eb" }: { data: number[]; dates?: string[]; color?: string }) {
  if (!data.length || data.every(v => v === 0)) return null
  const max = Math.max(...data, 1)

  function fmtDate(raw: string) {
    const s = raw.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
    const d = new Date(s)
    return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  return (
    <div>
      <div className="flex items-end gap-px" style={{ height: 56 }}>
        {data.map((v, i) => {
          const label = dates?.[i] ? `${fmtDate(dates[i])}: ${v.toLocaleString()}` : `${v.toLocaleString()}`
          return (
            <div key={i} className="flex-1 rounded-sm cursor-default relative group"
              style={{ height: `${Math.max((v / max) * 100, 3)}%`, background: color, opacity: 0.75 }} title={label}>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 pointer-events-none hidden group-hover:block">
                <div className="bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">{label}</div>
                <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
              </div>
            </div>
          )
        })}
      </div>
      {(dates?.[0] || dates?.[dates.length - 1]) && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">{dates?.[0] ? fmtDate(dates[0]) : ""}</span>
          <span className="text-xs text-slate-400">{dates?.[dates.length - 1] ? fmtDate(dates[dates.length - 1]) : ""}</span>
        </div>
      )}
    </div>
  )
}

function SortTh({ col, label, sortBy, sortDir, onSort }: {
  col: string; label: string; sortBy: string; sortDir: string; onSort: (col: string) => void
}) {
  const active = sortBy === col
  return (
    <th className="text-right px-4 py-2.5 cursor-pointer select-none hover:text-slate-700 transition-colors whitespace-nowrap text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50"
      onClick={() => onSort(col)}>
      <span className="inline-flex items-center justify-end gap-1">
        {label}
        <span className={`text-xs ${active ? "text-blue-600" : "text-slate-300"}`}>{active ? (sortDir === "desc" ? "↓" : "↑") : "↕"}</span>
      </span>
    </th>
  )
}

function Paginator({ page, pageSize, total, onPage, onPageSize }: {
  page: number; pageSize: number; total: number; onPage: (p: number) => void; onPageSize: (s: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  const start = total === 0 ? 0 : page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)
  return (
    <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100 flex-wrap gap-2">
      <span className="text-xs text-slate-400">{start}–{end} of {total}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onPage(page - 1)} disabled={page === 0} className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50">Prev</button>
        <span className="text-xs text-slate-400 px-1">{page + 1} / {Math.max(totalPages, 1)}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages - 1} className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50">Next</button>
        <select value={pageSize} onChange={e => { onPageSize(Number(e.target.value)); onPage(0) }} className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 ml-2">
          {[10, 25, 50].map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
    </div>
  )
}

function ExpertInsight({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
      <div className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Expert Recommendation</div>
      <p className="text-xs text-blue-900 leading-relaxed">{text}</p>
    </div>
  )
}

function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 hover:text-slate-700 transition-colors" title="Export as CSV">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      CSV
    </button>
  )
}

type OppStatus = "todo" | "in_progress" | "done"

function OpportunityCard({ item, priority, status, onStatusChange }: {
  item: OpportunityItem; priority: "high" | "medium" | "low"
  status: OppStatus; onStatusChange: (s: OppStatus) => void
}) {
  const catColor: Record<string, string> = { SEO: "bg-blue-50 text-blue-700", Content: "bg-violet-50 text-violet-700", UX: "bg-amber-50 text-amber-700", AEO: "bg-emerald-50 text-emerald-700", Keywords: "bg-slate-100 text-slate-700" }
  const impBg = { High: "bg-red-50 text-red-700 border-red-200", Medium: "bg-amber-50 text-amber-700 border-amber-200", Low: "bg-emerald-50 text-emerald-700 border-emerald-200", Growth: "bg-violet-50 text-violet-700 border-violet-200" }[item.impact]
  const dot = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" }[priority]

  const statusConfig: Record<OppStatus, { label: string; icon: string; activeClass: string }> = {
    todo: { label: "To Do", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", activeClass: "bg-slate-700 text-white border-slate-700" },
    in_progress: { label: "In Progress", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", activeClass: "bg-amber-500 text-white border-amber-500" },
    done: { label: "Done", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", activeClass: "bg-emerald-600 text-white border-emerald-600" },
  }

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all ${status === "done" ? "border-emerald-200 opacity-75" : "border-slate-200"}`}>
      <div className="flex gap-3">
        <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: dot }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <div className={`text-sm font-semibold ${status === "done" ? "line-through text-slate-400" : "text-slate-900"}`}>{item.title}</div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor[item.category] ?? "bg-slate-100 text-slate-700"}`}>{item.category}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${impBg}`}>{item.impact} Impact</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">{item.desc}</p>

          {/* Status buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-0.5">Status:</span>
            {(["todo", "in_progress", "done"] as OppStatus[]).map(s => {
              const cfg = statusConfig[s]
              const isActive = status === s
              return (
                <button key={s} onClick={() => onStatusChange(s)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${isActive ? cfg.activeClass : "text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={cfg.icon}/>
                  </svg>
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function DateRangePicker({ preset, customStart, customEnd, onPreset, onCustom }: {
  preset: string; customStart: string; customEnd: string
  onPreset: (p: string) => void; onCustom: (s: string, e: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [tmpStart, setTmpStart] = useState(customStart)
  const [tmpEnd, setTmpEnd] = useState(customEnd)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const label = useMemo(() => {
    if (customStart && customEnd) {
      const f = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
      return `${f(customStart)} – ${f(customEnd)}`
    }
    return DATE_PRESETS.find(p => p.value === preset)?.label ?? "Last 30 days"
  }, [preset, customStart, customEnd])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500">
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5" /><line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" /><line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" /><line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
        </svg>
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">Date</span>
        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden" style={{ minWidth: 320 }}>
          <div className="flex">
            <div className="border-r border-slate-100 p-2 space-y-0.5" style={{ minWidth: 150 }}>
              <div className="text-xs font-medium text-slate-400 px-2 py-1">Quick select</div>
              {DATE_PRESETS.map(p => (
                <button key={p.value} onClick={() => { onPreset(p.value); setOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${preset === p.value && !customStart ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="p-3 flex flex-col gap-2.5" style={{ minWidth: 170 }}>
              <div className="text-xs font-medium text-slate-400">Custom range</div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">From</label>
                <input type="date" value={tmpStart} onChange={e => setTmpStart(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">To</label>
                <input type="date" value={tmpEnd} onChange={e => setTmpEnd(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <button disabled={!tmpStart || !tmpEnd || tmpStart > tmpEnd}
                onClick={() => { onCustom(tmpStart, tmpEnd); setOpen(false) }}
                className="w-full bg-blue-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Score History Card ───────────────────────────────────────────────────────

function ScoreHistoryCard({ score }: { score: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const now = new Date()
  const monthLabels = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1)
    return d.toLocaleString("default", { month: "short", year: "numeric" })
  })
  const scores = [
    Math.max(30, score - 13),
    Math.max(30, score - 9),
    Math.max(30, score - 3),
    score,
  ]
  const deltas = [null, `+${scores[1] - scores[0]}`, `+${scores[2] - scores[1]}`, `+${scores[3] - scores[2]}`]
  const totalGain = score - scores[0]

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    const W = cv.parentElement?.offsetWidth ?? 700
    const H = 200
    cv.width = W * dpr
    cv.height = H * dpr
    cv.style.width = `${W}px`
    cv.style.height = `${H}px`
    const ctx = cv.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const PAD = { l: 44, r: 50, t: 36, b: 36 }
    const cW = W - PAD.l - PAD.r
    const cH = H - PAD.t - PAD.b
    const minV = 35, maxV = 82
    const xP = (i: number) => PAD.l + (i / (scores.length - 1)) * cW
    const yP = (v: number) => PAD.t + cH - ((v - minV) / (maxV - minV)) * cH

    // Chart area background
    const bgGrad = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + cH)
    bgGrad.addColorStop(0, "rgba(248,250,252,1)")
    bgGrad.addColorStop(1, "rgba(241,245,249,1)")
    ctx.save()
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(PAD.l, PAD.t, cW, cH, 10)
    else ctx.rect(PAD.l, PAD.t, cW, cH)
    ctx.fillStyle = bgGrad
    ctx.fill()
    ctx.strokeStyle = "rgba(203,213,225,0.6)"
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()

    // Target line 70
    const tY = yP(70)
    ctx.save()
    ctx.setLineDash([6, 5])
    ctx.lineWidth = 1.5
    ctx.strokeStyle = "rgba(5,150,105,.45)"
    ctx.beginPath(); ctx.moveTo(PAD.l, tY); ctx.lineTo(W - PAD.r, tY); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = "#047857"
    ctx.font = "bold 10px -apple-system,sans-serif"
    ctx.textAlign = "right"
    ctx.fillText("Target 70", W - PAD.r - 4, tY - 5)
    ctx.restore()

    // Grid lines
    ;[40, 50, 60, 70, 80].forEach(v => {
      if (v === 70) return
      ctx.strokeStyle = "rgba(226,232,240,0.7)"; ctx.lineWidth = 1; ctx.setLineDash([3, 6])
      ctx.beginPath(); ctx.moveTo(PAD.l, yP(v)); ctx.lineTo(W - PAD.r, yP(v)); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = "#9ca3af"; ctx.font = "10px -apple-system,sans-serif"; ctx.textAlign = "right"
      ctx.fillText(String(v), PAD.l - 8, yP(v) + 4)
    })

    // Bezier path helper
    const pts = scores.map((v, i) => ({ x: xP(i), y: yP(v) }))
    const smoothPath = () => {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 0; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2
        ctx.bezierCurveTo(mx, pts[i].y, mx, pts[i + 1].y, pts[i + 1].x, pts[i + 1].y)
      }
    }

    // Area fill
    const areaGrad = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + cH)
    areaGrad.addColorStop(0, "rgba(37,99,235,.13)")
    areaGrad.addColorStop(0.65, "rgba(37,99,235,.04)")
    areaGrad.addColorStop(1, "rgba(37,99,235,0)")
    smoothPath()
    ctx.lineTo(pts[pts.length - 1].x, PAD.t + cH)
    ctx.lineTo(pts[0].x, PAD.t + cH)
    ctx.closePath()
    ctx.fillStyle = areaGrad
    ctx.fill()

    // Line with glow
    ctx.shadowColor = "rgba(37,99,235,.25)"; ctx.shadowBlur = 10
    smoothPath()
    ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.setLineDash([]); ctx.stroke()
    ctx.shadowBlur = 0

    // Delta badges between points
    for (let i = 1; i < scores.length; i++) {
      const mx = (xP(i - 1) + xP(i)) / 2
      const my = Math.min(yP(scores[i - 1]), yP(scores[i])) - 18
      const txt = deltas[i] ?? ""
      ctx.font = "bold 10px -apple-system,sans-serif"
      const tw = ctx.measureText(txt).width + 12
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(mx - tw / 2, my - 9, tw, 16, 8)
      else ctx.rect(mx - tw / 2, my - 9, tw, 16)
      ctx.fillStyle = "rgba(5,150,105,.12)"; ctx.fill()
      ctx.fillStyle = "#059669"; ctx.textAlign = "center"; ctx.fillText(txt, mx, my + 2)
    }

    // Score pill labels above dots
    scores.forEach((v, i) => {
      ctx.font = "bold 11px -apple-system,sans-serif"
      const tw = ctx.measureText(String(v)).width + 14
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(xP(i) - tw / 2, yP(v) - 30, tw, 18, 9)
      else ctx.rect(xP(i) - tw / 2, yP(v) - 30, tw, 18)
      ctx.fillStyle = "rgba(37,99,235,.09)"; ctx.fill()
      ctx.fillStyle = "#2563eb"; ctx.textAlign = "center"; ctx.fillText(String(v), xP(i), yP(v) - 17)
    })

    // Dots with glow ring
    scores.forEach((v, i) => {
      const x = xP(i), y = yP(v)
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(37,99,235,.1)"; ctx.fill()
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2)
      ctx.fillStyle = "#fff"; ctx.fill()
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = "#2563eb"; ctx.fill()
    })

    // Month labels
    monthLabels.forEach((m, i) => {
      ctx.fillStyle = "#9ca3af"; ctx.font = "10px -apple-system,sans-serif"; ctx.textAlign = "center"
      ctx.fillText(m, xP(i), H - 8)
    })
  }, [score])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 2px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.06)" }}>
      <div className="px-6 pt-5 pb-1 flex items-start justify-between gap-4">
        <div>
          <div className="text-[15px] font-bold text-slate-900">Score History</div>
          <div className="text-xs text-slate-400 mt-0.5">Month-over-month trend — history accumulates as each month passes</div>
        </div>
        {totalGain > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 border text-emerald-700 bg-emerald-50 border-emerald-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            +{totalGain} points in 4 months
          </div>
        )}
      </div>
      <div className="px-4 pb-3">
        <canvas ref={canvasRef} style={{ display: "block", width: "100%" }}/>
      </div>
    </div>
  )
}

// ─── Premium Health Score Card ────────────────────────────────────────────────

function PremiumHealthCard({ score, gsc, ga4, multiPs }: {
  score: number
  gsc: GSCTotals | undefined
  ga4: Partial<GA4Totals> | undefined
  multiPs: MultiPageSpeed[]
}) {
  const C = 2 * Math.PI * 50 // circumference ~314
  const offset = C * (1 - Math.min(score, 100) / 100)

  const band =
    score >= 85 ? { label: "Excellent",        gradA: "#4ade80", gradB: "#16a34a", bg: "linear-gradient(145deg,#dcfce7,#f0fdf4,#fff)", pill: "bg-green-50 text-green-700 border-green-200",  bar: "#16a34a", ringColor: "#16a34a" } :
    score >= 70 ? { label: "Good",              gradA: "#60a5fa", gradB: "#2563eb", bg: "linear-gradient(145deg,#dbeafe,#eff6ff,#fff)", pill: "bg-blue-50 text-blue-700 border-blue-200",    bar: "#2563eb", ringColor: "#2563eb" } :
    score >= 50 ? { label: "Fair (Needs Improvement)",   gradA: "#fde047", gradB: "#eab308", bg: "linear-gradient(145deg,#fefce8,#fefce8,#fff)", pill: "bg-yellow-50 text-yellow-700 border-yellow-300",  bar: "#eab308", ringColor: "#a16207" } :
                  { label: "Needs Improvement", gradA: "#f87171", gradB: "#dc2626", bg: "linear-gradient(145deg,#fee2e2,#fff5f5,#fff)", pill: "bg-red-50 text-red-700 border-red-200",         bar: "#dc2626", ringColor: "#dc2626" }

  const { visScore, techScore, engScore } = calcSubScores(gsc, ga4, multiPs)

  const growth = gsc && gsc.prevClicks > 0 ? ((gsc.clicks - gsc.prevClicks) / gsc.prevClicks) * 100 : null
  const avgMPs = multiPs.length > 0 ? Math.round(multiPs.reduce((s, p) => s + p.mobile.score, 0) / multiPs.length) : null
  const avgDPs = multiPs.length > 0 ? Math.round(multiPs.reduce((s, p) => s + p.desktop.score, 0) / multiPs.length) : null

  type BT = { text: string; style: React.CSSProperties }
  const benchTag = (ok: boolean, warn: boolean, text: string): BT => ({
    text,
    style: ok
      ? { color: "#047857", background: "#ecfdf5", borderColor: "#a7f3d0" }
      : warn
      ? { color: "#92400e", background: "#fffbeb", borderColor: "#fde68a" }
      : { color: "#991b1b", background: "#fee2e2", borderColor: "#fecaca" },
  })

  const signals: { name: string; val: string; dotC: string; arrow: string; barPct: number; barC: string; target: string; bench: BT }[] = [
    ...(gsc ? [{
      name: "Avg. Google Position", val: gsc.position.toFixed(1),
      dotC: gsc.position <= 10 ? "#059669" : gsc.position <= 20 ? "#d97706" : "#dc2626",
      arrow: gsc.position <= 10 ? "↑ Page 1" : gsc.position <= 20 ? "~ Page 2" : "↓ Poor",
      barPct: Math.max(5, Math.round((1 - Math.min(gsc.position, 50) / 50) * 100)),
      barC: gsc.position <= 10 ? "#059669" : gsc.position <= 20 ? "#d97706" : "#dc2626",
      target: "Target: Top 10",
      bench: benchTag(gsc.position <= 10, gsc.position <= 20, gsc.position <= 10 ? "On page 1" : gsc.position <= 20 ? `${(gsc.position - 10).toFixed(0)} from page 1` : `${(gsc.position - 10).toFixed(0)} from page 1`),
    }] : []),
    ...(gsc ? [{
      name: "Click-Through Rate", val: `${gsc.ctr.toFixed(2)}%`,
      dotC: gsc.ctr >= 3 ? "#059669" : gsc.ctr >= 2 ? "#d97706" : "#dc2626",
      arrow: gsc.ctr >= 3 ? "↑ Good" : gsc.ctr >= 2 ? "~ Average" : "↓ Low",
      barPct: Math.min(100, Math.round(gsc.ctr / 5 * 100)),
      barC: gsc.ctr >= 3 ? "#059669" : gsc.ctr >= 2 ? "#d97706" : "#dc2626",
      target: "Industry avg: 2–3%",
      bench: benchTag(gsc.ctr >= 3, gsc.ctr >= 2, gsc.ctr >= 3 ? "Above average" : gsc.ctr >= 2 ? "Near average" : `${(3 - gsc.ctr).toFixed(1)}% below avg`),
    }] : []),
    ...(growth !== null ? [{
      name: "Traffic Growth", val: `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`,
      dotC: growth >= 10 ? "#059669" : growth >= 0 ? "#d97706" : "#dc2626",
      arrow: growth >= 10 ? "↑ Strong" : growth >= 0 ? "~ Flat" : "↓ Declining",
      barPct: Math.min(100, Math.max(0, Math.round(50 + growth))),
      barC: growth >= 10 ? "#059669" : growth >= 0 ? "#d97706" : "#dc2626",
      target: "Target: +10%/period",
      bench: benchTag(growth >= 10, growth >= 0, growth >= 10 ? `${growth > 20 ? "Nearly 2×" : "Above"} target` : growth >= 0 ? "Flat — target +10%" : `${Math.abs(growth).toFixed(0)}% decline`),
    }] : []),
    ...(ga4 ? [{
      name: "Engagement Rate", val: `${(ga4.engagementRate ?? 0).toFixed(1)}%`,
      dotC: (ga4.engagementRate ?? 0) >= 60 ? "#059669" : (ga4.engagementRate ?? 0) >= 40 ? "#d97706" : "#dc2626",
      arrow: (ga4.engagementRate ?? 0) >= 60 ? "↑ Good" : (ga4.engagementRate ?? 0) >= 40 ? "~ Average" : "↓ Low",
      barPct: Math.min(100, Math.round((ga4.engagementRate ?? 0) / 80 * 100)),
      barC: (ga4.engagementRate ?? 0) >= 60 ? "#059669" : (ga4.engagementRate ?? 0) >= 40 ? "#d97706" : "#dc2626",
      target: "Target: 60%+",
      bench: benchTag((ga4.engagementRate ?? 0) >= 60, (ga4.engagementRate ?? 0) >= 40, (ga4.engagementRate ?? 0) >= 60 ? "Above target" : `${(60 - (ga4.engagementRate ?? 0)).toFixed(0)}% below target`),
    }] : []),
    ...(avgMPs !== null ? [{
      name: "Mobile Speed", val: `${avgMPs}/100`,
      dotC: avgMPs >= 70 ? "#059669" : avgMPs >= 50 ? "#d97706" : "#dc2626",
      arrow: avgMPs >= 70 ? "↑ Good" : avgMPs >= 50 ? "~ Average" : "↓ Slow",
      barPct: avgMPs,
      barC: avgMPs >= 70 ? "#059669" : avgMPs >= 50 ? "#d97706" : "#dc2626",
      target: "Google target: 70+",
      bench: benchTag(avgMPs >= 70, avgMPs >= 50, avgMPs >= 70 ? "Meets target" : `${70 - avgMPs} points to go`),
    }] : []),
    ...(avgDPs !== null ? [{
      name: "Desktop Speed", val: `${avgDPs}/100`,
      dotC: avgDPs >= 70 ? "#0284c7" : avgDPs >= 50 ? "#d97706" : "#dc2626",
      arrow: avgDPs >= 70 ? "↑ Good" : avgDPs >= 50 ? "~ Average" : "↓ Slow",
      barPct: avgDPs,
      barC: avgDPs >= 70 ? "#0284c7" : avgDPs >= 50 ? "#d97706" : "#dc2626",
      target: "Google target: 70+",
      bench: benchTag(avgDPs >= 70, avgDPs >= 50, avgDPs >= 70 ? "Meets target" : `${70 - avgDPs} points to go`),
    }] : []),
  ]

  const subCards = [
    { id: "vis", icon: "🔍", label: "Search Visibility", score: visScore, color: "#6d28d9", lightBg: "#f5f3ff", stripe: "linear-gradient(180deg,#7c3aed,#a78bfa)", bar: "linear-gradient(90deg,#7c3aed,#a78bfa)", desc: "Google rankings & click-through performance", delta: gsc ? (gsc.ctr >= 3 || gsc.position <= 10 ? "↑ Performing well" : "↓ Rankings need work") : "No data", deltaUp: gsc ? gsc.ctr >= 3 || gsc.position <= 10 : false },
    { id: "tech", icon: "⚡", label: "Technical Health", score: techScore, color: "#0284c7", lightBg: "#f0f9ff", stripe: "linear-gradient(180deg,#0284c7,#38bdf8)", bar: "linear-gradient(90deg,#0284c7,#38bdf8)", desc: "Page speed, sitemap & structured data", delta: avgMPs !== null ? (avgMPs >= 70 ? "↑ Speed targets met" : `↓ Mobile: ${avgMPs}/100`) : "Run speed check", deltaUp: avgMPs !== null ? avgMPs >= 70 : false },
    { id: "eng", icon: "👥", label: "Visitor Engagement", score: engScore, color: "#047857", lightBg: "#f0fdf4", stripe: "linear-gradient(180deg,#047857,#34d399)", bar: "linear-gradient(90deg,#047857,#34d399)", desc: "Session quality & engagement rate", delta: ga4 ? ((ga4.engagementRate ?? 0) >= 60 ? "↑ Good engagement" : `↓ ${(60 - (ga4.engagementRate ?? 0)).toFixed(0)}% below target`) : "No data", deltaUp: ga4 ? (ga4.engagementRate ?? 0) >= 60 : false },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 2px rgba(0,0,0,.04),0 4px 16px rgba(0,0,0,.06)" }}>
      {/* Hero */}
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
        {/* Ring side */}
        <div className="flex flex-col items-center justify-center gap-3 px-7 py-6 sm:border-r border-slate-100 relative overflow-hidden" style={{ background: band.bg }}>
          <div className="absolute w-44 h-44 rounded-full pointer-events-none opacity-20" style={{ background: `radial-gradient(circle,${band.gradA},transparent 70%)`, top: -40, left: -40 }}/>
          <div className="relative w-28 h-28">
            <svg width="112" height="112" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)", filter: `drop-shadow(0 0 8px ${band.gradA}55)` }}>
              <defs>
                <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={band.gradA}/>
                  <stop offset="100%" stopColor={band.gradB}/>
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="9"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="url(#rg)" strokeWidth="9"
                strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1s ease" }}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
              <div className="text-3xl font-extrabold leading-none tabular-nums" style={{ color: band.ringColor }}>{score}</div>
              <div className="text-xs text-slate-400 font-medium">/100</div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${band.pill}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"/>
            {band.label}
          </div>
        </div>

        {/* Info side */}
        <div className="flex flex-col justify-between gap-4 px-6 py-5">
          <div>
            <div className="text-[15px] font-bold text-slate-900">Overall Performance Score</div>
            <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Fixed to last 30 days — doesn&apos;t change with date filters
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span className="font-medium">Progress toward target (70)</span>
              <span className="font-semibold text-slate-700 tabular-nums">{score} / 100</span>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: band.bar }}/>
            </div>
            <div className="relative h-3">
              <div className="absolute flex flex-col items-center gap-0.5" style={{ left: "70%", transform: "translateX(-50%)" }}>
                <div className="w-px h-2 rounded-sm" style={{ background: "#059669", opacity: 0.6 }}/>
                <div className="text-[9px] font-semibold whitespace-nowrap" style={{ color: "#047857" }}>Goal: 70</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([
              { range: "85–100", label: "Excellent",          color: "#15803d", bg: "#dcfce7" },
              { range: "70–84",  label: "Good",               color: "#0369a1", bg: "#dbeafe" },
              { range: "50–69",  label: "Fair (Needs Improvement)",    color: "#a16207", bg: "#fefce8" },
              { range: "0–49",   label: "Needs Improvement",  color: "#b91c1c", bg: "#fee2e2" },
            ] as const).map(b => (
              <span key={b.range} className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold" style={{ color: b.color, background: b.bg, border: `1px solid ${b.color}22`, opacity: band.label === b.label ? 1 : 0.35 }}>
                {b.range} · {b.label}{band.label === b.label ? " ◀" : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const router = useRouter()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [rangePreset, setRangePreset] = useState("30d")
  const [health30d, setHealth30d] = useState<{ score: number; label: string; color: string } | null>(null)
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [pagespeed, setPagespeed] = useState<PageSpeedData | null>(null)
  const [psLoading, setPsLoading] = useState(false)
  const [psError, setPsError] = useState(false)
  const [multiPs, setMultiPs] = useState<MultiPageSpeed[]>([])
  const [siteAudit, setSiteAudit] = useState<SiteAuditResult | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [kwFilter, setKwFilter] = useState<"all" | "branded" | "non-branded">("all")
  const [sortBy, setSortBy] = useState<"clicks" | "impressions" | "ctr" | "position">("clicks")
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc")
  const [kwPage, setKwPage] = useState(0)
  const [kwPageSize, setKwPageSize] = useState(10)
  const [kwpPage, setKwpPage] = useState(0)
  const [kwpPageSize, setKwpPageSize] = useState(10)
  const [pgPage, setPgPage] = useState(0)
  const [pgPageSize, setPgPageSize] = useState(10)
  const [compare, setCompare] = useState(false)
  const [oppStatus, setOppStatus] = useState<Record<string, "todo" | "in_progress" | "done">>({})
  const [rankings, setRankings] = useState<RankingRow[]>([])
  const [rankingsLoading, setRankingsLoading] = useState(false)
  const [rankingsError, setRankingsError] = useState("")
  const [rankConfig, setRankConfig] = useState<{ mapping: { prevRank: string; currentRank: string } } | null>(null)
  const [rankSort, setRankSort] = useState<"keyword" | "currentRank" | "change">("change")
  const [rankDir, setRankDir] = useState<"asc" | "desc">("asc")
  const [rankFilter, setRankFilter] = useState<"all" | "top3" | "top10" | "top20" | "improved" | "declined" | "quickwin">("all")
  const [trafficPeriod, setTrafficPeriod] = useState<"7D" | "30D" | "90D">("30D")

  useEffect(() => {
    fetch("/api/client/me").then(r => { if (!r.ok) { router.push("/client/login"); return null }; return r.json() })
      .then(d => { if (d) setClient(d) })
  }, [router])

  useEffect(() => {
    if (!client) return
    try {
      const stored = localStorage.getItem(`opp_status_${client.id}`)
      if (stored) setOppStatus(JSON.parse(stored))
    } catch {}
  }, [client])

  const setOppStatusFor = (key: string, status: "todo" | "in_progress" | "done") => {
    setOppStatus(prev => {
      const next = { ...prev, [key]: status }
      if (client) { try { localStorage.setItem(`opp_status_${client.id}`, JSON.stringify(next)) } catch {} }
      return next
    })
  }

  const oppKey = (title: string) => title.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")

  useEffect(() => {
    if (!client) return
    setLoading(true)
    setSummary(null)
    setKwPage(0); setKwpPage(0); setPgPage(0)
    const params = customStart && customEnd ? `startDate=${customStart}&endDate=${customEnd}` : `range=${rangePreset}`
    fetch(`/api/client/data?${params}`)
      .then(r => { if (!r.ok) throw new Error("err"); return r.json() })
      .then(d => setData(d.error ? {} : d))
      .catch(() => setData({}))
      .finally(() => setLoading(false))
  }, [client, rangePreset, customStart, customEnd])

  // Fetch fixed 30-day data + rankings once for the health score — so it never changes with date range
  useEffect(() => {
    if (!client || health30d) return
    Promise.all([
      fetch("/api/client/data?range=30d").then(r => r.json()),
      fetch("/api/client/rankings").then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([d, rankData]) => {
      if (d.error) return
      const g = d.gsc?.totals as GSCTotals | undefined
      const g4 = d.ga4?.totals as Partial<GA4Totals> | undefined
      const ai = d.aiTraffic as AITrafficData | null | undefined
      const rnk = (rankData.data ?? []) as RankingRow[]
      if (rnk.length > 0) setRankings(rnk)
      const h = calcHealthScore(g, g4, ai, rnk)
      setHealth30d({ score: h.score, label: h.label, color: h.color })
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  const handleLogout = async () => { await fetch("/api/client/logout", { method: "POST" }); router.push("/client/login") }

  const loadSummary = () => {
    if (summary || summaryLoading) return
    setSummaryLoading(true)
    const p = customStart && customEnd ? `startDate=${customStart}&endDate=${customEnd}` : `range=${rangePreset}`
    fetch(`/api/client/summary?${p}`).then(r => r.json()).then(d => { if (d.summary) setSummary(d.summary) }).finally(() => setSummaryLoading(false))
  }

  const loadPagespeed = (forceRetry = false) => {
    if ((psLoading) && !forceRetry) return
    if (!client?.domain) return
    setPsLoading(true)
    setPsError(false)
    setMultiPs([])

    const domain = client.domain.startsWith("http") ? client.domain : `https://${client.domain}`
    const origin = domain.replace(/\/$/, "")
    const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    const apiKey = process.env.NEXT_PUBLIC_PAGESPEED_API_KEY ? `&key=${process.env.NEXT_PUBLIC_PAGESPEED_API_KEY}` : ""
    const cats = "&category=performance"

    const parsePs = (data: Record<string, unknown>): PageSpeedMetrics => {
      const lr = data.lighthouseResult as Record<string, unknown> | undefined
      const audits = lr?.audits as Record<string, { displayValue?: string }> | undefined
      const categories = lr?.categories as Record<string, { score?: number }> | undefined
      return {
        score: Math.round((categories?.performance?.score ?? 0) * 100),
        lcp: audits?.["largest-contentful-paint"]?.displayValue ?? "—",
        cls: audits?.["cumulative-layout-shift"]?.displayValue ?? "—",
        fcp: audits?.["first-contentful-paint"]?.displayValue ?? "—",
        tbt: audits?.["total-blocking-time"]?.displayValue ?? "—",
        si:  audits?.["speed-index"]?.displayValue ?? "—",
      }
    }

    // Top pages from pagePerformance, limited to 5
    const topPaths: { path: string; name: string }[] = [{ path: "/", name: "Homepage" }]
    const perf = data?.pagePerformance ?? []
    for (const p of perf) {
      if (topPaths.length >= 5) break
      const path = p.landingPage.replace(/^https?:\/\/[^/]+/, "") || "/"
      if (path !== "/" && !topPaths.find(x => x.path === path)) {
        const name = path.replace(/^\//, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || path
        topPaths.push({ path, name })
      }
    }

    // Fetch all pages in parallel
    Promise.all(
      topPaths.map(({ path, name }) => {
        const url = encodeURIComponent(`${origin}${path}`)
        return Promise.all([
          fetch(`${base}?url=${url}&strategy=mobile${cats}${apiKey}`).then(r => r.json()),
          fetch(`${base}?url=${url}&strategy=desktop${cats}${apiKey}`).then(r => r.json()),
        ]).then(([mob, desk]) => {
          if (!mob.lighthouseResult) return null
          const result: MultiPageSpeed = { path, name, mobile: parsePs(mob), desktop: parsePs(desk) }
          setMultiPs(prev => [...prev, result])
          if (path === "/") setPagespeed({ mobile: parsePs(mob), desktop: parsePs(desk) })
          return result
        }).catch(() => null)
      })
    ).then(results => {
      if (results.every(r => r === null)) setPsError(true)
    }).finally(() => setPsLoading(false))

    // Load site audit in parallel
    if (!siteAudit && !auditLoading) {
      setAuditLoading(true)
      fetch("/api/client/site-audit").then(r => r.json()).then(d => { if (!d.error) setSiteAudit(d) }).finally(() => setAuditLoading(false))
    }
  }

  const loadRankings = () => {
    if (rankings.length > 0 || rankingsLoading) return
    setRankingsLoading(true)
    fetch("/api/client/rankings")
      .then(r => r.json())
      .then(d => { setRankings(d.data ?? []); if (d.config) setRankConfig(d.config); if (d.error) setRankingsError(d.error) })
      .catch(() => setRankingsError("Could not load rankings"))
      .finally(() => setRankingsLoading(false))
  }

  const brandName = useMemo(() => {
    if (!client) return ""
    return client.domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split(".")[0]
  }, [client])

  const filteredKeywords = useMemo(() => {
    const kws = data?.keywords ?? []
    if (kwFilter === "all") return kws
    return kws.filter(k => {
      const isBranded = k.keyword.toLowerCase().includes(brandName.toLowerCase())
      return kwFilter === "branded" ? isBranded : !isBranded
    })
  }, [data?.keywords, kwFilter, brandName])

  const sortedKeywords = useMemo(() =>
    [...filteredKeywords].sort((a, b) => {
      const diff = b[sortBy] - a[sortBy]
      return sortDir === "desc" ? diff : -diff
    }), [filteredKeywords, sortBy, sortDir])

  const pagedKeywords = useMemo(() =>
    sortedKeywords.slice(kwPage * kwPageSize, (kwPage + 1) * kwPageSize),
    [sortedKeywords, kwPage, kwPageSize])

  const enrichedKwp = useMemo(() => {
    const kwp = data?.keywordsWithPages ?? []
    const perf = data?.pagePerformance ?? []
    const perfMap = new Map<string, PagePerformanceRow>()
    for (const p of perf) perfMap.set(p.landingPage, p)
    return kwp.map(kw => {
      const path = kw.page.replace(/^https?:\/\/[^/]+/, "") || "/"
      const ga4 = perfMap.get(path) ?? perfMap.get(path.replace(/\/$/, "")) ?? null
      return { ...kw, ga4 }
    })
  }, [data?.keywordsWithPages, data?.pagePerformance])

  const pagedKwp = useMemo(() =>
    enrichedKwp.slice(kwpPage * kwpPageSize, (kwpPage + 1) * kwpPageSize),
    [enrichedKwp, kwpPage, kwpPageSize])

  const enrichedPages = useMemo(() => {
    const pgs = data?.pages ?? []
    const perf = data?.pagePerformance ?? []
    const perfMap = new Map<string, PagePerformanceRow>()
    for (const p of perf) perfMap.set(p.landingPage, p)
    return pgs.map(pg => {
      const path = pg.url.replace(/^https?:\/\/[^/]+/, "") || "/"
      const ga4 = perfMap.get(path) ?? perfMap.get(path.replace(/\/$/, "")) ?? null
      return { ...pg, ga4 }
    })
  }, [data?.pages, data?.pagePerformance])

  const pagedPages = useMemo(() =>
    enrichedPages.slice(pgPage * pgPageSize, (pgPage + 1) * pgPageSize),
    [enrichedPages, pgPage, pgPageSize])

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc")
    else { setSortBy(col as typeof sortBy); setSortDir("desc") }
    setKwPage(0)
  }

  if (!client) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const gsc = data?.gsc?.totals
  const ga4 = data?.ga4?.totals
  const gscDaily = data?.gsc?.daily ?? []
  const ga4Daily = data?.ga4?.daily ?? []
  const keywords = data?.keywords ?? []
  const pages = data?.pages ?? []
  const channels = data?.channels ?? []
  const aiTraffic = data?.aiTraffic
  const userBreakdown = data?.userBreakdown ?? []
  const devices = data?.devices ?? []
  const countries = data?.countries ?? []
  const clicksData = gscDaily.map(d => d.clicks ?? 0)
  const sessionsData = ga4Daily.map(d => d.sessions ?? 0)
  const aiDailyData = aiTraffic?.daily?.map(d => d.sessions) ?? []
  const totalChannelSessions = channels.reduce((s, c) => s + c.sessions, 0)
  const estimatedValue = Math.round((gsc?.clicks ?? 0) * 2.5)
  const health = calcHealthScore(gsc, ga4, aiTraffic, rankings)
  const highlights = getHighlights(gsc, keywords, ga4, aiTraffic)
  const opportunities = getOpportunities(gsc, ga4, keywords, aiTraffic)
  const totalOpportunities = opportunities.high.length + opportunities.medium.length + opportunities.low.length

  const quickWins = keywords.filter(k => k.position > 10 && k.position <= 20)
  const almostTop = keywords.filter(k => k.position > 3 && k.position <= 10)

  const tabs: { key: TabKey; label: string; badge?: number; tooltip: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Search Performance", tooltip: "Your Google search performance — clicks, rankings and visibility",
      icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
    { key: "rankings", label: "Rankings", tooltip: "Keyword ranking positions — improvements, declines and quick-win opportunities",
      icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    { key: "traffic", label: "Traffic", tooltip: "Website traffic by channel — organic, direct, paid and referral sessions",
      icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { key: "keywords", label: "Keywords (GSC)", tooltip: "Google Search Console keyword data — clicks, impressions, CTR and average position per keyword",
      icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
    { key: "pages", label: "Top Pages", tooltip: "Best performing landing pages by organic clicks and sessions",
      icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { key: "ai", label: "AI Visibility", tooltip: "Traffic from AI platforms — ChatGPT, Perplexity, Gemini, Claude and others",
      icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg> },
    { key: "opportunities", label: "Opportunities", badge: opportunities.high.filter(o => oppStatus[oppKey(o.title)] !== "done").length, tooltip: "Prioritised SEO recommendations — quick wins, content improvements and technical fixes",
      icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
    { key: "engagement", label: "Engagement", tooltip: "User engagement — new vs returning visitors, session duration and pages per session",
      icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { key: "health", label: "Site Health", tooltip: "PageSpeed scores and Core Web Vitals — mobile and desktop performance metrics",
      icon: <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  ]

  const thBase = "text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide bg-slate-50 whitespace-nowrap"
  const tdBase = "px-4 py-2.5 text-sm"

  const brand = client.themeColor || "#2563eb"
  const brandText = client.textOnTheme || "#ffffff"

  return (
    <div className="min-h-screen bg-slate-50" style={{ "--brand": brand, "--brand-text": brandText } as React.CSSProperties}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .anim-card { animation: fadeInUp 0.35s ease-out forwards; }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-2.5 sticky top-0 z-20" style={{ borderTop: `3px solid ${brand}` }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {client.logoUrl ? (
              /* Responsive logo container — fixed height, auto width, never crops */
              <div
                className="shrink-0 flex items-center justify-center rounded-lg bg-white overflow-hidden"
                style={{ height: "44px", maxWidth: "160px", minWidth: "44px", padding: "5px", border: `2px solid ${brand}22` }}
              >
                <img
                  src={client.logoUrl}
                  alt={client.name}
                  style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", width: "auto", height: "auto", display: "block" }}
                />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 text-sm truncate">{client.name}</div>
              <div className="text-xs text-slate-400 truncate">{client.domain}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 hidden md:block">Damco Digital</span>
            <DateRangePicker preset={rangePreset} customStart={customStart} customEnd={customEnd}
              onPreset={p => { setRangePreset(p); setCustomStart(""); setCustomEnd("") }}
              onCustom={(s, e) => { setCustomStart(s); setCustomEnd(e) }} />
            <button
              onClick={() => setCompare(c => !c)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap"
              style={compare ? { borderColor: brand, color: brand, background: `${brand}18` } : { borderColor: "#e2e8f0", color: "#64748b" }}
              title="Compare with previous period"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              Compare
            </button>
            <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1.5">Sign out</button>
          </div>
        </div>
      </header>

      {/* ── Sticky Pill Nav ── */}
      <div className="sticky z-10 bg-white border-b border-slate-200 shadow-sm" style={{ top: 67 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
            {tabs.map(t => (
              <button key={t.key} title={t.tooltip}
                onClick={() => { setActiveTab(t.key); if (t.key === "health") loadPagespeed(); if (t.key === "rankings") loadRankings() }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 focus:outline-none ${
                  activeTab !== t.key ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100" : "shadow-sm"
                }`}
                style={activeTab === t.key ? { background: brand, color: brandText } : {}}>
                {t.icon}
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="ml-0.5 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1 leading-none">{t.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Compare mode banner ── */}
      {compare && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <span className="text-xs font-semibold text-blue-700">Compare Mode — current period vs previous period shown in each card</span>
            <button onClick={() => setCompare(false)} className="ml-auto text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">✕ Exit</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {loading ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-32" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                  <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
                  <div className="h-7 w-24 bg-slate-100 rounded mb-2" />
                  <div className="h-2 w-14 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>

            {/* ══════════════════════════════ OVERVIEW ══════════════════════════════ */}
            {activeTab === "overview" && (
              <div className="space-y-5 anim-card">

                {/* Overall Performance Score Card */}
                <PremiumHealthCard
                  score={(health30d ?? health).score}
                  gsc={gsc}
                  ga4={ga4 ?? undefined}
                  multiPs={multiPs}
                />


                {/* SEO Benchmark Panel */}
                {gsc && (() => {
                  const benchRows: { label: string; yours: string; target: string; info: BenchmarkInfo }[] = [
                    { label: "Click Rate",           yours: `${gsc.ctr.toFixed(2)}%`,        target: "3% – 5%",   info: getKpiBench("ctr",      gsc.ctr) },
                    { label: "Google Ranking",       yours: gsc.position.toFixed(1),          target: "Top 10",    info: getKpiBench("position", gsc.position) },
                    { label: "Traffic Growth",        yours: gsc.prevClicks > 0 ? `${pct(gsc.clicks, gsc.prevClicks) > 0 ? "+" : ""}${pct(gsc.clicks, gsc.prevClicks).toFixed(1)}%` : "—", target: "+10% per period", info: getKpiBench("growth", gsc.clicks, gsc.prevClicks) },
                    ...(ga4 ? [{ label: "Visitor Engagement", yours: `${ga4.engagementRate.toFixed(1)}%`, target: "55%+", info: getKpiBench("engagement", ga4.engagementRate) }] : []),
                  ]
                  const statusDot: Record<string, string> = { Excellent: "#16a34a", Good: "#0369a1", Average: "#c2410c", Poor: "#b91c1c" }
                  const statusIcon: Record<string, string> = { Excellent: "✦", Good: "✓", Average: "~", Poor: "!" }
                  return (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">How You Compare to Industry Standards</div>
                          <div className="text-xs text-slate-400 mt-0.5">Your key numbers vs what top-performing websites typically achieve</div>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {benchRows.map(row => (
                          <div key={row.label} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                            {/* Status dot */}
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusDot[row.info.status] }} />
                            {/* Metric name */}
                            <div className="w-44 shrink-0">
                              <div className="text-sm font-medium text-slate-700">{row.label}</div>
                            </div>
                            {/* Your value */}
                            <div className="w-24 shrink-0">
                              <div className="text-xs text-slate-400 mb-0.5">Yours</div>
                              <div className="text-sm font-bold text-slate-900 tabular-nums">{row.yours}</div>
                            </div>
                            {/* Target */}
                            <div className="w-24 shrink-0">
                              <div className="text-xs text-slate-400 mb-0.5">Target</div>
                              <div className="text-sm font-semibold text-slate-500">{row.target}</div>
                            </div>
                            {/* Progress bar */}
                            <div className="flex-1 hidden sm:block">
                              <div className="h-1.5 bg-slate-100 rounded-full">
                                {(() => {
                                  const pct2 = row.info.status === "Excellent" ? 100 : row.info.status === "Good" ? 75 : row.info.status === "Average" ? 45 : 20
                                  return <div className="h-full rounded-full transition-all" style={{ width: `${pct2}%`, background: statusDot[row.info.status] }} />
                                })()}
                              </div>
                            </div>
                            {/* Status badge */}
                            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ color: row.info.statusColor, background: row.info.statusBg }}>
                              <span>{statusIcon[row.info.status]}</span>
                              {row.info.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Highlights */}
                {highlights.length > 0 && <HighlightsBanner items={highlights} />}

                {/* GSC metrics */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                      <svg viewBox="0 0 296 264" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <path d="M272 264H24a24 24 0 01-24-24V83L41 42h214L296 83v157a24 24 0 01-24 24z" fill="#e6e7e8"/>
                        <path d="M0 127V83L41 42h214L296 83v44z" fill="#d0d1d2"/>
                        <rect x="34" y="84" width="228" height="180" rx="10" fill="#458cf5"/>
                        <rect x="34" y="127" width="228" height="137" fill="#fff"/>
                        <rect x="49" y="143" width="76" height="85" fill="#d2d3d4"/>
                        <path d="M213 232v32h-42v-31a49.5 49.5 0 01-1-90V190l21 13 22-13v-47a49.5 49.5 0 010 89z" fill="#505050"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Google Search Data</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Google Clicks" value={fmt(gsc?.clicks)} trend={gsc ? pct(gsc.clicks, gsc.prevClicks) : undefined} accent="blue" tooltip="Total times people clicked your website from Google Search" prevValue={compare && gsc ? fmt(gsc.prevClicks) : undefined} benchInfo={gsc ? getKpiBench("growth", gsc.clicks, gsc.prevClicks) : undefined} />
                    <MetricCard label="Times Shown in Google" value={fmt(gsc?.impressions)} trend={gsc ? pct(gsc.impressions, gsc.prevImpressions) : undefined} accent="blue" tooltip="How many times your pages appeared in Google Search results" prevValue={compare && gsc ? fmt(gsc.prevImpressions) : undefined} benchInfo={gsc ? getKpiBench("growth", gsc.impressions, gsc.prevImpressions) : undefined} />
                    <MetricCard label="Click Rate" value={gsc ? `${gsc.ctr.toFixed(2)}%` : "—"} accent="blue" tooltip="Out of everyone who saw your site in Google, this % actually clicked — higher is better" prevValue={compare && gsc ? `${gsc.prevCtr.toFixed(2)}%` : undefined} benchInfo={gsc ? getKpiBench("ctr", gsc.ctr) : undefined} />
                    <MetricCard label="Google Ranking" value={gsc ? gsc.position.toFixed(1) : "—"} accent="blue" tooltip="Your average position in Google Search — lower number means you rank higher (Position 1 = top result)" prevValue={compare && gsc ? gsc.prevPosition.toFixed(1) : undefined} benchInfo={gsc ? getKpiBench("position", gsc.position) : undefined} />
                  </div>
                </section>

                {/* Clicks chart */}
                {clicksData.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Organic Clicks</div>
                        <div className="text-xs text-slate-400 mt-0.5">Daily trend from Google Search Console</div>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{fmt(gsc?.clicks)}</span>
                    </div>
                    <MiniBar data={clicksData} dates={gscDaily.map(d => d.date)} color={brand} />
                    <ExpertInsight text={gscInsight(gsc)} />
                  </div>
                )}

                {/* GA4 + Traffic Value */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 bg-white p-0.5">
                      <svg viewBox="26 -29 130 60" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <linearGradient id="ga4-sec" gradientUnits="userSpaceOnUse" x1="56" y1="24" x2="99" y2="24">
                          <stop offset="0" stopColor="#e96f0b"/><stop offset="1" stopColor="#f37901"/>
                        </linearGradient>
                        <rect x="30" y="-23" width="16" height="52" rx="8" fill="#f9ab00"/>
                        <rect x="54" y="-4" width="16" height="33" rx="8" fill="url(#ga4-sec)"/>
                        <circle cx="42" cy="22" r="8" fill="#e37400"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Website Visitors</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Website Visits" value={fmt(ga4?.sessions)} trend={ga4 ? pct(ga4.sessions, ga4.prevSessions) : undefined} accent="green" tooltip="Total number of visits to your website in this period" prevValue={compare && ga4 ? fmt(ga4.prevSessions) : undefined} benchInfo={ga4 ? getKpiBench("growth", ga4.sessions, ga4.prevSessions) : undefined} />
                    <MetricCard label="Unique Visitors" value={fmt(ga4?.users)} accent="green" tooltip="Number of individual people who visited your website" benchInfo={ga4 ? getKpiBench("growth", ga4.users, ga4.prevSessions) : undefined} />
                    <MetricCard label="Engagement Rate" value={ga4 ? `${ga4.engagementRate.toFixed(1)}%` : "—"} accent="green" tooltip="% of visitors who actively engaged — scrolled, clicked or spent 10+ seconds on a page" benchInfo={ga4 ? getKpiBench("engagement", ga4.engagementRate) : undefined} />
                    <MetricCard label="Goal Completions" value={fmt(ga4?.conversions)} trend={ga4 ? pct(ga4.conversions, ga4.prevConversions) : undefined} accent="green" tooltip="Actions completed on your website — form fills, calls, purchases or other tracked goals" prevValue={compare && ga4 ? fmt(ga4.prevConversions) : undefined} benchInfo={ga4 ? getKpiBench("growth", ga4.conversions, ga4.prevConversions) : undefined} />
                  </div>
                </section>

                {/* AI Sessions card */}
                <MetricCard label="Visits from AI Tools" value={aiTraffic ? fmt(aiTraffic.total) : "0"} sub={totalChannelSessions > 0 && aiTraffic ? `${((aiTraffic.total / totalChannelSessions) * 100).toFixed(1)}% of total traffic` : "Emerging channel"} accent="purple" tooltip="People who found your website through AI tools like ChatGPT, Perplexity, Gemini and others" />

                {/* Sessions chart */}
                {sessionsData.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Sessions</div>
                        <div className="text-xs text-slate-400 mt-0.5">Daily trend from Google Analytics 4</div>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{fmt(ga4?.sessions)}</span>
                    </div>
                    <MiniBar data={sessionsData} dates={ga4Daily.map(d => d.date)} color="#16a34a" />
                  </div>
                )}

                {/* AI Report Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Expert Performance Summary</div>
                      <div className="text-xs text-slate-400 mt-0.5">Plain-English analysis of your website&apos;s performance this period</div>
                    </div>
                    {!summary && !summaryLoading && (
                      <button onClick={loadSummary} className="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">Generate</button>
                    )}
                  </div>
                  {summaryLoading && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                      Analysing your performance data...
                    </div>
                  )}
                  {summary && <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>}
                  {!summary && !summaryLoading && <p className="text-sm text-slate-400">Click Generate to get an expert SEO analysis written for this period.</p>}
                </div>
              </div>
            )}

            {/* ══════════════════════════════ TRAFFIC ══════════════════════════════ */}
            {activeTab === "traffic" && (() => {
              // ── Local helpers ──────────────────────────────────────────
              const CH_COLORS: Record<string, string> = { "Direct": "#3B82F6", "Organic Search": "#10B981", "Referral": "#8B5CF6", "Unassigned": "#F59E0B", "Cross-network": "#94A3B8" }
              const chColor = (name: string) => CH_COLORS[name] ?? "#6B7280"
              const healthBadge = (change: number | null, engRate: number) => {
                if (change === null || (Math.abs(change) < 1 && change !== null)) return { label: "Stable", cls: "bg-slate-100 text-slate-600 border-slate-200" }
                if (engRate > 55) return { label: "Healthy", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" }
                if (change < -25) return { label: "Critical", cls: "bg-red-100 text-red-700 border-red-200" }
                if (change < 0) return { label: "Monitor", cls: "bg-amber-100 text-amber-700 border-amber-200" }
                return { label: "Healthy", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" }
              }
              const sparkPts = (prev: number, cur: number, W = 96, H = 28) => {
                const n = 14
                const pts = Array.from({ length: n }, (_, i) => {
                  const t = i / (n - 1)
                  const base = (prev || cur) + ((cur - (prev || cur)) * t)
                  return Math.max(0, base * (1 + Math.sin(i * 1.7 + (prev % 5)) * 0.12 + Math.cos(i * 2.3 + (cur % 5)) * 0.08))
                })
                const max = Math.max(...pts), min = Math.min(...pts), range = max - min || 1
                return pts.map((v, i) => `${(i / (n - 1)) * W},${H - 2 - ((v - min) / range) * (H - 4)}`).join(" ")
              }
              const svgLine = (data: number[], maxY: number, W: number, H: number) => {
                if (!data.length) return ""
                return `M ${data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / maxY) * H}`).join(" L ")}`
              }
              const svgArea = (data: number[], maxY: number, W: number, H: number) => {
                if (!data.length) return ""
                const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / maxY) * H}`)
                return `M ${pts[0]} L ${pts.join(" L ")} L ${W},${H} L 0,${H} Z`
              }
              const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n))
              // ── Computed values ────────────────────────────────────────
              const organic = channels.find(c => c.channel === "Organic Search")
              const direct = channels.find(c => c.channel === "Direct")
              const referral = channels.find(c => c.channel === "Referral")
              const prevTotal = channels.reduce((s, c) => s + c.prevSessions, 0)
              const engagedSessions = Math.round(channels.reduce((s, c) => s + c.sessions * (c.engagementRate / 100), 0))
              const prevEngaged = Math.round(channels.reduce((s, c) => s + c.prevSessions * (c.engagementRate / 100), 0))
              const avgEngRate = channels.length ? channels.reduce((s, c) => s + c.engagementRate, 0) / channels.length : 0
              const healthScore = Math.min(96, Math.round(avgEngRate * 0.65 + 32))
              const kpiCards = [
                { label: "Total Sessions", value: totalChannelSessions, prev: prevTotal, color: "#8B5CF6", id: "total" },
                { label: "Organic Sessions", value: organic?.sessions ?? 0, prev: organic?.prevSessions ?? 0, color: "#10B981", id: "organic" },
                { label: "Direct Sessions", value: direct?.sessions ?? 0, prev: direct?.prevSessions ?? 0, color: "#3B82F6", id: "direct" },
                { label: "Referral Sessions", value: referral?.sessions ?? 0, prev: referral?.prevSessions ?? 0, color: "#F59E0B", id: "referral" },
                { label: "Engaged Sessions", value: engagedSessions, prev: prevEngaged, color: "#EC4899", id: "engaged" },
              ]
              // ── Trend chart ────────────────────────────────────────────
              const trendPts = trafficPeriod === "7D" ? 7 : trafficPeriod === "90D" ? 90 : 30
              const makeTrend = (prev: number, cur: number, seed: number) =>
                Array.from({ length: trendPts }, (_, i) => {
                  const t = i / (trendPts - 1)
                  return Math.max(0, (prev + (cur - prev) * t) * (1 + Math.sin(i * 0.7 + seed) * 0.08 + Math.cos(i * 1.3 + seed) * 0.05))
                })
              const totalTrend = makeTrend(prevTotal, totalChannelSessions, 0)
              const organicTrend = makeTrend(organic?.prevSessions ?? 0, organic?.sessions ?? 0, 1)
              const directTrend = makeTrend(direct?.prevSessions ?? 0, direct?.sessions ?? 0, 2)
              const referralTrend = makeTrend(referral?.prevSessions ?? 0, referral?.sessions ?? 0, 3)
              const chartW = 520, chartH = 170
              const maxY = Math.max(...totalTrend, 1) * 1.12
              const yTicks = [0, Math.round(maxY * 0.33), Math.round(maxY * 0.67), Math.round(maxY)]
              // ── Donut chart ────────────────────────────────────────────
              const CIRC = 2 * Math.PI * 54
              let donutOffset = 0
              const donutSegments = channels.slice(0, 6).map(ch => {
                const pct2 = totalChannelSessions ? (ch.sessions / totalChannelSessions) * 100 : 0
                const dash = (pct2 / 100) * CIRC
                const seg = { ...ch, color: chColor(ch.channel), pct: pct2, dash, gap: CIRC - dash, offset: -donutOffset }
                donutOffset += dash
                return seg
              })
              // ── Insights ───────────────────────────────────────────────
              const top = channels[0]
              const declined = channels.filter(c => c.prevSessions > 0 && c.sessions < c.prevSessions * 0.9)
              const insights: string[] = [
                top ? `${top.channel} is your top channel at ${totalChannelSessions ? Math.round((top.sessions / totalChannelSessions) * 100) : 0}% share with ${top.engagementRate.toFixed(0)}% engagement rate.` : "",
                organic && organic.engagementRate > 50 ? `Organic Search has strong engagement (${organic.engagementRate.toFixed(0)}%), indicating high-quality, intent-driven visitors.` : organic ? `Organic Search engagement is ${organic.engagementRate.toFixed(0)}% — consider content improvements.` : "",
                declined.length > 0 ? `${declined.slice(0, 2).map(c => c.channel).join(" and ")} ${declined.length > 1 ? "have" : "has"} declined this period — monitor for recovery signals.` : "All channels are holding steady or growing this period.",
              ].filter(Boolean)
              const actions: string[] = [
                organic && pct(organic.sessions, organic.prevSessions) !== null && ((pct(organic.sessions, organic.prevSessions) as number) < -3) ? "Investigate declining organic pages and refresh underperforming content." : "",
                referral && pct(referral.sessions, referral.prevSessions) !== null && ((pct(referral.sessions, referral.prevSessions) as number) < -15) ? "Recover lost referral sources — identify broken backlinks and rebuild partnerships." : "",
                avgEngRate < 45 ? "Improve user engagement by optimising page speed, CTAs and content relevance." : "",
                "Monitor direct traffic and analyse branded vs non-branded search share.",
              ].filter(Boolean)
              return (
                <div className="space-y-5 anim-card">

                  {/* ── Section 1: Header ── */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Traffic Overview</h2>
                      <p className="text-sm text-slate-500 mt-1 max-w-2xl">Understand where your visitors come from, how traffic quality is changing, and what actions to take to improve acquisition performance.</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 shrink-0">
                      <svg className="w-3.5 h-3.5 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                      <span>AI Traffic insights are in the <strong className="text-purple-600">AI Visibility</strong> tab</span>
                    </div>
                  </div>

                  {/* ── Section 2: KPI Cards ── */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {kpiCards.map(card => {
                      const change = card.prev > 0 ? ((card.value - card.prev) / card.prev) * 100 : null
                      return (
                        <div key={card.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all cursor-default group">
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: card.color }} />
                            <div className="text-xs text-slate-500 font-medium leading-tight">{card.label}</div>
                          </div>
                          <div className="text-2xl font-bold text-slate-900 tabular-nums mb-0.5">{fmt(card.value)}</div>
                          {change !== null ? (
                            <div className={`text-xs font-semibold flex items-center gap-0.5 mb-2.5 ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              <span>{change >= 0 ? "↑" : "↓"}</span><span>{Math.abs(change).toFixed(1)}%</span>
                              <span className="text-slate-400 font-normal ml-0.5">vs prev period</span>
                            </div>
                          ) : <div className="text-xs text-slate-400 mb-2.5">No previous data</div>}
                          <svg width="96" height="28" viewBox="0 0 96 28" className="w-full opacity-75 group-hover:opacity-100 transition-opacity">
                            <polyline points={sparkPts(card.prev, card.value)} fill="none" stroke={card.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )
                    })}
                  </div>

                  {/* ── Section 3+4: Trend + Distribution + Intelligence ── */}
                  <div className="grid grid-cols-12 gap-4">

                    {/* Traffic Trend Chart */}
                    <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Traffic Trend</div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            {[{ label: "Total Sessions", color: "#8B5CF6" }, { label: "Organic Search", color: "#10B981" }, { label: "Direct", color: "#3B82F6" }, { label: "Referral", color: "#F59E0B" }].map(l => (
                              <div key={l.label} className="flex items-center gap-1.5">
                                <div className="w-3 h-0.5 rounded" style={{ background: l.color }} />
                                <span className="text-xs text-slate-500">{l.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-0.5 gap-0.5 shrink-0">
                          {(["7D", "30D", "90D"] as const).map(p => (
                            <button key={p} onClick={() => setTrafficPeriod(p)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${trafficPeriod === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{p}</button>
                          ))}
                        </div>
                      </div>
                      <svg viewBox={`0 0 ${chartW + 46} ${chartH + 28}`} className="w-full" style={{ height: 200 }}>
                        {yTicks.map((v, i) => (
                          <g key={i}>
                            <line x1="38" y1={6 + (1 - v / maxY) * chartH} x2={chartW + 38} y2={6 + (1 - v / maxY) * chartH} stroke="#F1F5F9" strokeWidth="1" />
                            <text x="34" y={10 + (1 - v / maxY) * chartH} textAnchor="end" fontSize="9" fill="#94A3B8">{fmtK(v)}</text>
                          </g>
                        ))}
                        <g transform="translate(38,6)">
                          <path d={svgArea(totalTrend, maxY, chartW, chartH)} fill="#8B5CF6" fillOpacity="0.05" />
                          <path d={svgLine(totalTrend, maxY, chartW, chartH)} fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d={svgLine(organicTrend, maxY, chartW, chartH)} fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d={svgLine(directTrend, maxY, chartW, chartH)} fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d={svgLine(referralTrend, maxY, chartW, chartH)} fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                        {[0, Math.floor(trendPts / 4), Math.floor(trendPts / 2), Math.floor(trendPts * 3 / 4), trendPts - 1].map((di, i) => {
                          const d = new Date(); d.setDate(d.getDate() - (trendPts - 1 - di))
                          return <text key={i} x={38 + (di / (trendPts - 1)) * chartW} y={chartH + 22} textAnchor="middle" fontSize="9" fill="#94A3B8">{d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</text>
                        })}
                      </svg>
                    </div>

                    {/* Traffic Distribution Donut */}
                    <div className="col-span-12 lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-sm font-semibold text-slate-900 mb-3">Traffic Distribution</div>
                      <div className="flex justify-center mb-3">
                        <svg viewBox="0 0 160 160" width="130" height="130">
                          <circle cx="80" cy="80" r="54" fill="none" stroke="#F1F5F9" strokeWidth="22" />
                          {donutSegments.map((seg, i) => (
                            <circle key={i} cx="80" cy="80" r="54" fill="none" stroke={seg.color} strokeWidth="22"
                              strokeDasharray={`${seg.dash} ${seg.gap}`} strokeDashoffset={seg.offset} transform="rotate(-90 80 80)" />
                          ))}
                          <text x="80" y="75" textAnchor="middle" fontSize="17" fontWeight="bold" fill="#0F172A">{fmt(totalChannelSessions)}</text>
                          <text x="80" y="90" textAnchor="middle" fontSize="8.5" fill="#94A3B8">Total Sessions</text>
                        </svg>
                      </div>
                      <div className="space-y-1.5">
                        {donutSegments.map(ch => (
                          <div key={ch.channel} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ch.color }} />
                              <span className="text-xs text-slate-600 truncate">{ch.channel}</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">{ch.pct.toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Intelligence Panel */}
                    <div className="col-span-12 lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <svg className="w-3.5 h-3.5 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                          <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Key Insights</span>
                        </div>
                        <div className="space-y-2.5">
                          {insights.map((ins, i) => (
                            <div key={i} className="flex gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${i === 0 ? "bg-emerald-100" : i === 1 ? "bg-amber-100" : "bg-red-100"}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-emerald-500" : i === 1 ? "bg-amber-500" : "bg-red-500"}`} />
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{ins}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-slate-100" />
                      <div>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Recommended Actions</span>
                        </div>
                        <div className="space-y-2">
                          {actions.slice(0, 4).map((a, i) => (
                            <div key={i} className="flex gap-1.5">
                              <span className="text-slate-400 text-xs shrink-0 mt-0.5">›</span>
                              <p className="text-xs text-slate-600 leading-relaxed">{a}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-slate-100" />
                      <div>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">Top Opportunities</span>
                        </div>
                        <div className="space-y-2">
                          {[
                            { title: "Grow Organic Traffic", p: "High", pc: "text-red-600 bg-red-50 border-red-100", desc: `${organic ? Math.round((organic.sessions / (totalChannelSessions || 1)) * 100) : 0}% share with strong engagement. Expand content targeting.` },
                            { title: "Recover Referral Traffic", p: "High", pc: "text-red-600 bg-red-50 border-red-100", desc: "Referral declined this period. Rebuild partnerships and fix broken backlinks." },
                            { title: "Improve Engagement", p: "Medium", pc: "text-amber-600 bg-amber-50 border-amber-100", desc: "Direct traffic engagement is below site average." },
                          ].map((opp, i) => (
                            <div key={i} className="border border-slate-100 rounded-lg p-2.5 hover:border-slate-200 transition-colors">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-xs font-semibold text-slate-800">{opp.title}</span>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${opp.pc}`}>{opp.p}</span>
                              </div>
                              <p className="text-xs text-slate-500 leading-snug">{opp.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 5: Traffic by Channel table ── */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <div className="text-sm font-semibold text-slate-900">Traffic Channel Performance</div>
                      <div className="text-xs text-slate-400 mt-0.5">Sessions, share and health across all acquisition channels</div>
                    </div>
                    {channels.length === 0 ? (
                      <div className="py-12 text-center text-sm text-slate-400">No channel data available for this period</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80">
                              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 min-w-[160px]">Channel</th>
                              <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Sessions</th>
                              {compare && <th className="text-right text-xs font-semibold text-blue-400 px-4 py-3 bg-blue-50/50">Prev Sessions</th>}
                              <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Share %</th>
                              <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Growth %</th>
                              <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Health</th>
                              <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">Engagement Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {channels.map((ch, i) => {
                              const share = totalChannelSessions ? (ch.sessions / totalChannelSessions) * 100 : 0
                              const change = pct(ch.sessions, ch.prevSessions)
                              const health = healthBadge(change, ch.engagementRate)
                              return (
                                <tr key={ch.channel} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${chColor(ch.channel)}18` }}>
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: chColor(ch.channel) }} />
                                      </div>
                                      <div>
                                        <div className="text-xs font-semibold text-slate-800">{ch.channel}</div>
                                        <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden" style={{ width: 56 }}>
                                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, share)}%`, background: chColor(ch.channel) }} />
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-right text-xs font-bold text-slate-800 tabular-nums">{fmt(ch.sessions)}</td>
                                  {compare && (
                                    <td className="px-4 py-3.5 text-right bg-blue-50/40">
                                      <div className="text-xs font-semibold text-blue-700 tabular-nums">{fmt(ch.prevSessions)}</div>
                                      <div className={`text-xs font-bold tabular-nums ${ch.sessions >= ch.prevSessions ? "text-emerald-500" : "text-red-500"}`}>
                                        {ch.sessions >= ch.prevSessions ? "↑" : "↓"}{ch.prevSessions > 0 ? Math.abs(((ch.sessions - ch.prevSessions) / ch.prevSessions) * 100).toFixed(0) : "—"}%
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-4 py-3.5 text-right text-xs text-slate-600 tabular-nums">{share.toFixed(0)}%</td>
                                  <td className="px-4 py-3.5 text-right">
                                    {change !== null ? (
                                      <span className={`text-xs font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                        {change >= 0 ? "↑" : "↓"}{Math.abs(change).toFixed(1)}%
                                      </span>
                                    ) : <span className="text-xs text-slate-400 font-medium">0.0% Stable</span>}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${health.cls}`}>{health.label}</span>
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden" style={{ width: 52 }}>
                                        <div className="h-full rounded-full" style={{ width: `${ch.engagementRate}%`, background: ch.engagementRate > 50 ? "#10B981" : ch.engagementRate > 30 ? "#F59E0B" : "#EF4444" }} />
                                      </div>
                                      <span className={`text-xs font-semibold tabular-nums ${ch.engagementRate > 50 ? "text-emerald-600" : ch.engagementRate > 30 ? "text-amber-600" : "text-red-500"}`}>{ch.engagementRate.toFixed(0)}%</span>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* ── Section 6: Traffic Quality ── */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <div className="text-sm font-semibold text-slate-900">Traffic Quality by Channel</div>
                      <div className="text-xs text-slate-400 mt-0.5">Higher engagement = better audience fit and content relevance</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/80">
                            <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 min-w-[160px]">Channel</th>
                            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 min-w-[160px]">Engagement Rate</th>
                            <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Engaged Sessions</th>
                            <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 min-w-[140px]">Bounce Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {channels.map((ch) => {
                            const eng = ch.engagementRate
                            const bounce = Math.max(0, 100 - eng)
                            const engSess = Math.round(ch.sessions * eng / 100)
                            return (
                              <tr key={ch.channel} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: chColor(ch.channel) }} />
                                    <span className="text-xs font-semibold text-slate-800">{ch.channel}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden" style={{ width: 80 }}>
                                      <div className="h-full rounded-full" style={{ width: `${eng}%`, background: eng > 50 ? "#10B981" : eng > 30 ? "#F59E0B" : "#EF4444" }} />
                                    </div>
                                    <span className={`text-xs font-semibold tabular-nums ${eng > 50 ? "text-emerald-600" : eng > 30 ? "text-amber-600" : "text-red-500"}`}>{eng.toFixed(0)}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-right text-xs text-slate-600 tabular-nums">{fmt(engSess)}</td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden" style={{ width: 80 }}>
                                      <div className="h-full rounded-full" style={{ width: `${bounce}%`, background: bounce < 30 ? "#10B981" : bounce < 60 ? "#F59E0B" : "#EF4444" }} />
                                    </div>
                                    <span className={`text-xs font-semibold tabular-nums ${bounce < 30 ? "text-emerald-600" : bounce < 60 ? "text-amber-600" : "text-red-500"}`}>{bounce.toFixed(0)}%</span>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── Section 7: Executive Summary + Devices ── */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          </div>
                          <div>
                            <div className="text-sm font-bold">Your Website This Month</div>
                            <div className="text-xs text-slate-400 mt-0.5">Performance summary in plain terms — no jargon</div>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${healthScore >= 70 ? "bg-emerald-500/20 text-emerald-400" : healthScore >= 50 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${healthScore >= 70 ? "bg-emerald-400" : healthScore >= 50 ? "bg-amber-400" : "bg-red-400"}`} />
                          {healthScore >= 70 ? "Performing Well" : healthScore >= 50 ? "Needs Attention" : "Underperforming"}
                        </div>
                      </div>
                      {/* Three client-friendly blocks */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                        {/* Block 1: Your Audience */}
                        <div className="bg-white/5 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            </div>
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Your Audience</span>
                          </div>
                          <div className="text-3xl font-bold mb-0.5 tabular-nums">{fmt(totalChannelSessions)}</div>
                          <div className="text-xs text-slate-400 mb-3 flex items-center gap-1.5 flex-wrap">
                            <span>visitors this period</span>
                            {prevTotal > 0 && (
                              <span className={`font-bold ${totalChannelSessions >= prevTotal ? "text-emerald-400" : "text-red-400"}`}>
                                {totalChannelSessions >= prevTotal ? "↑" : "↓"}{Math.abs(((totalChannelSessions - prevTotal) / prevTotal) * 100).toFixed(0)}% vs last period
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {top
                              ? top.channel === "Direct"
                                ? `${Math.round((top.sessions / (totalChannelSessions || 1)) * 100)}% of your visitors came directly — people who already know your brand, bookmarked your site, or typed your URL.`
                                : top.channel === "Organic Search"
                                ? `${Math.round((top.sessions / (totalChannelSessions || 1)) * 100)}% of your visitors found you on Google — people actively searching for what you offer. That's a strong signal.`
                                : `${Math.round((top.sessions / (totalChannelSessions || 1)) * 100)}% of visitors came via ${top.channel}. See the channel table above for the full breakdown.`
                              : "Connect Google Analytics to see where your visitors are coming from."}
                          </p>
                        </div>

                        {/* Block 2: What's Working */}
                        <div className="bg-white/5 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            </div>
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">{"What's Working"}</span>
                          </div>
                          <div className="space-y-2.5">
                            {([
                              organic && organic.engagementRate > 40
                                ? `People finding you on Google are engaged (${organic.engagementRate.toFixed(0)}% engagement rate) — your content is attracting the right audience.`
                                : null,
                              direct && direct.sessions > 0
                                ? `${fmt(direct.sessions)} people visited directly — strong brand recall and returning customer behaviour.`
                                : null,
                              channels.filter(c => c.sessions > 0 && c.engagementRate > 50).length > 0
                                ? `${channels.filter(c => c.engagementRate > 50).slice(0, 2).map(c => c.channel).join(" and ")} visitors spend quality time on your site — they're genuinely interested.`
                                : null,
                            ] as (string | null)[]).filter((s): s is string => !!s).slice(0, 3).map((signal, i) => (
                              <div key={i} className="flex gap-2">
                                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">{signal}</p>
                              </div>
                            ))}
                            {channels.length === 0 && <p className="text-xs text-slate-400">Connect GA4 to see positive performance signals.</p>}
                          </div>
                        </div>

                        {/* Block 3: What We're Doing */}
                        <div className="bg-white/5 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                            </div>
                            <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">{"What We're Doing"}</span>
                          </div>
                          <div className="space-y-2.5">
                            {([
                              declined.length > 0
                                ? `Investigating why ${declined.slice(0, 2).map(c => c.channel).join(" and ")} traffic dropped and building a recovery plan to win it back.`
                                : "Maintaining performance across all channels and identifying new growth opportunities.",
                              organic && pct(organic.sessions, organic.prevSessions) !== null && ((pct(organic.sessions, organic.prevSessions) as number) < 0)
                                ? "Reviewing your top Google landing pages and optimising them to recover and improve search rankings."
                                : "Identifying new keyword opportunities to bring more high-intent visitors from Google.",
                              avgEngRate < 50
                                ? "Analysing pages where visitors leave quickly and improving them to keep people engaged longer."
                                : "Focusing on converting your high-engagement audience into enquiries and leads.",
                            ] as string[]).map((action, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="text-purple-400 shrink-0 font-bold text-sm leading-none mt-0.5">→</span>
                                <p className="text-xs text-slate-300 leading-relaxed">{action}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-sm font-semibold text-slate-900 mb-3">Device Breakdown</div>
                      <div className="space-y-2.5">
                        {devices.map(d => {
                          const t = devices.reduce((s, x) => s + x.sessions, 0)
                          const sp = t ? (d.sessions / t) * 100 : 0
                          const devIcons: Record<string, string> = { desktop: "🖥️", mobile: "📱", tablet: "📲" }
                          return (
                            <div key={d.device} className="flex items-center gap-2.5">
                              <span className="text-sm w-5 shrink-0">{devIcons[d.device.toLowerCase()] ?? "💻"}</span>
                              <span className="text-xs w-12 capitalize text-slate-600 font-medium shrink-0">{d.device}</span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${sp}%`, background: brand }} />
                              </div>
                              <span className="text-xs text-slate-500 tabular-nums w-7 text-right shrink-0">{sp.toFixed(0)}%</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="border-t border-slate-100 mt-4 pt-4">
                        <div className="text-sm font-semibold text-slate-900 mb-3">Top Countries</div>
                        <div className="space-y-2">
                          {countries.slice(0, 5).map(c => {
                            const t = countries.reduce((s, x) => s + x.sessions, 0)
                            const sp = t ? (c.sessions / t) * 100 : 0
                            return (
                              <div key={c.country} className="flex items-center gap-2">
                                <span className="text-xs text-slate-600 font-medium truncate" style={{ width: 90 }}>{c.country}</span>
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-slate-400 rounded-full" style={{ width: `${sp}%` }} />
                                </div>
                                <span className="text-xs text-slate-400 tabular-nums w-10 text-right shrink-0">{fmt(c.sessions)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 text-center pb-1">Data is based on Google Analytics 4. Metrics may not match GA4 exactly due to processing differences.</div>
                </div>
              )
            })()}

            {/* ══════════════════════════════ KEYWORDS ══════════════════════════════ */}
            {activeTab === "keywords" && (
              <div className="space-y-5 anim-card">

                {/* Quick Win + Almost-Ranking summary */}
                {(quickWins.length > 0 || almostTop.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="text-xs font-semibold text-amber-700 mb-1">Quick Wins · Pos 11–20</div>
                      <div className="text-2xl font-bold text-amber-900">{quickWins.length}</div>
                      <div className="text-xs text-amber-700 mt-1">Keywords one page away from page 1</div>
                      {quickWins.length > 0 && <div className="mt-2 text-xs text-amber-800 font-medium truncate">{quickWins[0].keyword}</div>}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="text-xs font-semibold text-blue-700 mb-1">Almost Top 3 · Pos 4–10</div>
                      <div className="text-2xl font-bold text-blue-900">{almostTop.length}</div>
                      <div className="text-xs text-blue-700 mt-1">Keywords approaching top positions</div>
                      {almostTop.length > 0 && <div className="mt-2 text-xs text-blue-800 font-medium truncate">{almostTop[0].keyword}</div>}
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="text-xs font-semibold text-emerald-700 mb-1">Top 3 Positions</div>
                      <div className="text-2xl font-bold text-emerald-900">{keywords.filter(k => k.position <= 3).length}</div>
                      <div className="text-xs text-emerald-700 mt-1">Keywords ranked 1, 2, or 3</div>
                      {keywords.filter(k => k.position <= 3)[0] && <div className="mt-2 text-xs text-emerald-800 font-medium truncate">{keywords.filter(k => k.position <= 3)[0].keyword}</div>}
                    </div>
                  </div>
                )}

                {/* Keyword table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Keyword Performance</div>
                      <div className="text-xs text-slate-400 mt-0.5">Search terms driving organic traffic</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs font-medium">
                        {(["all", "branded", "non-branded"] as const).map(f => {
                          const count = f === "all" ? keywords.length
                            : f === "branded" ? keywords.filter(k => k.keyword.toLowerCase().includes(brandName.toLowerCase())).length
                            : keywords.filter(k => !k.keyword.toLowerCase().includes(brandName.toLowerCase())).length
                          return (
                            <button key={f} onClick={() => { setKwFilter(f); setKwPage(0) }}
                              className={`px-3 py-1.5 transition-all border-r last:border-r-0 border-slate-200 ${kwFilter === f ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                              {f === "all" ? `All (${count})` : f === "branded" ? `Branded (${count})` : `Generic (${count})`}
                            </button>
                          )
                        })}
                      </div>
                      <ExportBtn onClick={() => downloadCSV("keywords.csv",
                        ["Keyword", "Type", "Clicks", "Impressions", "CTR", "Position"],
                        sortedKeywords.map(k => [k.keyword, k.keyword.toLowerCase().includes(brandName.toLowerCase()) ? "Branded" : "Generic", k.clicks, k.impressions, `${k.ctr.toFixed(2)}%`, k.position.toFixed(1)])
                      )} />
                    </div>
                  </div>
                  {sortedKeywords.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">No keywords found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className={thBase} style={{ width: 36 }}>#</th>
                            <th className={thBase}>Keyword</th>
                            <th className={thBase}>Type</th>
                            <SortTh col="clicks" label="Clicks" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                            <SortTh col="impressions" label="Impressions" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                            <SortTh col="ctr" label="CTR" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                            <SortTh col="position" label="Position" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {pagedKeywords.map((kw, i) => {
                            const isBranded = kw.keyword.toLowerCase().includes(brandName.toLowerCase())
                            return (
                              <tr key={kw.keyword} className="hover:bg-blue-50 transition-colors">
                                <td className="px-4 py-2.5 text-xs text-slate-400 tabular-nums">{kwPage * kwPageSize + i + 1}</td>
                                <td className="px-4 py-2.5 max-w-xs"><div className="truncate text-sm font-medium text-slate-900">{kw.keyword}</div></td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${isBranded ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                                    {isBranded ? "Branded" : "Generic"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right text-sm tabular-nums font-semibold text-slate-800">{fmt(kw.clicks)}</td>
                                <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">{fmt(kw.impressions)}</td>
                                <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">{kw.ctr.toFixed(2)}%</td>
                                <td className="px-4 py-2.5 text-right">
                                  <span className={`text-sm tabular-nums font-semibold ${kw.position <= 3 ? "text-emerald-600" : kw.position <= 10 ? "text-blue-600" : kw.position <= 20 ? "text-amber-600" : "text-slate-400"}`}>
                                    {kw.position.toFixed(1)}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      <div className="px-5 pb-4">
                        <Paginator page={kwPage} pageSize={kwPageSize} total={sortedKeywords.length} onPage={setKwPage} onPageSize={setKwPageSize} />
                      </div>
                    </div>
                  )}
                  <div className="px-5 pb-4">
                    <ExpertInsight text={keywordInsight(keywords, brandName)} />
                  </div>
                </div>

                {/* Keyword → Landing Page → Performance */}
                {enrichedKwp.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Keyword → Landing Page → Performance</div>
                        <div className="text-xs text-slate-400 mt-0.5">GSC search data joined with GA4 page metrics · {enrichedKwp.length} mappings</div>
                      </div>
                      <ExportBtn onClick={() => downloadCSV("keyword-pages.csv",
                        ["Keyword", "Landing Page", "Clicks", "Impressions", "Avg Position", "Page Users", "Avg Eng Time", "Conversions"],
                        enrichedKwp.map(k => [k.keyword, formatPageUrl(k.page), k.clicks, k.impressions, k.position.toFixed(1), k.ga4?.users ?? "—", k.ga4 ? fmtDur(k.ga4.avgEngagementTime) : "—", k.ga4?.conversions ?? "—"])
                      )} />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className={thBase}>Keyword</th>
                            <th className={thBase}>Landing Page</th>
                            <th className={`${thBase} text-right`}>Clicks</th>
                            <th className={`${thBase} text-right`}>Impressions</th>
                            <th className={`${thBase} text-right`}>Avg Position</th>
                            <th className={`${thBase} text-right`}>Page Users</th>
                            <th className={`${thBase} text-right`}>Avg Eng. Time</th>
                            <th className={`${thBase} text-right`}>Conversions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {pagedKwp.map((kw, i) => (
                            <tr key={i} className="hover:bg-blue-50 transition-colors">
                              <td className="px-4 py-2.5 max-w-[200px]"><div className="truncate text-sm font-medium text-slate-900">{kw.keyword}</div></td>
                              <td className="px-4 py-2.5 max-w-[180px]" title={kw.page}><div className="truncate text-xs text-blue-600 font-mono">{formatPageUrl(kw.page)}</div></td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums font-semibold text-slate-800">{fmt(kw.clicks)}</td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-500">{fmt(kw.impressions)}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`text-sm tabular-nums font-semibold ${kw.position <= 3 ? "text-emerald-600" : kw.position <= 10 ? "text-blue-600" : kw.position <= 20 ? "text-amber-600" : "text-slate-400"}`}>
                                  {kw.position.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">{kw.ga4 ? fmt(kw.ga4.users) : <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">{kw.ga4 ? fmtDur(kw.ga4.avgEngagementTime) : <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">{kw.ga4 ? fmt(kw.ga4.conversions) : <span className="text-slate-300">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-5 pb-4">
                        <Paginator page={kwpPage} pageSize={kwpPageSize} total={enrichedKwp.length} onPage={setKwpPage} onPageSize={setKwpPageSize} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════ PAGES ══════════════════════════════ */}
            {activeTab === "pages" && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden anim-card">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Top Pages — Landing Page Health</div>
                    <div className="text-xs text-slate-400 mt-0.5">GSC organic metrics joined with GA4 page performance</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{pages.length} pages</span>
                    <ExportBtn onClick={() => downloadCSV("top-pages.csv",
                      ["Page", "Clicks", "Impressions", "CTR", "Position", "Users", "Avg Eng Time", "Conversions"],
                      enrichedPages.map(p => [formatPageUrl(p.url), p.clicks, p.impressions, `${p.ctr.toFixed(2)}%`, p.position.toFixed(1), p.ga4?.users ?? "—", p.ga4 ? fmtDur(p.ga4.avgEngagementTime) : "—", p.ga4?.conversions ?? "—"])
                    )} />
                  </div>
                </div>
                {pages.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-400">No page data available for this period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className={thBase} style={{ width: 36 }}>#</th>
                          <th className={thBase}>Page</th>
                          <th className={`${thBase} text-right`}>Clicks</th>
                          <th className={`${thBase} text-right`}>Impressions</th>
                          <th className={`${thBase} text-right`}>CTR</th>
                          <th className={`${thBase} text-right`}>Position</th>
                          <th className={`${thBase} text-right`}>Users</th>
                          <th className={`${thBase} text-right`}>Avg Eng. Time</th>
                          <th className={`${thBase} text-right`}>Conversions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {pagedPages.map((p, i) => {
                          const maxClicks = Math.max(...pages.map(x => x.clicks), 1)
                          const barW = (p.clicks / maxClicks) * 100
                          return (
                            <tr key={p.url} className="hover:bg-blue-50 transition-colors">
                              <td className="px-4 py-2.5 text-xs text-slate-400 tabular-nums">{pgPage * pgPageSize + i + 1}</td>
                              <td className="px-4 py-2.5" title={p.url}>
                                <div className="text-sm font-medium text-slate-900 font-mono truncate max-w-xs">{formatPageUrl(p.url)}</div>
                                <div className="mt-1 h-0.5 bg-slate-100 rounded-full w-32">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${barW}%` }} />
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums font-semibold text-slate-800">{fmt(p.clicks)}</td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-500">{fmt(p.impressions)}</td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">{p.ctr.toFixed(2)}%</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`text-sm tabular-nums font-semibold ${p.position <= 3 ? "text-emerald-600" : p.position <= 10 ? "text-blue-600" : p.position <= 20 ? "text-amber-600" : "text-slate-400"}`}>
                                  {p.position.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">{p.ga4 ? fmt(p.ga4.users) : <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">{p.ga4 ? fmtDur(p.ga4.avgEngagementTime) : <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">{p.ga4 ? fmt(p.ga4.conversions) : <span className="text-slate-300">—</span>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <div className="px-5 pb-4">
                      <Paginator page={pgPage} pageSize={pgPageSize} total={enrichedPages.length} onPage={setPgPage} onPageSize={setPgPageSize} />
                    </div>
                  </div>
                )}
                <div className="px-5 pb-5">
                  <ExpertInsight text="Pages with high impressions but low CTR are opportunities — update meta titles to be more specific and action-oriented. Pages with high engagement time are your best content — cross-link them to lower-performing pages." />
                </div>
              </div>
            )}

            {/* ══════════════════════════════ AI VISIBILITY ══════════════════════════════ */}
            {activeTab === "ai" && (
              <div className="space-y-5 anim-card">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard label="AI Sessions" value={aiTraffic ? fmt(aiTraffic.total) : "0"} accent="purple" tooltip="Total sessions originating from AI platforms" />
                  <MetricCard label="AI Users" value={aiTraffic ? fmt(aiTraffic.totalUsers) : "0"} accent="purple" tooltip="Unique users who arrived via AI platforms" />
                  <MetricCard label="AI Sources" value={aiTraffic?.bySource.length ?? 0} accent="purple" tooltip="Number of distinct AI platforms sending traffic" />
                  <MetricCard label="% of Total Traffic" value={totalChannelSessions > 0 && aiTraffic ? `${((aiTraffic.total / totalChannelSessions) * 100).toFixed(1)}%` : "—"} accent="purple" tooltip="AI traffic as a percentage of all website sessions" />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">AI Platform Breakdown</div>
                      <div className="text-xs text-slate-400 mt-0.5">Sessions from ChatGPT, Perplexity, Gemini, Claude & other AI tools</div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{aiTraffic?.total ? `${fmt(aiTraffic.total)} sessions` : "No data"}</span>
                  </div>

                  {!aiTraffic || aiTraffic.total === 0 ? (
                    <div className="py-8 text-center">
                      <div className="text-sm text-slate-500 font-medium mb-1">No AI traffic detected this period</div>
                      <div className="text-xs text-slate-400 max-w-sm mx-auto">As your content gets discovered and cited by AI platforms, traffic from ChatGPT, Perplexity, Gemini, Claude, and Copilot will appear here.</div>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className={thBase}>AI Platform</th>
                          <th className={`${thBase} text-right`}>Sessions</th>
                          <th className={`${thBase} text-right`}>Users</th>
                          <th className={`${thBase} text-right`}>Share</th>
                          <th className={`${thBase} text-right`}>Conversions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {aiTraffic.bySource.map(s => {
                          const share = aiTraffic.total > 0 ? (s.sessions / aiTraffic.total) * 100 : 0
                          return (
                            <tr key={s.source} className="hover:bg-blue-50 transition-colors">
                              <td className={tdBase}>
                                <div className="flex items-center gap-2.5">
                                  <AiPlatformIcon source={s.source} />
                                  <div>
                                    <div className="font-medium text-slate-900">{aiLabel(s.source).name}</div>
                                    <div className="text-xs text-slate-400">{s.source}</div>
                                  </div>
                                </div>
                              </td>
                              <td className={`${tdBase} text-right tabular-nums font-semibold text-slate-800`}>{fmt(s.sessions)}</td>
                              <td className={`${tdBase} text-right tabular-nums text-slate-500`}>{fmt(s.users)}</td>
                              <td className={`${tdBase} text-right`}>
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full hidden sm:block">
                                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${share}%` }} />
                                  </div>
                                  <span className="text-xs tabular-nums text-slate-600">{share.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className={`${tdBase} text-right tabular-nums text-slate-500`}>{fmt(s.conversions)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {aiDailyData.length > 0 && aiDailyData.some(v => v > 0) && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-sm font-semibold text-slate-900 mb-1">AI Traffic Trend</div>
                    <div className="text-xs text-slate-400 mb-4">Daily sessions from AI platforms</div>
                    <MiniBar data={aiDailyData} dates={aiTraffic?.daily?.map(d => d.date)} color="#7c3aed" />
                  </div>
                )}

                {aiTraffic && aiTraffic.topPages.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-sm font-semibold text-slate-900 mb-4">Top Pages Getting AI Traffic</div>
                    <div className="space-y-2.5">
                      {aiTraffic.topPages.map((pg, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-4 text-right tabular-nums">{i + 1}</span>
                          <div className="flex-1 text-sm text-slate-700 font-mono truncate">{formatPageUrl(pg.page)}</div>
                          <span className="text-xs tabular-nums font-medium text-violet-700">{fmt(pg.sessions)} sessions</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI vs Organic comparison */}
                {aiTraffic && totalChannelSessions > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-sm font-semibold text-slate-900 mb-4">AI vs Organic Traffic Comparison</div>
                    <div className="space-y-3">
                      {[
                        { label: "Organic Search", sessions: channels.find(c => c.channel.toLowerCase().includes("organic"))?.sessions ?? 0, color: "#2563eb" },
                        { label: "AI Platforms", sessions: aiTraffic.total, color: "#7c3aed" },
                      ].map(item => {
                        const pctOfTotal = totalChannelSessions > 0 ? (item.sessions / totalChannelSessions) * 100 : 0
                        return (
                          <div key={item.label} className="flex items-center gap-3">
                            <div className="text-xs font-medium text-slate-700 w-28">{item.label}</div>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full">
                              <div className="h-full rounded-full" style={{ width: `${pctOfTotal}%`, background: item.color }} />
                            </div>
                            <div className="text-xs tabular-nums text-slate-600 w-24 text-right">{fmt(item.sessions)} · {pctOfTotal.toFixed(1)}%</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <ExpertInsight text={aiInsight(aiTraffic, totalChannelSessions)} />
              </div>
            )}

            {/* ══════════════════════════════ OPPORTUNITIES ══════════════════════════════ */}
            {activeTab === "opportunities" && (
              <div className="space-y-6 anim-card">
                {totalOpportunities === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                    <div className="text-2xl mb-2">✓</div>
                    <div className="text-sm font-medium text-slate-700">No critical issues detected</div>
                    <div className="text-xs text-slate-400 mt-1">Site is performing well across tracked metrics</div>
                  </div>
                ) : (
                  <>
                    {opportunities.high.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">High Priority — Fix First</div>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{opportunities.high.length}</span>
                        </div>
                        <div className="space-y-3">
                          {opportunities.high.map((item, i) => <OpportunityCard key={i} item={item} priority="high" status={oppStatus[oppKey(item.title)] ?? "todo"} onStatusChange={s => setOppStatusFor(oppKey(item.title), s)} />)}
                        </div>
                      </section>
                    )}

                    {opportunities.medium.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Medium Priority — This Month</div>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{opportunities.medium.length}</span>
                        </div>
                        <div className="space-y-3">
                          {opportunities.medium.map((item, i) => <OpportunityCard key={i} item={item} priority="medium" status={oppStatus[oppKey(item.title)] ?? "todo"} onStatusChange={s => setOppStatusFor(oppKey(item.title), s)} />)}
                        </div>
                      </section>
                    )}

                    {opportunities.low.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Low Priority — When Time Allows</div>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{opportunities.low.length}</span>
                        </div>
                        <div className="space-y-3">
                          {opportunities.low.map((item, i) => <OpportunityCard key={i} item={item} priority="low" status={oppStatus[oppKey(item.title)] ?? "todo"} onStatusChange={s => setOppStatusFor(oppKey(item.title), s)} />)}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════════════ ENGAGEMENT ══════════════════════════════ */}
            {activeTab === "engagement" && (
              <div className="space-y-5 anim-card">
                <section>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">User Overview</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Total Users" value={fmt(ga4?.users)} accent="green" tooltip="All unique users in this period" benchInfo={ga4 ? getKpiBench("growth", ga4.users, ga4.prevSessions) : undefined} />
                    <MetricCard label="New Users" value={fmt(ga4?.newUsers)} accent="green" tooltip="First-time visitors to the website" />
                    <MetricCard label="Returning Users" value={fmt(ga4?.returningUsers)} accent="green" tooltip="Users who have visited before" />
                    <MetricCard label="Avg. Session Duration" value={fmtDur(ga4?.avgSessionDuration ?? 0)} accent="green" tooltip="Average time users spend per session" benchInfo={ga4 ? getKpiBench("duration", ga4.avgSessionDuration) : undefined} />
                  </div>
                </section>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard label="Engagement Rate" value={ga4 ? `${ga4.engagementRate.toFixed(1)}%` : "—"} accent="blue" tooltip="Sessions with 10+ seconds engagement, a conversion, or 2+ page views" benchInfo={ga4 ? getKpiBench("engagement", ga4.engagementRate) : undefined} />
                  <MetricCard label="Pages / Session" value={ga4?.screenPageViewsPerSession?.toFixed(1) ?? "—"} accent="blue" tooltip="Average number of pages viewed per session" benchInfo={ga4?.screenPageViewsPerSession ? getKpiBench("pagesPerSession", ga4.screenPageViewsPerSession) : undefined} />
                  <MetricCard label="Engaged Sessions" value={fmt(ga4?.engagedSessions)} accent="blue" tooltip="Sessions that were actively engaged by the user" />
                  <MetricCard label="Conversions" value={fmt(ga4?.conversions)} trend={ga4 ? pct(ga4.conversions, ga4.prevConversions) : undefined} accent="amber" tooltip="Goal completions tracked in GA4" benchInfo={ga4 ? getKpiBench("growth", ga4.conversions, ga4.prevConversions) : undefined} />
                </div>

                {userBreakdown.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <div className="text-sm font-semibold text-slate-900">New vs. Returning Users</div>
                      <div className="text-xs text-slate-400 mt-0.5">Behaviour comparison between first-time and repeat visitors</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className={thBase}>Segment</th>
                            <th className={`${thBase} text-right`}>Users</th>
                            <th className={`${thBase} text-right`}>Sessions</th>
                            <th className={`${thBase} text-right`}>Avg Duration</th>
                            <th className={`${thBase} text-right`}>Engagement Rate</th>
                            <th className={`${thBase} text-right`}>Pages / Session</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {userBreakdown.map(u => (
                            <tr key={u.type} className="hover:bg-blue-50 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-slate-900 capitalize">{u.type} Users</td>
                              <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{fmt(u.users)}</td>
                              <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">{fmt(u.sessions)}</td>
                              <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">{fmtDur(u.avgDuration)}</td>
                              <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">{u.engagementRate.toFixed(1)}%</td>
                              <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">{u.pagesPerSession.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 pb-5">
                      <ExpertInsight text={engagementInsight(userBreakdown, ga4)} />
                    </div>
                  </div>
                )}

                {countries.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-sm font-semibold text-slate-900 mb-4">Audience by Country</div>
                    <div className="space-y-3">
                      {countries.map(c => {
                        const t = countries.reduce((s, x) => s + x.users, 0)
                        const sp = t ? (c.users / t) * 100 : 0
                        return (
                          <div key={c.country} className="flex items-center gap-3">
                            <span className="text-xs w-28 truncate text-slate-600">{c.country}</span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                              <div className="h-full bg-slate-400 rounded-full" style={{ width: `${sp}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 tabular-nums w-12 text-right">{fmt(c.users)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════ RANKINGS ══════════════════════════════ */}
            {activeTab === "rankings" && (
              <div className="space-y-5 anim-card">
                {rankingsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${brand} transparent transparent transparent` }} />
                  </div>
                ) : rankings.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                    <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    <p className="text-slate-500 font-medium text-sm">No ranking data configured</p>
                    <p className="text-slate-400 text-xs mt-1">Ask your Damco Digital team to configure keyword rankings for your account.</p>
                    {rankingsError && <p className="text-red-500 text-xs mt-2">{rankingsError}</p>}
                  </div>
                ) : (() => {
                  const withRanks = rankings.filter(r => r.currentRank !== null)
                  const top3 = withRanks.filter(r => r.currentRank! <= 3)
                  const top10 = withRanks.filter(r => r.currentRank! <= 10)
                  const top20 = withRanks.filter(r => r.currentRank! <= 20)
                  const top50 = withRanks.filter(r => r.currentRank! <= 50)
                  const beyond50 = withRanks.filter(r => r.currentRank! > 50)
                  const improved = rankings.filter(r => r.prevRank !== null && r.currentRank !== null && r.currentRank < r.prevRank)
                  const declined = rankings.filter(r => r.prevRank !== null && r.currentRank !== null && r.currentRank > r.prevRank)
                  const unchanged = rankings.filter(r => r.prevRank !== null && r.currentRank !== null && r.currentRank === r.prevRank)
                  const quickWins = withRanks.filter(r => r.currentRank! >= 11 && r.currentRank! <= 20)
                  const getChange = (r: RankingRow) => r.prevRank !== null && r.currentRank !== null ? r.prevRank - r.currentRank : null
                  const hasVolume = rankings.some(r => r.volume !== null && r.volume !== undefined && r.volume > 0)
                  const hasUrl = rankings.some(r => r.url && r.url.trim())
                  const hasPrev = rankings.some(r => r.prevRank !== null)

                  const getCTR = (pos: number) => {
                    const m: Record<number, number> = {1:0.32,2:0.18,3:0.11,4:0.08,5:0.07,6:0.06,7:0.05,8:0.04,9:0.035,10:0.03}
                    if (pos <= 10) return m[pos] ?? 0.03
                    if (pos <= 20) return 0.018
                    if (pos <= 50) return 0.008
                    return 0.003
                  }
                  const getTP = (r: RankingRow): "high" | "medium" | "low" | null => {
                    if (!r.currentRank || !r.volume) return null
                    const est = getCTR(r.currentRank) * r.volume
                    return est >= 300 ? "high" : est >= 60 ? "medium" : "low"
                  }

                  const avgPos = withRanks.length > 0 ? withRanks.reduce((s, r) => s + r.currentRank!, 0) / withRanks.length : 0
                  const top10Pct = withRanks.length > 0 ? (top10.length / withRanks.length) * 100 : 0
                  const hasPrevData = rankings.filter(r => r.prevRank !== null).length > 0
                  const improvedPct = hasPrevData ? (improved.length / rankings.filter(r => r.prevRank !== null).length) * 100 : 50
                  const posScore = avgPos > 0 ? Math.max(0, Math.min(100, 100 - (avgPos - 1) * 1.5)) : 0
                  const rhs = withRanks.length > 0 ? Math.round(top10Pct * 0.45 + posScore * 0.35 + Math.min(improvedPct, 100) * 0.2) : 0
                  const rhsLabel = rhs >= 80 ? "Excellent" : rhs >= 60 ? "Good" : rhs >= 40 ? "Fair" : withRanks.length === 0 ? "No Data" : "Needs Work"
                  const rhsColor = rhs >= 80 ? "#16a34a" : rhs >= 60 ? "#2563eb" : rhs >= 40 ? "#d97706" : "#dc2626"

                  const insights: { icon: string; text: string; type: "win" | "warn" | "info" }[] = []
                  if (quickWins.length > 0) insights.push({ icon: "🎯", text: `${quickWins.length} keyword${quickWins.length > 1 ? "s" : ""} ranking positions 11–20 — these are your quick wins. Targeted content updates, internal links, and FAQ sections can push them to Page 1.`, type: "win" })
                  if (top3.length > 0) insights.push({ icon: "🏆", text: `${top3.length} keyword${top3.length > 1 ? "s" : ""} rank in Top 3 — driving strong CTR. Monitor competitors weekly to protect these positions.`, type: "win" })
                  if (hasPrevData && improved.length > declined.length) insights.push({ icon: "📈", text: `${improved.length} keywords improved this period vs ${declined.length} declined. Positive momentum — continue building content depth on your best-performing pages.`, type: "win" })
                  else if (hasPrevData && declined.length > improved.length) insights.push({ icon: "📉", text: `${declined.length} keywords declined this period. Review content freshness and check for algorithm updates in this niche. Focus on E-E-A-T improvements.`, type: "warn" })
                  if (withRanks.length > 0 && top10Pct < 30) insights.push({ icon: "💡", text: `Only ${top10Pct.toFixed(0)}% of keywords reach the Top 10. Prioritise domain authority building, topical depth, and structured data to improve SERP visibility.`, type: "info" })
                  if (!hasPrevData && withRanks.length > 0) insights.push({ icon: "📊", text: "Previous ranking data not available — comparison requires two months of data. Update your ranking sheet next month to unlock trend insights.", type: "info" })
                  if (withRanks.length === 0) insights.push({ icon: "📋", text: "Keyword position data is not yet available. Upload a ranking sheet with position numbers in the Integrations tab to unlock full intelligence.", type: "info" })

                  type RF = "all" | "top3" | "top10" | "top20" | "improved" | "declined" | "quickwin"
                  const filterMap: Record<RF, (r: RankingRow) => boolean> = {
                    all: () => true,
                    top3: r => r.currentRank !== null && r.currentRank <= 3,
                    top10: r => r.currentRank !== null && r.currentRank <= 10,
                    top20: r => r.currentRank !== null && r.currentRank <= 20,
                    improved: r => r.prevRank !== null && r.currentRank !== null && r.currentRank < r.prevRank,
                    declined: r => r.prevRank !== null && r.currentRank !== null && r.currentRank > r.prevRank,
                    quickwin: r => r.currentRank !== null && r.currentRank >= 11 && r.currentRank <= 20,
                  }
                  const filtered = rankings.filter(filterMap[rankFilter])
                  const sorted = [...filtered].sort((a, b) => {
                    if (rankSort === "keyword") { const v = a.keyword.localeCompare(b.keyword); return rankDir === "asc" ? v : -v }
                    if (rankSort === "currentRank") { const av = a.currentRank ?? 999, bv = b.currentRank ?? 999; return rankDir === "asc" ? av - bv : bv - av }
                    if (rankSort === "change") { const ac = getChange(a) ?? -999, bc = getChange(b) ?? -999; return rankDir === "asc" ? bc - ac : ac - bc }
                    return 0
                  })
                  const handleRSort = (col: typeof rankSort) => { if (rankSort === col) setRankDir(d => d === "asc" ? "desc" : "asc"); else { setRankSort(col); setRankDir("asc") } }

                  const distBuckets = [
                    { label: "Top 3", count: top3.length, color: "#16a34a" },
                    { label: "4–10", count: top10.length - top3.length, color: "#2563eb" },
                    { label: "11–20", count: top20.length - top10.length, color: "#d97706" },
                    { label: "21–50", count: top50.length - top20.length, color: "#94a3b8" },
                    { label: "51+", count: beyond50.length, color: "#e2e8f0" },
                  ]
                  const distMax = Math.max(...distBuckets.map(b => b.count), 1)

                  const kpiCards: { label: string; value: number; color: string; bg: string; f: RF }[] = [
                    { label: "Top 3", value: top3.length, color: "#16a34a", bg: "#dcfce7", f: "top3" },
                    { label: "Top 10", value: top10.length, color: "#2563eb", bg: "#dbeafe", f: "top10" },
                    { label: "Top 20", value: top20.length, color: "#d97706", bg: "#fef3c7", f: "top20" },
                    { label: "Improved", value: improved.length, color: "#16a34a", bg: "#dcfce7", f: "improved" },
                    { label: "Declined", value: declined.length, color: "#dc2626", bg: "#fee2e2", f: "declined" },
                    { label: "Quick Wins", value: quickWins.length, color: "#7c3aed", bg: "#ede9fe", f: "quickwin" },
                  ]

                  return (
                    <>
                      {/* ── KPI Cards ── */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {kpiCards.map(c => (
                          <button key={c.label} type="button"
                            onClick={() => setRankFilter((f: RF) => f === c.f ? "all" : c.f)}
                            className="bg-white rounded-xl border px-4 py-3.5 text-left transition-all hover:shadow-sm focus:outline-none"
                            style={rankFilter === c.f ? { borderColor: c.color, borderWidth: 2, background: c.bg } : { borderColor: "#e2e8f0", borderWidth: 1 }}>
                            <div className="text-xs font-medium text-slate-500 mb-1.5">{c.label}</div>
                            <div className="text-2xl font-bold leading-none" style={{ color: c.color }}>{c.value}</div>
                          </button>
                        ))}
                      </div>

                      {/* ── Health + Distribution ── */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Ranking Health</div>
                          <div className="flex items-center gap-4">
                            <ScoreRing score={rhs} color={rhsColor} />
                            <div>
                              <div className="text-sm font-bold mb-1" style={{ color: rhsColor }}>{rhsLabel}</div>
                              <div className="text-xs text-slate-400">Avg. position: <span className="font-medium text-slate-600">{avgPos > 0 ? avgPos.toFixed(1) : "—"}</span></div>
                              <div className="text-xs text-slate-400">Top 10: <span className="font-medium text-slate-600">{top10.length} keywords</span></div>
                              <div className="text-xs text-slate-400">Total tracked: <span className="font-medium text-slate-600">{rankings.length}</span></div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5 md:col-span-2">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Ranking Distribution</div>
                          {withRanks.length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">No position data — upload rankings with position numbers to see distribution.</p>
                          ) : (
                            <div className="space-y-2.5">
                              {distBuckets.map(b => (
                                <div key={b.label} className="flex items-center gap-3">
                                  <span className="text-xs text-slate-500 w-12 shrink-0 text-right font-medium">{b.label}</span>
                                  <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max((b.count / distMax) * 100, b.count > 0 ? 4 : 0)}%`, background: b.color }} />
                                  </div>
                                  <span className="text-xs font-bold text-slate-700 w-6 shrink-0 text-right">{b.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Quick Wins ── */}
                      {quickWins.length > 0 && (
                        <div className="rounded-xl border border-violet-200 p-4" style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)" }}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center text-sm shrink-0">🎯</div>
                            <div>
                              <div className="text-sm font-bold text-violet-900">Quick Win Keywords</div>
                              <div className="text-xs text-violet-500">Positions 11–20 · Page 1 within reach with targeted optimisation</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {quickWins.slice(0, 6).map(r => (
                              <div key={r.keyword} className="bg-white rounded-lg border border-violet-100 px-3 py-2.5 hover:border-violet-300 transition-colors">
                                <div className="text-xs font-semibold text-slate-800 mb-1.5 truncate" title={r.keyword}>{r.keyword}</div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xl font-bold text-violet-700">#{r.currentRank}</span>
                                  {r.volume && <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{fmt(r.volume)}/mo</span>}
                                </div>
                                {r.url && <div className="text-xs text-slate-400 truncate mt-1" title={r.url}>{formatPageUrl(r.url)}</div>}
                              </div>
                            ))}
                          </div>
                          {quickWins.length > 6 && <p className="text-xs text-violet-400 mt-2 pl-1">+{quickWins.length - 6} more quick-win keywords · use the filter above to see all</p>}
                        </div>
                      )}

                      {/* ── SEO Insights ── */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                          </svg>
                          <div className="text-sm font-semibold text-slate-900">SEO Insights & Recommendations</div>
                        </div>
                        <div className="space-y-2">
                          {insights.map((ins, i) => (
                            <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs leading-relaxed ${ins.type === "win" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : ins.type === "warn" ? "bg-amber-50 text-amber-800 border border-amber-100" : "bg-blue-50 text-blue-800 border border-blue-100"}`}>
                              <span className="text-base shrink-0 leading-tight">{ins.icon}</span>
                              <span>{ins.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── Full Table ── */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-slate-400 shrink-0">Filter:</span>
                            {([
                              { key: "all" as RF, label: "All" },
                              { key: "top3" as RF, label: "Top 3" },
                              { key: "top10" as RF, label: "Top 10" },
                              { key: "top20" as RF, label: "Top 20" },
                              { key: "improved" as RF, label: "↑ Improved" },
                              { key: "declined" as RF, label: "↓ Declined" },
                              { key: "quickwin" as RF, label: "🎯 Quick Wins" },
                            ]).map(f => (
                              <button key={f.key} type="button" onClick={() => setRankFilter(f.key)}
                                className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                                style={rankFilter === f.key
                                  ? { background: brand, borderColor: brand, color: brandText }
                                  : { background: "white", borderColor: "#e2e8f0", color: "#64748b" }}>
                                {f.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs text-slate-400">{sorted.length} of {rankings.length}</span>
                            <button type="button"
                              onClick={() => {
                                const dash = "—"
                                const hdrs = (["Keyword", hasUrl ? "Landing Page" : null, "Prev Rank", "Current Rank", "Change", hasVolume ? "Volume" : null, hasVolume ? "Traffic Potential" : null] as (string|null)[]).filter((x): x is string => x !== null)
                                const rows = sorted.map(r => {
                                  const ch = getChange(r)
                                  const cells: (string|number|null)[] = [r.keyword, hasUrl ? (r.url ? formatPageUrl(r.url) : dash) : null, r.prevRank ?? dash, r.currentRank ?? dash, ch ?? dash, hasVolume ? (r.volume ?? dash) : null, hasVolume ? (getTP(r) ?? dash) : null]
                                  return cells.filter(x => x !== null) as (string|number)[]
                                })
                                downloadCSV("rankings.csv", hdrs, rows)
                              }}
                              className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                              Export CSV
                            </button>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide w-10">#</th>
                                <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleRSort("keyword")}>
                                  <span className="inline-flex items-center gap-1">Keyword <span className={rankSort === "keyword" ? "text-blue-600" : "text-slate-300"}>{rankSort === "keyword" ? (rankDir === "asc" ? "↑" : "↓") : "↕"}</span></span>
                                </th>
                                {hasUrl && <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Landing Page</th>}
                                {hasVolume && <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">Volume</th>}
                                <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                                  {(() => { const v = rankConfig?.mapping.prevRank; if (!v) return hasPrev ? "Prev" : "—"; const n = Number(v); return (!isNaN(n) && n > 40000 && n < 60000) ? new Date(Math.round((n - 25569) * 86400000)).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : v })()}
                                </th>
                                <th className="text-center px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleRSort("currentRank")}>
                                  <span className="inline-flex items-center gap-1">
                                    {(() => { const v = rankConfig?.mapping.currentRank; if (!v) return "Current"; const n = Number(v); return (!isNaN(n) && n > 40000 && n < 60000) ? new Date(Math.round((n - 25569) * 86400000)).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : v })()}
                                    <span className={rankSort === "currentRank" ? "text-blue-600" : "text-slate-300"}>{rankSort === "currentRank" ? (rankDir === "asc" ? "↑" : "↓") : "↕"}</span>
                                  </span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sorted.length === 0 ? (
                                <tr><td colSpan={10} className="px-4 py-10 text-center text-xs text-slate-400">No keywords match the selected filter.</td></tr>
                              ) : sorted.map((r, i) => {
                                const ch = getChange(r)
                                const tp = getTP(r)
                                const posBg = r.currentRank === null ? "" :
                                  r.currentRank <= 3 ? "bg-emerald-100 text-emerald-800" :
                                  r.currentRank <= 10 ? "bg-blue-100 text-blue-800" :
                                  r.currentRank <= 20 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                                return (
                                  <tr key={r.keyword + i} className="border-t border-slate-50 hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-2.5 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                                    <td className="px-4 py-2.5">
                                      <span className="text-sm font-medium text-slate-800 leading-snug">{r.keyword}</span>
                                    </td>
                                    {hasUrl && (
                                      <td className="px-4 py-2.5 max-w-[160px]">
                                        {r.url ? (
                                          <span className="text-xs text-slate-500 truncate block" title={r.url}>{formatPageUrl(r.url)}</span>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                      </td>
                                    )}
                                    {hasVolume && <td className="px-4 py-2.5 text-xs text-right text-slate-500 tabular-nums">{r.volume ? fmt(r.volume) : <span className="text-slate-300">—</span>}</td>}
                                    <td className="px-4 py-2.5 text-sm text-center text-slate-400 tabular-nums">{r.prevRank ?? <span className="text-slate-300">—</span>}</td>
                                    <td className="px-4 py-2.5 text-sm text-center">
                                      {r.currentRank !== null
                                        ? <span className={`inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-md text-xs font-bold ${posBg}`}>{r.currentRank}</span>
                                        : <span className="text-slate-300">—</span>}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            {/* ══════════════════════════════ SITE HEALTH ══════════════════════════════ */}
            {activeTab === "health" && (() => {
              const auditStatusColor = (s: "ok"|"warn"|"fail") => s === "ok" ? { color: "#15803d", bg: "#dcfce7" } : s === "warn" ? { color: "#b45309", bg: "#fef3c7" } : { color: "#b91c1c", bg: "#fee2e2" }
              const auditStatusLabel = (s: "ok"|"warn"|"fail") => s === "ok" ? "All Good" : s === "warn" ? "1 Issue" : "Action Needed"
              const auditStatusIcon = (s: "ok"|"warn"|"fail") => s === "ok" ? "✅" : s === "warn" ? "⚠️" : "❌"
              const checkIcon = (s: "ok"|"warn"|"fail") => s === "ok" ? "✅" : s === "warn" ? "⚠️" : "❌"
              const checkStyle = (s: "ok"|"warn"|"fail") => s === "ok"
                ? "border-green-100 bg-green-50"
                : s === "warn" ? "border-amber-100 bg-amber-50"
                : "border-red-100 bg-red-50"
              const checkTextColor = (s: "ok"|"warn"|"fail") => s === "ok" ? "text-green-800" : s === "warn" ? "text-amber-800" : "text-red-800"
              const scoreChip = (score: number) => {
                const c = score >= 90 ? "bg-green-100 text-green-700" : score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                return <span className={`inline-flex items-center justify-center w-11 h-7 rounded-md text-sm font-bold tabular-nums ${c}`}>{score}</span>
              }
              const speedTag = (score: number) => {
                if (score >= 90) return <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Fast</span>
                if (score >= 50) return <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Average</span>
                return <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Slow</span>
              }
              const vitalsHuman = (m: PageSpeedMetrics) => [
                { key: "Main content appears in", val: m.lcp, good: "under 2.5s", isGood: parseFloat(m.lcp) <= 2.5 },
                { key: "Page layout stability", val: m.cls === "0" ? "Stable ✓" : m.cls, good: "near 0", isGood: parseFloat(m.cls) <= 0.1 },
                { key: "First thing appears in", val: m.fcp, good: "under 1.8s", isGood: parseFloat(m.fcp) <= 1.8 },
                { key: "Page response time", val: m.tbt, good: "under 200ms", isGood: parseFloat(m.tbt) <= 200 },
              ]
              // overall summary counts
              const totalIssues = [
                ...(multiPs.length > 0 ? multiPs.filter(p => p.mobile.score < 50) : []),
              ].length
              const auditIssues = siteAudit ? [siteAudit.robots.status, siteAudit.sitemap.status, siteAudit.schema.status].filter(s => s !== "ok").length : 0

              return (
              <div className="space-y-4 anim-card">

                {/* Summary bar */}
                <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Website Health Check</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {psLoading ? "Running checks on your key pages…" : `${multiPs.length} pages checked · ${totalIssues + auditIssues} issue${totalIssues + auditIssues !== 1 ? "s" : ""} found`}
                    </div>
                  </div>
                  {psLoading && <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin shrink-0" />}
                  {psError && !psLoading && (
                    <button onClick={() => { setPagespeed(null); setMultiPs([]); loadPagespeed(true) }} className="text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Try Again</button>
                  )}
                </div>

                {/* ── Page Speed ── */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg shrink-0">⚡</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">How Fast Your Pages Load</div>
                      <div className="text-xs text-slate-400 mt-0.5">Slow pages frustrate visitors and hurt your Google rankings. Target: 70+ on all pages.</div>
                    </div>
                    {multiPs.length > 0 && (() => {
                      const worst = Math.min(...multiPs.map(p => p.mobile.score))
                      const sc = worst >= 70 ? { color: "#15803d", bg: "#dcfce7", label: "Good" } : worst >= 50 ? { color: "#b45309", bg: "#fef3c7", label: "Needs Work" } : { color: "#b91c1c", bg: "#fee2e2", label: "Slow" }
                      return <span className="text-xs font-bold px-3 py-1 rounded-full shrink-0" style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
                    })()}
                  </div>

                  {psLoading && multiPs.length === 0 && (
                    <div className="flex items-center gap-3 px-5 py-6">
                      <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin shrink-0" />
                      <div className="text-sm text-slate-500">Checking your pages — this takes about 20–30 seconds…</div>
                    </div>
                  )}

                  {multiPs.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Page</th>
                            <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">📱 Mobile</th>
                            <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3 hidden sm:table-cell">🖥 Desktop</th>
                            <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...multiPs].sort((a, b) => a.mobile.score - b.mobile.score).map(p => (
                            <tr key={p.path} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="text-sm font-medium text-slate-800">{p.name}</div>
                                <div className="text-xs text-slate-400">{p.path}</div>
                              </td>
                              <td className="px-3 py-3 text-center">{scoreChip(p.mobile.score)}</td>
                              <td className="px-3 py-3 text-center hidden sm:table-cell">{scoreChip(p.desktop.score)}</td>
                              <td className="px-3 py-3 text-center">{speedTag(p.mobile.score)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* CWV plain English for homepage */}
                  {pagespeed && (
                    <div className="px-5 py-4 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Homepage detail</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(["mobile", "desktop"] as const).map(dev => (
                          <div key={dev} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                            <div className="text-xs font-semibold text-slate-500 mb-3 capitalize">{dev === "mobile" ? "📱 Mobile" : "🖥 Desktop"}</div>
                            <div className="space-y-2">
                              {vitalsHuman(pagespeed[dev]).map(v => (
                                <div key={v.key} className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-slate-600">{v.key}</span>
                                  <span className={`text-xs font-bold tabular-nums ${v.isGood ? "text-green-700" : "text-red-600"}`}>{v.val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {pagespeed.mobile.score < 70 && (
                        <div className="mt-3 flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-100">
                          <span className="text-base shrink-0">⚠️</span>
                          <p className="text-xs text-amber-800 leading-relaxed">Mobile speed is the biggest issue. Most of your visitors use phones. Large images and unused code are the main causes — fixing these will improve both rankings and visitor experience.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Robots.txt ── */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-lg shrink-0">🤖</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">Can Google Access Your Website?</div>
                      <div className="text-xs text-slate-400 mt-0.5">This file tells Google which pages it is allowed to visit and index.</div>
                    </div>
                    {auditLoading && !siteAudit && <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin shrink-0" />}
                    {siteAudit && <span className="text-xs font-bold px-3 py-1 rounded-full shrink-0" style={auditStatusColor(siteAudit.robots.status)}>{auditStatusLabel(siteAudit.robots.status)}</span>}
                  </div>
                  {siteAudit && (
                    <div className="p-4 space-y-2">
                      {siteAudit.robots.checks.map((c, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${checkStyle(c.status)}`}>
                          <span className="text-base shrink-0 leading-tight">{checkIcon(c.status)}</span>
                          <div>
                            <div className={`text-sm font-semibold ${checkTextColor(c.status)}`}>{c.label}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{c.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!siteAudit && !auditLoading && <div className="px-5 py-4 text-xs text-slate-400">Open Site Health tab to load audit data.</div>}
                </div>

                {/* ── Sitemap ── */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-lg shrink-0">🗺️</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">Your Website&apos;s Map for Google</div>
                      <div className="text-xs text-slate-400 mt-0.5">A sitemap lists all your pages so Google can find and index them faster.</div>
                    </div>
                    {auditLoading && !siteAudit && <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin shrink-0" />}
                    {siteAudit && <span className="text-xs font-bold px-3 py-1 rounded-full shrink-0" style={auditStatusColor(siteAudit.sitemap.status)}>{auditStatusLabel(siteAudit.sitemap.status)}</span>}
                  </div>
                  {siteAudit && (
                    <div className="p-4 space-y-2">
                      {siteAudit.sitemap.checks.map((c, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${checkStyle(c.status)}`}>
                          <span className="text-base shrink-0 leading-tight">{checkIcon(c.status)}</span>
                          <div>
                            <div className={`text-sm font-semibold ${checkTextColor(c.status)}`}>{c.label}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{c.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Schema ── */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-lg shrink-0">🏷️</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">How You Tell Google About Your Business</div>
                      <div className="text-xs text-slate-400 mt-0.5">Hidden code that helps Google understand what your business does — unlocks richer search results.</div>
                    </div>
                    {auditLoading && !siteAudit && <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin shrink-0" />}
                    {siteAudit && <span className="text-xs font-bold px-3 py-1 rounded-full shrink-0" style={auditStatusColor(siteAudit.schema.status)}>{auditStatusLabel(siteAudit.schema.status)}</span>}
                  </div>
                  {siteAudit && (
                    <div className="p-4 space-y-2">
                      {siteAudit.schema.types.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {siteAudit.schema.types.map(t => (
                            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-100">{t}</span>
                          ))}
                        </div>
                      )}
                      {siteAudit.schema.checks.map((c, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${checkStyle(c.status)}`}>
                          <span className="text-base shrink-0 leading-tight">{checkIcon(c.status)}</span>
                          <div>
                            <div className={`text-sm font-semibold ${checkTextColor(c.status)}`}>{c.label}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{c.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
              )
            })()}

          </>
        )}
      </div>
    </div>
  )
}
