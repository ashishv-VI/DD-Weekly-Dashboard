export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients, users } from "@/lib/db/schema"
import { eq, isNotNull } from "drizzle-orm"
import { getGSCMetrics, getTopKeywords, getLandingPages } from "@/lib/google/gsc"
import { getGA4Metrics, getDeviceBreakdown, getCountryTraffic } from "@/lib/google/ga4"
import { getDateRange } from "@/lib/dateRange"

export async function GET(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const payload = await verifyClientToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = searchParams.get("range") || "30d"

  const [client] = await db.select().from(clients).where(eq(clients.id, payload.sub)).limit(1)
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  if (!client.ga4PropertyId && !client.gscSiteUrl) {
    return NextResponse.json({ error: "No GA4 or GSC configured for this client" }, { status: 400 })
  }

  // Use team's stored Google access token
  const [teamMember] = await db
    .select()
    .from(users)
    .where(isNotNull(users.googleAccessToken))
    .limit(1)

  const accessToken = teamMember?.googleAccessToken
  if (!accessToken) {
    return NextResponse.json({ error: "No Google account connected. Please sign in as admin first." }, { status: 400 })
  }

  const { startDate, endDate } = getDateRange(range)

  const [gsc, ga4, keywords, pages, devices, countries] = await Promise.all([
    client.gscSiteUrl
      ? getGSCMetrics(accessToken, client.gscSiteUrl, startDate, endDate)
      : Promise.resolve(null),
    client.ga4PropertyId
      ? getGA4Metrics(accessToken, client.ga4PropertyId, startDate, endDate)
      : Promise.resolve(null),
    client.gscSiteUrl
      ? getTopKeywords(accessToken, client.gscSiteUrl, startDate, endDate, 25)
      : Promise.resolve([]),
    client.gscSiteUrl
      ? getLandingPages(accessToken, client.gscSiteUrl, startDate, endDate, 25)
      : Promise.resolve([]),
    client.ga4PropertyId
      ? getDeviceBreakdown(accessToken, client.ga4PropertyId, startDate, endDate)
      : Promise.resolve([]),
    client.ga4PropertyId
      ? getCountryTraffic(accessToken, client.ga4PropertyId, startDate, endDate)
      : Promise.resolve([]),
  ])

  return NextResponse.json({ gsc, ga4, keywords, pages, devices, countries })
}
