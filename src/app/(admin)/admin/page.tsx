import { db } from "@/lib/db"
import { clients, notifications, users } from "@/lib/db/schema"
import { eq, desc, isNotNull, and } from "drizzle-orm"
import Link from "next/link"
import { getGSCMetrics } from "@/lib/google/gsc"
import { getDateRange } from "@/lib/dateRange"

function getHealthScore(clicks: number, prevClicks: number, position: number, ctr: number): number {
  let score = 50
  // Clicks trend (up to +25 / -25)
  if (prevClicks > 0) {
    const trend = ((clicks - prevClicks) / prevClicks) * 100
    score += Math.max(-25, Math.min(25, trend * 0.5))
  } else if (clicks > 0) {
    score += 15
  }
  // Position score (top 3 = +20, top 10 = +10, 20+ = -10)
  if (position > 0 && position <= 3) score += 20
  else if (position <= 10) score += 10
  else if (position <= 20) score += 0
  else if (position > 20) score -= 10
  // CTR score
  if (ctr >= 5) score += 10
  else if (ctr >= 2) score += 5
  else if (ctr < 1 && ctr > 0) score -= 5
  return Math.round(Math.max(0, Math.min(100, score)))
}

function healthLabel(score: number): { label: string; color: string; bg: string; dot: string } {
  if (score >= 70) return { label: "Good", color: "#15803d", bg: "#dcfce7", dot: "#16a34a" }
  if (score >= 40) return { label: "Average", color: "#92400e", bg: "#fef3c7", dot: "#d97706" }
  return { label: "Needs Work", color: "#991b1b", bg: "#fee2e2", dot: "#dc2626" }
}

type ClientWithHealth = {
  id: string; name: string; domain: string; username: string
  status: string; gscSiteUrl: string | null; ga4PropertyId: string | null
  score: number; clicks: number; impressions: number; position: number; ctr: number
  prevClicks: number; trend: number
}

export default async function AdminDashboard() {
  const [allClients, unreadNotifs, teamMember] = await Promise.all([
    db.select().from(clients).orderBy(desc(clients.createdAt)),
    db.select().from(notifications).where(eq(notifications.read, false)).orderBy(desc(notifications.createdAt)).limit(10),
    db.select().from(users).where(and(isNotNull(users.googleAccessToken), eq(users.role, "super_admin"))).limit(1),
  ])

  const accessToken = teamMember[0]?.googleAccessToken ?? null
  const { startDate, endDate } = getDateRange("30d")

  // If token is present, auto-clear old token_expired notifications
  if (accessToken) {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.type, "token_expired"))
      .catch(() => {})
  }

  // Fetch GSC data for each client with a site URL (max 10 to avoid timeout)
  const clientsWithHealth: ClientWithHealth[] = await Promise.all(
    allClients.slice(0, 15).map(async (c) => {
      if (!accessToken || !c.gscSiteUrl) {
        return { ...c, score: 0, clicks: 0, impressions: 0, position: 0, ctr: 0, prevClicks: 0, trend: 0 }
      }
      try {
        const gsc = await getGSCMetrics(accessToken, c.gscSiteUrl, startDate, endDate)
        const t = gsc.totals
        const trend = t.prevClicks > 0 ? ((t.clicks - t.prevClicks) / t.prevClicks) * 100 : 0
        const score = getHealthScore(t.clicks, t.prevClicks, t.position, t.ctr)
        return {
          ...c, score,
          clicks: t.clicks, impressions: t.impressions,
          position: t.position, ctr: t.ctr,
          prevClicks: t.prevClicks, trend,
        }
      } catch {
        return { ...c, score: 0, clicks: 0, impressions: 0, position: 0, ctr: 0, prevClicks: 0, trend: 0 }
      }
    })
  )

  const active = allClients.filter(c => c.status === "active").length
  const locked = allClients.filter(c => c.status === "locked").length
  const goodClients = clientsWithHealth.filter(c => c.score >= 70).length
  const riskClients = clientsWithHealth.filter(c => c.score > 0 && c.score < 40).length

  function fmt(n: number) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agency Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">All clients · Last 30 days performance</p>
        </div>
        <Link href="/admin/clients/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          + Add Client
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{allClients.length}</div>
          <div className="text-sm text-gray-500 mt-1">Total Clients</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-emerald-600">{goodClients}</div>
          <div className="text-sm text-gray-500 mt-1">Performing Well ✓</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-red-500">{riskClients}</div>
          <div className="text-sm text-gray-500 mt-1">Need Attention ⚠</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-orange-500">{locked}</div>
          <div className="text-sm text-gray-500 mt-1">Locked Accounts 🔒</div>
        </div>
      </div>

      {/* Token expired alert — shown prominently so admin can re-connect */}
      {unreadNotifs.some(n => n.type === "token_expired") && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="font-semibold text-red-800 text-sm mb-1">🔑 Google Re-connection Required</div>
            <div className="text-sm text-red-700">
              Client data is not loading because the Google access token expired. Sign out and sign in again to fix.
            </div>
          </div>
          <a href="/login"
            className="ml-6 shrink-0 bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            Reconnect Google →
          </a>
        </div>
      )}

      {/* Other alerts */}
      {unreadNotifs.filter(n => n.type !== "token_expired").length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
          <h2 className="font-semibold text-amber-900 mb-3 text-sm">⚠ Alerts ({unreadNotifs.filter(n => n.type !== "token_expired").length})</h2>
          {unreadNotifs.filter(n => n.type !== "token_expired").map(n => (
            <div key={n.id} className="text-sm text-amber-800 mb-1">• {n.message}</div>
          ))}
        </div>
      )}

      {/* All clients table with health scores */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All Clients — Health Overview</h2>
          <p className="text-xs text-gray-400 mt-0.5">Score = clicks trend + position + CTR combined</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="text-left px-5 py-3">Client</th>
                <th className="text-left px-5 py-3">Domain</th>
                <th className="text-right px-4 py-3">Clicks</th>
                <th className="text-right px-4 py-3">Impressions</th>
                <th className="text-right px-4 py-3">Position</th>
                <th className="text-right px-4 py-3">30d Trend</th>
                <th className="text-center px-4 py-3">Health</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {clientsWithHealth.map(c => {
                const h = healthLabel(c.score)
                const up = c.trend > 0
                const down = c.trend < 0
                return (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div className="font-medium text-gray-900 text-sm">{c.name}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{c.domain}</td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-blue-600">
                      {c.gscSiteUrl ? fmt(c.clicks) : "—"}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-gray-600">
                      {c.gscSiteUrl ? fmt(c.impressions) : "—"}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-gray-600">
                      {c.position > 0 ? c.position.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {c.prevClicks > 0 || c.clicks > 0 ? (
                        <span className={`text-xs font-semibold ${up ? "text-emerald-600" : down ? "text-red-500" : "text-gray-400"}`}>
                          {up ? "▲" : down ? "▼" : "—"} {Math.abs(c.trend).toFixed(0)}%
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {c.score > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-full max-w-[60px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: h.dot }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: h.dot }}>{c.score}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: h.bg, color: h.color }}>
                            {h.label}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">No GSC</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        c.status === "active" ? "bg-green-100 text-green-700" :
                        c.status === "locked" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/clients/${c.id}`}
                        className="text-sm text-blue-600 hover:underline font-medium">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {allClients.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-gray-400 text-sm">
                    No clients yet.{" "}
                    <Link href="/admin/clients/new" className="text-blue-600 hover:underline">Add your first client</Link>
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
