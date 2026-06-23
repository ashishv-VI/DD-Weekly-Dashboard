"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface ClientInfo {
  id: string; name: string; domain: string; username: string
  ga4PropertyId: string | null; gscSiteUrl: string | null
}
interface GSCTotals {
  clicks: number; impressions: number; ctr: number; position: number
  prevClicks: number; prevImpressions: number; prevCtr: number; prevPosition: number
}
interface GA4Totals {
  sessions: number; users: number; engagedSessions: number
  engagementRate: number; conversions: number; revenue: number
  prevSessions: number; prevConversions: number
}
interface DailyRow { date: string; clicks?: number; sessions?: number; position?: number }
interface KeywordRow { keyword: string; clicks: number; impressions: number; ctr: number; position: number }
interface PageRow { url: string; clicks: number; impressions: number; ctr: number; position: number }
interface DeviceRow { device: string; sessions: number; users: number }
interface CountryRow { country: string; sessions: number; users: number }

interface PageSpeedMetrics { score: number; lcp: string; cls: string; fcp: string; tbt: string; si: string }
interface PageSpeedData { mobile: PageSpeedMetrics; desktop: PageSpeedMetrics }
interface SitemapEntry { path: string; submitted: number; indexed: number; lastSubmitted: string; warnings: number; errors: number }

interface ApiData {
  gsc?: { totals: GSCTotals; daily: DailyRow[] } | null
  ga4?: { totals: GA4Totals; daily: DailyRow[] } | null
  keywords?: KeywordRow[]
  pages?: PageRow[]
  devices?: DeviceRow[]
  countries?: CountryRow[]
  error?: string
}

function fmt(n: number | undefined | null) {
  if (n === undefined || n === null) return "—"
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

function trendPct(curr: number, prev: number) {
  if (!prev) return 0
  return ((curr - prev) / prev) * 100
}

function KPI({ label, value, sub, trend, accent }: {
  label: string; value: string | number; sub?: string; trend?: number; accent?: string
}) {
  const up = trend !== undefined && trend > 0
  const down = trend !== undefined && trend < 0
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</div>
      <div className="text-3xl font-bold text-gray-900 mb-1" style={accent ? { color: accent } : {}}>{value}</div>
      {trend !== undefined && (
        <div className={`text-xs font-semibold flex items-center gap-1 ${up ? "text-emerald-600" : down ? "text-red-500" : "text-gray-400"}`}>
          {up ? "▲" : down ? "▼" : "—"} {Math.abs(trend).toFixed(1)}% vs prev period
        </div>
      )}
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function MiniBar({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-0.5 h-14">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t" style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.75 }} />
      ))}
    </div>
  )
}

function SectionLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{children}</span>
    </div>
  )
}

function positionColor(pos: number) {
  if (pos <= 3) return "#10b981"
  if (pos <= 10) return "#3b82f6"
  if (pos <= 20) return "#f59e0b"
  return "#9ca3af"
}

export default function ClientDashboard() {
  const router = useRouter()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState("30d")
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "keywords" | "pages" | "traffic" | "health">("overview")
  const [pagespeed, setPagespeed] = useState<PageSpeedData | null>(null)
  const [psLoading, setPsLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    fetch("/api/client/me").then(r => {
      if (!r.ok) { router.push("/client/login"); return null }
      return r.json()
    }).then(d => { if (d) setClient(d) })
  }, [router])

  useEffect(() => {
    if (!client) return
    setLoading(true)
    setError(null)
    fetch(`/api/client/data?range=${range}`)
      .then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then(d => {
        if (d.error) setError(d.error)
        else {
          setData(d)
          if (d.warning) setError(d.warning)
          else setError(null)
        }
        setLoading(false)
      })
      .catch((e) => { setError(e.message ?? "Failed to load data"); setLoading(false) })
  }, [client, range])

  const handleLogout = async () => {
    await fetch("/api/client/logout", { method: "POST" })
    router.push("/client/login")
  }

  if (!client) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const gsc = data?.gsc?.totals
  const ga4 = data?.ga4?.totals
  const gscDaily = data?.gsc?.daily ?? []
  const ga4Daily = data?.ga4?.daily ?? []
  const keywords = data?.keywords ?? []
  const pages = data?.pages ?? []
  const devices = data?.devices ?? []
  const countries = data?.countries ?? []

  const clicksChart = gscDaily.map(d => d.clicks ?? 0)
  const sessionsChart = ga4Daily.map(d => d.sessions ?? 0)
  const posChart = gscDaily.map(d => d.position ?? 0).filter(v => v > 0)

  const totalDeviceSessions = devices.reduce((s, d) => s + d.sessions, 0)
  const totalCountrySessions = countries.reduce((s, c) => s + c.sessions, 0)

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "keywords", label: `Keywords${keywords.length ? ` (${keywords.length})` : ""}` },
    { key: "pages", label: `Top Pages${pages.length ? ` (${pages.length})` : ""}` },
    { key: "traffic", label: "Traffic" },
    { key: "health", label: "Site Health" },
  ] as const

  const handleHealthTab = () => {
    setActiveTab("health")
    if (!pagespeed && !psLoading) {
      setPsLoading(true)
      fetch("/api/client/pagespeed")
        .then(r => r.json())
        .then(d => { if (!d.error) setPagespeed(d) })
        .finally(() => setPsLoading(false))
    }
  }

  const loadSummary = () => {
    if (summary || summaryLoading) return
    setSummaryLoading(true)
    fetch(`/api/client/summary?range=${range}`)
      .then(r => r.json())
      .then(d => { if (d.summary) setSummary(d.summary) })
      .finally(() => setSummaryLoading(false))
  }

  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {client.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{client.name}</div>
            <div className="text-xs text-gray-400">{client.domain}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={range} onChange={e => setRange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={handlePrint}
            className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors font-medium">
            ⬇ PDF
          </button>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500 transition-colors">Sign out</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">SEO Performance</h1>
          <p className="text-sm text-gray-400 mt-1">Google Search Console · Google Analytics 4</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">⚠ {error}</div>
        )}

        {/* TABS */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit flex-wrap print:hidden">
          {tabs.map(t => (
            <button key={t.key}
              onClick={() => t.key === "health" ? handleHealthTab() : setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-3" />
                <div className="h-8 w-28 bg-gray-100 rounded animate-pulse mb-2" />
                <div className="h-2 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <div className="space-y-8">

                {/* GSC KPIs */}
                <div>
                  <SectionLabel color="#3b82f6">Search Console</SectionLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPI label="Organic Clicks" value={fmt(gsc?.clicks)}
                      trend={gsc ? trendPct(gsc.clicks, gsc.prevClicks) : undefined} />
                    <KPI label="Impressions" value={fmt(gsc?.impressions)}
                      trend={gsc ? trendPct(gsc.impressions, gsc.prevImpressions) : undefined} />
                    <KPI label="Click-Through Rate" value={gsc ? `${gsc.ctr.toFixed(2)}%` : "—"} />
                    <KPI label="Avg Position" value={gsc ? gsc.position.toFixed(1) : "—"} sub="Lower = better" />
                  </div>
                </div>

                {/* Clicks chart */}
                {clicksChart.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Organic Clicks Trend</div>
                        <div className="text-xs text-gray-400">Daily clicks from Google Search</div>
                      </div>
                      <div className="text-xs text-blue-600 font-bold">{fmt(gsc?.clicks)} total</div>
                    </div>
                    <MiniBar data={clicksChart} color="#3b82f6" />
                  </div>
                )}

                {/* GA4 KPIs */}
                <div>
                  <SectionLabel color="#10b981">Google Analytics</SectionLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPI label="Sessions" value={fmt(ga4?.sessions)}
                      trend={ga4 ? trendPct(ga4.sessions, ga4.prevSessions) : undefined} />
                    <KPI label="Users" value={fmt(ga4?.users)} />
                    <KPI label="Engagement Rate" value={ga4 ? `${ga4.engagementRate.toFixed(1)}%` : "—"} />
                    <KPI label="Conversions" value={fmt(ga4?.conversions)}
                      trend={ga4 ? trendPct(ga4.conversions, ga4.prevConversions) : undefined} />
                  </div>
                </div>

                {/* Sessions chart */}
                {sessionsChart.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Sessions Trend</div>
                        <div className="text-xs text-gray-400">Daily sessions from Google Analytics</div>
                      </div>
                      <div className="text-xs text-emerald-600 font-bold">{fmt(ga4?.sessions)} total</div>
                    </div>
                    <MiniBar data={sessionsChart} color="#10b981" />
                  </div>
                )}

                {/* Position chart */}
                {posChart.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Position Tracker</div>
                        <div className="text-xs text-gray-400">Average ranking position (lower = better)</div>
                      </div>
                      <div className="text-xs text-purple-600 font-bold">Avg {gsc?.position.toFixed(1) ?? "—"}</div>
                    </div>
                    <div className="flex items-end gap-0.5 h-14">
                      {posChart.map((v, i) => {
                        const maxPos = Math.max(...posChart, 1)
                        const heightPct = ((maxPos - v) / maxPos) * 100
                        return (
                          <div key={i} className="flex-1 rounded-t" style={{
                            height: `${Math.max(heightPct, 4)}%`,
                            background: "#a855f7",
                            opacity: 0.7
                          }} />
                        )
                      })}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">Taller bar = better ranking position</div>
                  </div>
                )}

                {/* AI Summary Card */}
                <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">AI Summary</div>
                      <div className="text-sm font-semibold text-white">Performance Overview</div>
                    </div>
                    {!summary && !summaryLoading && (
                      <button onClick={loadSummary}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
                        Generate
                      </button>
                    )}
                  </div>
                  {summaryLoading && (
                    <div className="flex items-center gap-2 text-blue-300 text-sm">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Generating summary...
                    </div>
                  )}
                  {summary && (
                    <p className="text-sm text-blue-100 leading-relaxed">{summary}</p>
                  )}
                  {!summary && !summaryLoading && (
                    <p className="text-sm text-blue-400 opacity-60">Click Generate to get an AI-written summary of this period&apos;s SEO performance.</p>
                  )}
                </div>

              </div>
            )}

            {/* ── KEYWORDS TAB ── */}
            {activeTab === "keywords" && (
              <div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">Top Keywords</div>
                      <div className="text-xs text-gray-400 mt-0.5">Search terms that show your site on Google</div>
                    </div>
                    <div className="text-xs text-gray-400">{keywords.length} keywords</div>
                  </div>
                  {keywords.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No keyword data available for this period</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                            <th className="text-left px-5 py-3">#</th>
                            <th className="text-left px-5 py-3">Keyword</th>
                            <th className="text-right px-5 py-3">Clicks</th>
                            <th className="text-right px-5 py-3">Impressions</th>
                            <th className="text-right px-5 py-3">CTR</th>
                            <th className="text-right px-5 py-3">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keywords.map((kw, i) => (
                            <tr key={kw.keyword} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3 text-xs text-gray-400">{i + 1}</td>
                              <td className="px-5 py-3 font-medium text-gray-900 max-w-xs">
                                <div className="truncate">{kw.keyword}</div>
                              </td>
                              <td className="px-5 py-3 text-right text-sm font-semibold text-blue-600">{fmt(kw.clicks)}</td>
                              <td className="px-5 py-3 text-right text-sm text-gray-600">{fmt(kw.impressions)}</td>
                              <td className="px-5 py-3 text-right text-sm text-gray-600">{kw.ctr.toFixed(2)}%</td>
                              <td className="px-5 py-3 text-right">
                                <span className="inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold text-white"
                                  style={{ background: positionColor(kw.position) }}>
                                  {kw.position.toFixed(0)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {keywords.length > 0 && (
                  <div className="flex gap-3 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span> Top 3</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span> Top 10</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span> Top 20</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-gray-400"></span> 20+</span>
                  </div>
                )}
              </div>
            )}

            {/* ── PAGES TAB ── */}
            {activeTab === "pages" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">Top Pages</div>
                    <div className="text-xs text-gray-400 mt-0.5">Pages driving the most organic traffic</div>
                  </div>
                  <div className="text-xs text-gray-400">{pages.length} pages</div>
                </div>
                {pages.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No page data available for this period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                          <th className="text-left px-5 py-3">#</th>
                          <th className="text-left px-5 py-3">Page URL</th>
                          <th className="text-right px-5 py-3">Clicks</th>
                          <th className="text-right px-5 py-3">Impressions</th>
                          <th className="text-right px-5 py-3">CTR</th>
                          <th className="text-right px-5 py-3">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pages.map((pg, i) => {
                          const urlPath = pg.url.replace(/^https?:\/\/[^/]+/, "") || "/"
                          const maxClicks = pages[0]?.clicks ?? 1
                          const barWidth = (pg.clicks / maxClicks) * 100
                          return (
                            <tr key={pg.url} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3 text-xs text-gray-400">{i + 1}</td>
                              <td className="px-5 py-3 max-w-xs">
                                <div className="truncate text-sm font-medium text-gray-800" title={pg.url}>{urlPath}</div>
                                <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${barWidth}%` }} />
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right text-sm font-semibold text-blue-600">{fmt(pg.clicks)}</td>
                              <td className="px-5 py-3 text-right text-sm text-gray-600">{fmt(pg.impressions)}</td>
                              <td className="px-5 py-3 text-right text-sm text-gray-600">{pg.ctr.toFixed(2)}%</td>
                              <td className="px-5 py-3 text-right">
                                <span className="inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold text-white"
                                  style={{ background: positionColor(pg.position) }}>
                                  {pg.position.toFixed(0)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TRAFFIC TAB ── */}
            {activeTab === "traffic" && (
              <div className="space-y-6">

                {/* Device Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <SectionLabel color="#8b5cf6">Device Breakdown</SectionLabel>
                  {devices.length === 0 ? (
                    <div className="text-sm text-gray-400">No device data available</div>
                  ) : (
                    <div className="space-y-3">
                      {devices.map(d => {
                        const pct = totalDeviceSessions > 0 ? (d.sessions / totalDeviceSessions) * 100 : 0
                        const colors: Record<string, string> = {
                          mobile: "#3b82f6", desktop: "#10b981", tablet: "#f59e0b"
                        }
                        const color = colors[d.device.toLowerCase()] ?? "#9ca3af"
                        return (
                          <div key={d.device}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700 capitalize">{d.device}</span>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-gray-500">{fmt(d.sessions)} sessions</span>
                                <span className="font-bold text-gray-900 w-12 text-right">{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Country Traffic */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <SectionLabel color="#f59e0b">Country Traffic</SectionLabel>
                  {countries.length === 0 ? (
                    <div className="text-sm text-gray-400">No country data available</div>
                  ) : (
                    <div className="space-y-3">
                      {countries.map((c, i) => {
                        const pct = totalCountrySessions > 0 ? (c.sessions / totalCountrySessions) * 100 : 0
                        return (
                          <div key={c.country}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                                <span className="text-sm font-medium text-gray-700">{c.country}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-gray-500">{fmt(c.sessions)} sessions</span>
                                <span className="font-bold text-gray-900 w-12 text-right">{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#f59e0b", opacity: 0.8 }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </>
        )}

            {/* ── SITE HEALTH TAB ── */}
            {activeTab === "health" && (
              <div className="space-y-6">

                {/* Page Speed */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <SectionLabel color="#f59e0b">Page Speed Score</SectionLabel>

                  {psLoading && (
                    <div className="flex items-center gap-3 text-gray-400 text-sm py-4">
                      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      Analysing site speed — this takes 10–20 seconds...
                    </div>
                  )}

                  {!psLoading && !pagespeed && (
                    <div className="text-sm text-gray-400 py-4">
                      Click the Site Health tab to load your page speed scores.
                    </div>
                  )}

                  {pagespeed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(["mobile", "desktop"] as const).map(device => {
                        const m = pagespeed[device]
                        const scoreColor = m.score >= 90 ? "#16a34a" : m.score >= 50 ? "#d97706" : "#dc2626"
                        const scoreBg = m.score >= 90 ? "#dcfce7" : m.score >= 50 ? "#fef3c7" : "#fee2e2"
                        return (
                          <div key={device} className="border border-gray-100 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div className="font-semibold text-gray-700 capitalize">{device}</div>
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                                  style={{ background: scoreBg, color: scoreColor }}>
                                  {m.score}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {[
                                { label: "First Contentful Paint", value: m.fcp, desc: "How fast first content appears" },
                                { label: "Largest Contentful Paint", value: m.lcp, desc: "Main content load time (LCP)" },
                                { label: "Total Blocking Time", value: m.tbt, desc: "JavaScript blocking (TBT)" },
                                { label: "Cumulative Layout Shift", value: m.cls, desc: "Visual stability (CLS)" },
                                { label: "Speed Index", value: m.si, desc: "How quickly content is visible" },
                              ].map(row => (
                                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                                  <div>
                                    <div className="text-xs font-medium text-gray-700">{row.label}</div>
                                    <div className="text-xs text-gray-400">{row.desc}</div>
                                  </div>
                                  <div className="text-sm font-bold text-gray-900 ml-4 shrink-0">{row.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Score guide */}
                {pagespeed && (
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> 90–100 Fast</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> 50–89 Needs Work</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> 0–49 Slow</span>
                  </div>
                )}

              </div>
            )}

        <div className="text-center text-xs text-gray-300 mt-12 print:hidden">
          Powered by Damco Digital · Google Search Console & Analytics
        </div>
      </div>
    </div>
  )
}
