export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getGSCMetrics } from "@/lib/google/gsc"
import { getGA4Metrics } from "@/lib/google/ga4"
import { getDateRange } from "@/lib/dateRange"

export async function GET(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const payload = await verifyClientToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = searchParams.get("range") || "30d"

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, payload.sub))
    .limit(1)

  if (!client?.googleAccessToken) {
    return NextResponse.json({ error: "Google not connected for this client" }, { status: 400 })
  }

  const { startDate, endDate } = getDateRange(range)

  const [gsc, ga4] = await Promise.all([
    client.gscSiteUrl
      ? getGSCMetrics(client.googleAccessToken, client.gscSiteUrl, startDate, endDate)
      : Promise.resolve(null),
    client.ga4PropertyId
      ? getGA4Metrics(client.googleAccessToken, client.ga4PropertyId, startDate, endDate)
      : Promise.resolve(null),
  ])

  return NextResponse.json({ gsc, ga4 })
}
