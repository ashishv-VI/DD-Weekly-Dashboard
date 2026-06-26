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
type TabKey = "overview" | "traffic" | "keywords" | "pages" | "ai" | "opportunities" | "engagement" | "health"

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

function calcHealthScore(gsc: GSCTotals | undefined, ga4: Partial<GA4Totals> | undefined, aiTraffic: AITrafficData | null | undefined) {
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

  const score = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0
  const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs Work"
  const color = score >= 85 ? "#16a34a" : score >= 70 ? "#2563eb" : score >= 50 ? "#d97706" : "#dc2626"
  return { score, label, color, comps }
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

type AccentColor = "blue" | "green" | "purple" | "amber" | "slate"

function MetricCard({ label, value, sub, trend, accent = "blue", tooltip }: {
  label: string; value: string | number; sub?: string; trend?: number; accent?: AccentColor; tooltip?: string
}) {
  const borderColor = { blue: "var(--brand, #2563eb)", green: "#16a34a", purple: "#7c3aed", amber: "#d97706", slate: "#94a3b8" }[accent]
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 relative" style={{ borderLeft: `3px solid ${borderColor}` }} title={tooltip}>
      <div className="text-xs font-medium text-slate-500 mb-1.5">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">{value}</div>
      <div className="flex items-center gap-2 flex-wrap">
        {trend !== undefined && <TrendBadge value={trend} />}
        {sub && <span className="text-xs text-slate-400">{sub}</span>}
      </div>
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

function OpportunityCard({ item, priority }: { item: OpportunityItem; priority: "high" | "medium" | "low" }) {
  const catColor: Record<string, string> = { SEO: "bg-blue-50 text-blue-700", Content: "bg-violet-50 text-violet-700", UX: "bg-amber-50 text-amber-700", AEO: "bg-emerald-50 text-emerald-700", Keywords: "bg-slate-100 text-slate-700" }
  const impBg = { High: "bg-red-50 text-red-700 border-red-200", Medium: "bg-amber-50 text-amber-700 border-amber-200", Low: "bg-emerald-50 text-emerald-700 border-emerald-200", Growth: "bg-violet-50 text-violet-700 border-violet-200" }[item.impact]
  const dot = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" }[priority]
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3">
      <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: dot }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColor[item.category] ?? "bg-slate-100 text-slate-700"}`}>{item.category}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${impBg}`}>{item.impact} Impact</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const router = useRouter()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [rangePreset, setRangePreset] = useState("30d")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("overview")
  const [pagespeed, setPagespeed] = useState<PageSpeedData | null>(null)
  const [psLoading, setPsLoading] = useState(false)
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

  useEffect(() => {
    fetch("/api/client/me").then(r => { if (!r.ok) { router.push("/client/login"); return null }; return r.json() })
      .then(d => { if (d) setClient(d) })
  }, [router])

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

  const handleLogout = async () => { await fetch("/api/client/logout", { method: "POST" }); router.push("/client/login") }

  const loadSummary = () => {
    if (summary || summaryLoading) return
    setSummaryLoading(true)
    const p = customStart && customEnd ? `startDate=${customStart}&endDate=${customEnd}` : `range=${rangePreset}`
    fetch(`/api/client/summary?${p}`).then(r => r.json()).then(d => { if (d.summary) setSummary(d.summary) }).finally(() => setSummaryLoading(false))
  }

  const loadPagespeed = () => {
    if (pagespeed || psLoading) return
    setPsLoading(true)
    fetch("/api/client/pagespeed").then(r => r.json()).then(d => { if (!d.error) setPagespeed(d) }).finally(() => setPsLoading(false))
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
  const health = calcHealthScore(gsc, ga4, aiTraffic)
  const highlights = getHighlights(gsc, keywords, ga4, aiTraffic)
  const opportunities = getOpportunities(gsc, ga4, keywords, aiTraffic)
  const totalOpportunities = opportunities.high.length + opportunities.medium.length + opportunities.low.length

  const quickWins = keywords.filter(k => k.position > 10 && k.position <= 20)
  const almostTop = keywords.filter(k => k.position > 3 && k.position <= 10)

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "traffic", label: "Traffic" },
    { key: "keywords", label: "Keywords" },
    { key: "pages", label: "Top Pages" },
    { key: "ai", label: "AI Visibility" },
    { key: "opportunities", label: "Opportunities", badge: opportunities.high.length },
    { key: "engagement", label: "Engagement" },
    { key: "health", label: "Site Health" },
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
            <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1.5">Sign out</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Tab Nav */}
        <div className="flex gap-0 border-b border-slate-200 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key}
              onClick={() => { setActiveTab(t.key); if (t.key === "health") loadPagespeed() }}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px flex items-center gap-1.5 ${activeTab === t.key ? "" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
              style={activeTab === t.key ? { borderColor: brand, color: brand } : {}}>
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

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

                {/* Health Score */}
                <HealthScoreCard score={health.score} label={health.label} color={health.color} comps={health.comps} onTabClick={setActiveTab} />

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
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Search Console</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Organic Clicks" value={fmt(gsc?.clicks)} trend={gsc ? pct(gsc.clicks, gsc.prevClicks) : undefined} accent="blue" tooltip="Total clicks from Google Search results" />
                    <MetricCard label="Impressions" value={fmt(gsc?.impressions)} trend={gsc ? pct(gsc.impressions, gsc.prevImpressions) : undefined} accent="blue" tooltip="Times your pages appeared in Google Search" />
                    <MetricCard label="CTR" value={gsc ? `${gsc.ctr.toFixed(2)}%` : "—"} sub="Industry avg 2–5%" accent="blue" tooltip="Click-through rate: % of impressions that resulted in a click" />
                    <MetricCard label="Avg. Position" value={gsc ? gsc.position.toFixed(1) : "—"} sub="Lower is better" accent="blue" tooltip="Average ranking position in Google Search results" />
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
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Google Analytics 4</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Sessions" value={fmt(ga4?.sessions)} trend={ga4 ? pct(ga4.sessions, ga4.prevSessions) : undefined} accent="green" tooltip="Total website sessions in this period" />
                    <MetricCard label="Users" value={fmt(ga4?.users)} accent="green" tooltip="Unique visitors to your website" />
                    <MetricCard label="Engagement Rate" value={ga4 ? `${ga4.engagementRate.toFixed(1)}%` : "—"} sub="Engaged / total" accent="green" tooltip="% of sessions that engaged with the page (scroll, click, 10+ seconds)" />
                    <MetricCard label="Conversions" value={fmt(ga4?.conversions)} trend={ga4 ? pct(ga4.conversions, ga4.prevConversions) : undefined} accent="green" tooltip="Goal completions tracked in Google Analytics 4" />
                  </div>
                </section>

                {/* Traffic Value + AI mini card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MetricCard label="Estimated Traffic Value" value={`$${estimatedValue.toLocaleString()}`} sub="Organic clicks × $2.50 avg CPC" accent="amber" tooltip="Equivalent cost if this organic traffic were acquired through paid search (Google Ads)" />
                  <MetricCard label="AI Platform Sessions" value={aiTraffic ? fmt(aiTraffic.total) : "0"} sub={totalChannelSessions > 0 && aiTraffic ? `${((aiTraffic.total / totalChannelSessions) * 100).toFixed(1)}% of total traffic` : "Emerging channel"} accent="purple" tooltip="Visits from AI tools: ChatGPT, Perplexity, Gemini, Claude and others" />
                </div>

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
                      <div className="text-sm font-semibold text-slate-900">AI Report Summary</div>
                      <div className="text-xs text-slate-400 mt-0.5">Damco Digital SEO Analysis</div>
                    </div>
                    {!summary && !summaryLoading && (
                      <button onClick={loadSummary} className="text-xs bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">Generate</button>
                    )}
                  </div>
                  {summaryLoading && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                      Analysing your SEO data...
                    </div>
                  )}
                  {summary && <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>}
                  {!summary && !summaryLoading && <p className="text-sm text-slate-400">Click Generate to get an expert SEO analysis written for this period.</p>}
                </div>
              </div>
            )}

            {/* ══════════════════════════════ TRAFFIC ══════════════════════════════ */}
            {activeTab === "traffic" && (
              <div className="space-y-6 anim-card">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Traffic by Channel</div>
                      <div className="text-xs text-slate-400 mt-0.5">Where your visitors are coming from</div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{fmt(totalChannelSessions)} total sessions</span>
                  </div>
                  {channels.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">No traffic channel data available</div>
                  ) : (
                    <div className="space-y-2.5">
                      {channels.map(ch => {
                        const sharePct = totalChannelSessions ? (ch.sessions / totalChannelSessions) * 100 : 0
                        const trend = pct(ch.sessions, ch.prevSessions)
                        return (
                          <div key={ch.channel} className="grid items-center gap-3" style={{ gridTemplateColumns: "140px 1fr 52px 72px 60px" }}>
                            <div className="text-xs font-medium text-slate-700 truncate">{ch.channel}</div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${sharePct}%` }} />
                            </div>
                            <div className="text-right text-xs font-semibold text-slate-600 tabular-nums">{sharePct.toFixed(0)}%</div>
                            <div className="text-right text-xs text-slate-500 tabular-nums">{fmt(ch.sessions)}</div>
                            <div className="text-right"><TrendBadge value={trend} /></div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <ExpertInsight text={trafficInsight(channels, aiTraffic?.total ?? 0)} />
                </div>

                {/* Channel donut summary */}
                {channels.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-sm font-semibold text-slate-900 mb-4">Channel Distribution</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {channels.slice(0, 4).map(ch => {
                        const sharePct = totalChannelSessions ? (ch.sessions / totalChannelSessions) * 100 : 0
                        const trend = pct(ch.sessions, ch.prevSessions)
                        return (
                          <div key={ch.channel} className="border border-slate-100 rounded-xl p-4 text-center">
                            <div className="text-xs text-slate-500 mb-1 truncate">{ch.channel}</div>
                            <div className="text-xl font-bold text-slate-900 tabular-nums">{sharePct.toFixed(0)}%</div>
                            <div className="text-xs text-slate-500 tabular-nums">{fmt(ch.sessions)} sessions</div>
                            <div className="mt-1"><TrendBadge value={trend} /></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-sm font-semibold text-slate-900 mb-4">Devices</div>
                    <div className="space-y-3">
                      {devices.map(d => {
                        const t = devices.reduce((s, x) => s + x.sessions, 0)
                        const sp = t ? (d.sessions / t) * 100 : 0
                        const devIcons: Record<string, string> = { desktop: "🖥", mobile: "📱", tablet: "📲" }
                        return (
                          <div key={d.device} className="flex items-center gap-3">
                            <span className="text-sm w-5">{devIcons[d.device.toLowerCase()] ?? "💻"}</span>
                            <span className="text-xs w-14 capitalize text-slate-600 font-medium">{d.device}</span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${sp}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 tabular-nums w-24 text-right">{fmt(d.sessions)} · {sp.toFixed(0)}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-sm font-semibold text-slate-900 mb-4">Top Countries</div>
                    <div className="space-y-3">
                      {countries.slice(0, 7).map(c => {
                        const t = countries.reduce((s, x) => s + x.sessions, 0)
                        const sp = t ? (c.sessions / t) * 100 : 0
                        return (
                          <div key={c.country} className="flex items-center gap-3">
                            <span className="text-xs w-28 truncate text-slate-600 font-medium">{c.country}</span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                              <div className="h-full bg-slate-400 rounded-full" style={{ width: `${sp}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 tabular-nums w-16 text-right">{fmt(c.sessions)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  <MetricCard label="% of Total" value={totalChannelSessions > 0 && aiTraffic ? `${((aiTraffic.total / totalChannelSessions) * 100).toFixed(1)}%` : "—"} sub="of all sessions" accent="purple" tooltip="AI traffic as a percentage of all website sessions" />
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
                          {opportunities.high.map((item, i) => <OpportunityCard key={i} item={item} priority="high" />)}
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
                          {opportunities.medium.map((item, i) => <OpportunityCard key={i} item={item} priority="medium" />)}
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
                          {opportunities.low.map((item, i) => <OpportunityCard key={i} item={item} priority="low" />)}
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
                    <MetricCard label="Total Users" value={fmt(ga4?.users)} accent="green" tooltip="All unique users in this period" />
                    <MetricCard label="New Users" value={fmt(ga4?.newUsers)} accent="green" tooltip="First-time visitors to the website" />
                    <MetricCard label="Returning Users" value={fmt(ga4?.returningUsers)} accent="green" tooltip="Users who have visited before" />
                    <MetricCard label="Avg. Session Duration" value={fmtDur(ga4?.avgSessionDuration ?? 0)} accent="green" tooltip="Average time users spend per session" />
                  </div>
                </section>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard label="Engagement Rate" value={ga4 ? `${ga4.engagementRate.toFixed(1)}%` : "—"} sub="Engaged / total sessions" accent="blue" tooltip="Sessions with 10+ seconds engagement, a conversion, or 2+ page views" />
                  <MetricCard label="Pages / Session" value={ga4?.screenPageViewsPerSession?.toFixed(1) ?? "—"} accent="blue" tooltip="Average number of pages viewed per session" />
                  <MetricCard label="Engaged Sessions" value={fmt(ga4?.engagedSessions)} accent="blue" tooltip="Sessions that were actively engaged by the user" />
                  <MetricCard label="Conversions" value={fmt(ga4?.conversions)} trend={ga4 ? pct(ga4.conversions, ga4.prevConversions) : undefined} accent="amber" tooltip="Goal completions tracked in GA4" />
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

            {/* ══════════════════════════════ SITE HEALTH ══════════════════════════════ */}
            {activeTab === "health" && (
              <div className="space-y-5 anim-card">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="text-sm font-semibold text-slate-900 mb-1">Page Speed & Core Web Vitals</div>
                  <div className="text-xs text-slate-400 mb-5">Performance scores from Google PageSpeed Insights</div>

                  {psLoading && (
                    <div className="flex flex-col items-center py-10 gap-3">
                      <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                      <div className="text-sm text-slate-500">Analysing page speed...</div>
                    </div>
                  )}

                  {!psLoading && !pagespeed && (
                    <div className="text-center py-8">
                      <div className="text-sm text-slate-500 font-medium">PageSpeed data loading</div>
                      <div className="text-xs text-slate-400 mt-1">This may take a few seconds</div>
                    </div>
                  )}

                  {pagespeed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {(["mobile", "desktop"] as const).map(device => {
                        const d = pagespeed[device]
                        const scoreColor = d.score >= 90 ? "#16a34a" : d.score >= 50 ? "#d97706" : "#dc2626"
                        const scoreLabel = d.score >= 90 ? "Good" : d.score >= 50 ? "Needs Improvement" : "Poor"
                        return (
                          <div key={device} className="border border-slate-200 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <div className="text-sm font-semibold text-slate-900 capitalize">{device}</div>
                                <div className="text-xs text-slate-400">PageSpeed score</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <ScoreRing score={d.score} color={scoreColor} />
                                <div>
                                  <div className="text-xs font-medium" style={{ color: scoreColor }}>{scoreLabel}</div>
                                </div>
                              </div>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full mb-4">
                              <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, background: scoreColor }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: "LCP", value: d.lcp, desc: "Largest Contentful Paint" },
                                { label: "CLS", value: d.cls, desc: "Cumulative Layout Shift" },
                                { label: "FCP", value: d.fcp, desc: "First Contentful Paint" },
                                { label: "TBT", value: d.tbt, desc: "Total Blocking Time" },
                              ].map(v => (
                                <div key={v.label} className="bg-slate-50 rounded-lg p-3" title={v.desc}>
                                  <div className="text-xs font-semibold text-slate-500 mb-0.5">{v.label}</div>
                                  <div className="text-sm font-bold text-slate-900">{v.value}</div>
                                  <div className="text-xs text-slate-400">{v.desc}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <ExpertInsight text={pagespeed
                    ? `Mobile score ${pagespeed.mobile.score}/100 · Desktop ${pagespeed.desktop.score}/100. ${pagespeed.mobile.score < 50 ? "Mobile performance is poor — prioritise image compression, lazy loading, and reducing render-blocking JavaScript." : pagespeed.mobile.score < 90 ? "Mobile has room for improvement — focus on LCP optimisation (image sizing, preloading) and reducing Total Blocking Time." : "Excellent page speed — maintain performance as you add new content and monitor after major deployments."}`
                    : "PageSpeed Insights measures your Core Web Vitals — signals Google uses as a ranking factor. Scores above 90 are considered Good."
                  } />
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}
