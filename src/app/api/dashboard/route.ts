export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getGA4Metrics } from "@/lib/google/ga4"
import { getGSCMetrics } from "@/lib/google/gsc"
import { getDateRange } from "@/lib/dateRange"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const ga4Id = searchParams.get("ga4")
  const gscUrl = searchParams.get("gsc")
  const range = searchParams.get("range") ?? "30d"

  if (!ga4Id || !gscUrl) {
    return NextResponse.json({ error: "Missing ga4 or gsc params" }, { status: 400 })
  }

  const { startDate, endDate } = getDateRange(range)

  try {
    const [ga4Result, gscResult] = await Promise.all([
      getGA4Metrics(session.accessToken, ga4Id, startDate, endDate),
      getGSCMetrics(session.accessToken, gscUrl, startDate, endDate),
    ])

    return NextResponse.json({
      gsc: {
        ...gscResult.totals,
        daily: gscResult.daily,
      },
      ga4: {
        ...ga4Result.totals,
        daily: ga4Result.daily,
      },
    })
  } catch (e) {
    console.error("Dashboard API error:", e)
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
