import { db } from "@/lib/db"
import { clients, notifications } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { getGSCMetrics } from "@/lib/google/gsc"
import { getDateRange } from "@/lib/dateRange"
import { getSuperAdminToken } from "@/lib/auth/get-super-admin-token"
import { AgencyDashboardClient } from "@/components/admin/AgencyDashboardClient"
import type { ClientWithHealth } from "@/components/admin/AgencyDashboardClient"

function parseNotesMeta(notes: string | null): { industry: string; country: string; assignedTo: string; logoUrl: string; themeColor: string } {
  if (!notes) return { industry: "", country: "", assignedTo: "", logoUrl: "", themeColor: "" }
  try {
    const p = JSON.parse(notes)
    if (p && p._v === 1) return { industry: p.industry || "", country: p.country || "", assignedTo: p.assignedTo || "", logoUrl: p.logoUrl || "", themeColor: p.themeColor || "" }
  } catch {}
  return { industry: "", country: "", assignedTo: "", logoUrl: "", themeColor: "" }
}

function getHealthScore(clicks: number, prevClicks: number, position: number, ctr: number): number {
  let score = 50
  if (prevClicks > 0) {
    const trend = ((clicks - prevClicks) / prevClicks) * 100
    score += Math.max(-25, Math.min(25, trend * 0.5))
  } else if (clicks > 0) {
    score += 15
  }
  if (position > 0 && position <= 3) score += 20
  else if (position <= 10) score += 10
  else if (position > 20) score -= 10
  if (ctr >= 5) score += 10
  else if (ctr >= 2) score += 5
  else if (ctr < 1 && ctr > 0) score -= 5
  return Math.round(Math.max(0, Math.min(100, score)))
}

export default async function AdminDashboard() {
  const [allClients, unreadNotifs, accessToken] = await Promise.all([
    db.select().from(clients).orderBy(desc(clients.createdAt)),
    db.select().from(notifications).where(eq(notifications.read, false)).orderBy(desc(notifications.createdAt)).limit(20),
    getSuperAdminToken(),
  ])

  const { startDate, endDate } = getDateRange("30d")

  if (accessToken) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.type, "token_expired")).catch(() => {})
  }

  const isTokenExpired = !accessToken && unreadNotifs.some(n => n.type === "token_expired")

  const clientsWithHealth: ClientWithHealth[] = await Promise.all(
    allClients.slice(0, 20).map(async (c) => {
      const meta = parseNotesMeta(c.notes)
      const base = { ...c, score: 0, clicks: 0, impressions: 0, position: 0, ctr: 0, prevClicks: 0, trend: 0, ...meta }
      if (!accessToken || !c.gscSiteUrl) return base
      try {
        const gsc = await getGSCMetrics(accessToken, c.gscSiteUrl, startDate, endDate)
        const t = gsc.totals
        const trend = t.prevClicks > 0 ? ((t.clicks - t.prevClicks) / t.prevClicks) * 100 : 0
        return {
          ...base,
          score: getHealthScore(t.clicks, t.prevClicks, t.position, t.ctr),
          clicks: t.clicks, impressions: t.impressions, position: t.position, ctr: t.ctr,
          prevClicks: t.prevClicks, trend,
        }
      } catch {
        return base
      }
    })
  )

  return <AgencyDashboardClient clients={clientsWithHealth} isTokenExpired={isTokenExpired} />
}
