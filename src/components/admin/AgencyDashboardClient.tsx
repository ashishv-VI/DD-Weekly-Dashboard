"use client"
import { useState } from "react"
import Link from "next/link"

export type ClientWithHealth = {
  id: string; name: string; domain: string; username: string
  status: string; gscSiteUrl: string | null; ga4PropertyId: string | null
  score: number; clicks: number; impressions: number; position: number; ctr: number
  prevClicks: number; trend: number
  industry: string; country: string; assignedTo: string; logoUrl: string; themeColor: string
}

function healthStatus(score: number) {
  if (score >= 80) return { label: "Healthy", color: "#166534", bg: "#dcfce7", dot: "#16a34a" }
  if (score >= 60) return { label: "Needs Review", color: "#854d0e", bg: "#fef9c3", dot: "#ca8a04" }
  if (score >= 30) return { label: "Needs Optimization", color: "#9a3412", bg: "#ffedd5", dot: "#ea580c" }
  if (score > 0) return { label: "Critical", color: "#991b1b", bg: "#fee2e2", dot: "#dc2626" }
  return { label: "No Data", color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" }
}

function fmt(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

export function AgencyDashboardClient({
  clients, isTokenExpired,
}: {
  clients: ClientWithHealth[]
  isTokenExpired: boolean
}) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const total = clients.length
  const active = clients.filter(c => c.status === "active").length
  const healthy = clients.filter(c => c.score >= 70).length
  const critical = clients.filter(c => c.score > 0 && c.score < 30).length
  const noIntegration = clients.filter(c => !c.gscSiteUrl && !c.ga4PropertyId).length
  const totalClicks = clients.reduce((s, c) => s + c.clicks, 0)
  const topPerformer = [...clients].sort((a, b) => b.clicks - a.clicks)[0]

  const actionItems = clients.flatMap(c => {
    const items: { priority: "high" | "medium" | "low"; id: string; name: string; msg: string }[] = []
    if (c.status === "locked") items.push({ priority: "high", id: c.id, name: c.name, msg: "Account is locked — login blocked" })
    if (c.score > 0 && c.score < 30) items.push({ priority: "high", id: c.id, name: c.name, msg: `SEO health critical (score ${c.score}/100)` })
    if (c.trend < -20) items.push({ priority: "high", id: c.id, name: c.name, msg: `Traffic dropped ${Math.abs(c.trend).toFixed(0)}% this period` })
    if (!c.gscSiteUrl) items.push({ priority: "medium", id: c.id, name: c.name, msg: "Google Search Console not connected" })
    if (!c.ga4PropertyId) items.push({ priority: "medium", id: c.id, name: c.name, msg: "Google Analytics not connected" })
    if (c.position > 25 && c.position > 0) items.push({ priority: "low", id: c.id, name: c.name, msg: `Avg position ${c.position.toFixed(1)} needs improvement` })
    return items
  })
  const pOrder: Record<"high" | "medium" | "low", number> = { high: 0, medium: 1, low: 2 }
  actionItems.sort((a, b) => pOrder[a.priority] - pOrder[b.priority])

  const risingClients = clients.filter(c => c.trend > 20)
  const droppedClients = clients.filter(c => c.trend < -20)
  const lockedClients = clients.filter(c => c.status === "locked")
  const wins: string[] = []
  if (healthy > 0) wins.push(`${healthy} ${healthy === 1 ? "client" : "clients"} performing well (score ≥ 70)`)
  if (topPerformer && topPerformer.clicks > 0) wins.push(`Top: ${topPerformer.name} with ${fmt(topPerformer.clicks)} clicks`)
  if (risingClients.length > 0) wins.push(`${risingClients.length} ${risingClients.length === 1 ? "client" : "clients"} with strong traffic growth`)
  const issues: string[] = []
  if (critical > 0) issues.push(`${critical} ${critical === 1 ? "client" : "clients"} with critical health (score < 30)`)
  if (noIntegration > 0) issues.push(`${noIntegration} ${noIntegration === 1 ? "client" : "clients"} missing Google integrations`)
  if (lockedClients.length > 0) issues.push(`${lockedClients.length} ${lockedClients.length === 1 ? "account" : "accounts"} locked`)
  if (droppedClients.length > 0) issues.push(`${droppedClients.length} ${droppedClients.length === 1 ? "client" : "clients"} with significant traffic drop`)
  const actions: string[] = []
  if (critical > 0) actions.push("Review and address critical client SEO issues")
  if (noIntegration > 0) actions.push("Connect missing Google integrations")
  if (lockedClients.length > 0) actions.push("Unlock affected client accounts")
  if (droppedClients.length > 0) actions.push("Investigate traffic drops and respond")
  if (actions.length === 0) actions.push("Monitor weekly performance across all clients")

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) || (c.industry && c.industry.toLowerCase().includes(q))
    const matchF = filter === "all"
      || (filter === "healthy" && c.score >= 70)
      || (filter === "review" && c.score >= 50 && c.score < 70)
      || (filter === "critical" && c.score > 0 && c.score < 50)
      || (filter === "nodata" && c.score === 0)
    return matchQ && matchF
  })

  const copyLogin = async (username: string, id: string) => {
    const url = `${window.location.origin}/client/login?username=${encodeURIComponent(username)}`
    await navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const unlockClient = async (id: string) => {
    await fetch(`/api/admin/clients/${id}/unlock`, { method: "POST" })
    window.location.reload()
  }

  return (
    <div className="p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agency Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">All clients · Last 30 days performance</p>
        </div>
        <Link href="/admin/clients/new"
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Add Client
        </Link>
      </div>

      {isTokenExpired && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-red-800 text-sm">Google Reconnection Required</p>
            <p className="text-xs text-red-600 mt-0.5">Client data won't load until you reconnect your Google account</p>
          </div>
          <a href="/login" className="bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">Reconnect →</a>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums text-gray-900">{String(total)}</div>
            <div className="text-xs font-semibold text-gray-700">Total Clients</div>
            <div className="text-xs text-gray-400">{active} active</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums text-emerald-600">{String(healthy)}</div>
            <div className="text-xs font-semibold text-gray-700">Healthy</div>
            <div className="text-xs text-gray-400">score ≥ 70</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums text-red-500">{String(critical)}</div>
            <div className="text-xs font-semibold text-gray-700">Critical</div>
            <div className="text-xs text-gray-400">score &lt; 30</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums text-amber-500">{String(noIntegration)}</div>
            <div className="text-xs font-semibold text-gray-700">No Integration</div>
            <div className="text-xs text-gray-400">no GSC/GA4</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums text-orange-500">{String(actionItems.filter(a => a.priority === "high").length)}</div>
            <div className="text-xs font-semibold text-gray-700">Action Items</div>
            <div className="text-xs text-gray-400">high priority</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums text-blue-600">{fmt(totalClicks)}</div>
            <div className="text-xs font-semibold text-gray-700">Total Clicks</div>
            <div className="text-xs text-gray-400">30 days</div>
          </div>
        </div>
      </div>

      {/* Summary + Action Center */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Executive Summary</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Wins */}
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span className="text-xs font-semibold text-emerald-700">Wins</span>
              </div>
              <ul className="space-y-1">
                {wins.length > 0 ? wins.slice(0, 3).map((w, i) => (
                  <li key={i} className="text-xs text-emerald-800 leading-snug">· {w}</li>
                )) : <li className="text-xs text-emerald-600 italic">No highlights yet</li>}
              </ul>
            </div>
            {/* Issues */}
            <div className={`rounded-xl p-3 border ${issues.length > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${issues.length > 0 ? "bg-red-500" : "bg-slate-300"}`}>
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v3m0 4h.01"/></svg>
                </div>
                <span className={`text-xs font-semibold ${issues.length > 0 ? "text-red-700" : "text-slate-500"}`}>Needs Attention</span>
              </div>
              <ul className="space-y-1">
                {issues.length > 0 ? issues.slice(0, 3).map((issue, i) => (
                  <li key={i} className="text-xs text-red-800 leading-snug">· {issue}</li>
                )) : <li className="text-xs text-slate-400 italic">All clear</li>}
              </ul>
            </div>
            {/* Actions */}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                </div>
                <span className="text-xs font-semibold text-blue-700">Next Actions</span>
              </div>
              <ul className="space-y-1">
                {actions.slice(0, 3).map((a, i) => (
                  <li key={i} className="text-xs text-blue-800 leading-snug">· {a}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Action Center</h2>
            {actionItems.filter(a => a.priority === "high").length > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {actionItems.filter(a => a.priority === "high").length} urgent
              </span>
            )}
          </div>
          {actionItems.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">All clear! No issues detected.</p>
          ) : (
            <div className="space-y-2.5 max-h-40 overflow-y-auto">
              {actionItems.slice(0, 8).map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${item.priority === "high" ? "bg-red-500" : item.priority === "medium" ? "bg-amber-400" : "bg-blue-400"}`}/>
                  <div>
                    <Link href={`/admin/clients/${item.id}`} className="text-xs font-semibold text-gray-800 hover:text-blue-600">{item.name}</Link>
                    <p className="text-xs text-gray-500">{item.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search + Filter + Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search clients by name, domain, username..."
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
            {(["all","healthy","review","critical","nodata"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {f === "all" ? "All" : f === "healthy" ? "Healthy" : f === "review" ? "Review" : f === "critical" ? "Critical" : "No Data"}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 shrink-0">{filtered.length} / {total}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="text-left px-5 py-3">Client</th>
                <th className="text-left px-4 py-3">Domain</th>
                <th className="text-center px-4 py-3">Health</th>
                <th className="text-right px-4 py-3">Clicks</th>
                <th className="text-right px-4 py-3">Position</th>
                <th className="text-right px-4 py-3">30d Trend</th>
                <th className="text-center px-4 py-3">Integrations</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const h = healthStatus(c.score)
                return (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {c.logoUrl ? (
                          <img src={c.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-200 shrink-0"/>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                          {(c.industry || c.country) && <div className="text-xs text-gray-400">{[c.industry, c.country].filter(Boolean).join(" · ")}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{c.domain}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs font-bold tabular-nums" style={{ color: h.dot }}>{c.score > 0 ? c.score : "—"}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: h.bg, color: h.color }}>{h.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-semibold text-blue-600 tabular-nums">
                      {c.gscSiteUrl ? fmt(c.clicks) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm text-gray-600 tabular-nums">
                      {c.position > 0 ? c.position.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {c.prevClicks > 0 || c.clicks > 0 ? (
                        <span className={`text-xs font-semibold ${c.trend > 0 ? "text-emerald-600" : c.trend < 0 ? "text-red-500" : "text-gray-400"}`}>
                          {c.trend > 0 ? "▲" : c.trend < 0 ? "▼" : "—"} {Math.abs(c.trend).toFixed(0)}%
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-center gap-1">
                        <span title={c.ga4PropertyId ? `GA4: ${c.ga4PropertyId}` : "GA4 not connected"}
                          className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold ${c.ga4PropertyId ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                          GA4
                        </span>
                        <span title={c.gscSiteUrl ? `GSC: ${c.gscSiteUrl}` : "GSC not connected"}
                          className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold ${c.gscSiteUrl ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                          GSC
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        c.status === "active" ? "bg-green-100 text-green-700" :
                        c.status === "locked" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === c.id ? null : c.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                          </svg>
                        </button>
                        {openDropdown === c.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)}/>
                            <div className="absolute right-0 top-9 z-50 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1">
                              <Link href={`/admin/clients/${c.id}`} onClick={() => setOpenDropdown(null)}
                                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                Manage Client
                              </Link>
                              <a href={`/client/login?username=${encodeURIComponent(c.username)}`} target="_blank" rel="noopener noreferrer"
                                onClick={() => setOpenDropdown(null)}
                                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                Open Login Page
                              </a>
                              <button onClick={() => { copyLogin(c.username, c.id); setOpenDropdown(null) }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                {copied === c.id ? "Copied!" : "Copy Login URL"}
                              </button>
                              {c.status === "locked" && (
                                <button onClick={() => { unlockClient(c.id); setOpenDropdown(null) }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                                  Unlock Account
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <p className="text-gray-400 text-sm">{search ? `No clients match "${search}"` : "No clients found."}</p>
                    {!search && <Link href="/admin/clients/new" className="text-blue-600 text-sm hover:underline mt-1 inline-block">Add your first client →</Link>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
