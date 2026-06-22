import { google } from "googleapis"

function getAnalyticsClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.analyticsdata({ version: "v1beta", auth })
}

export async function getGA4Properties(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const admin = google.analyticsadmin({ version: "v1beta", auth })
  const res = await admin.properties.list({ filter: "parent:accounts/-" })
  return res.data.properties ?? []
}

export interface DashboardMetrics {
  clicks: number
  impressions: number
  ctr: number
  position: number
  sessions: number
  users: number
  engagedSessions: number
  engagementRate: number
  conversions: number
  revenue: number
  prevClicks: number
  prevImpressions: number
  prevSessions: number
  prevConversions: number
}

export interface DailyMetric {
  date: string
  clicks: number
  sessions: number
  conversions: number
}

export async function getGA4Metrics(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<{ totals: Partial<DashboardMetrics>; daily: DailyMetric[] }> {
  const client = getAnalyticsClient(accessToken)

  const [totalRes, dailyRes] = await Promise.all([
    client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          { startDate, endDate },
          { startDate: shiftDateRange(startDate, endDate).start, endDate: shiftDateRange(startDate, endDate).end },
        ],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "engagedSessions" },
          { name: "engagementRate" },
          { name: "conversions" },
          { name: "purchaseRevenue" },
        ],
      },
    }),
    client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "conversions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      },
    }),
  ])

  const rows = totalRes.data.rows ?? []
  const curr = rows[0]?.metricValues ?? []
  const prev = rows[1]?.metricValues ?? []

  const totals: Partial<DashboardMetrics> = {
    sessions: Number(curr[0]?.value ?? 0),
    users: Number(curr[1]?.value ?? 0),
    engagedSessions: Number(curr[2]?.value ?? 0),
    engagementRate: Number(curr[3]?.value ?? 0) * 100,
    conversions: Number(curr[4]?.value ?? 0),
    revenue: Number(curr[5]?.value ?? 0),
    prevSessions: Number(prev[0]?.value ?? 0),
    prevConversions: Number(prev[4]?.value ?? 0),
  }

  const daily: DailyMetric[] = (dailyRes.data.rows ?? []).map((r) => ({
    date: r.dimensionValues?.[0]?.value ?? "",
    clicks: 0,
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    conversions: Number(r.metricValues?.[1]?.value ?? 0),
  }))

  return { totals, daily }
}

export async function getChannelBreakdown(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
) {
  const client = getAnalyticsClient(accessToken)
  const res = await client.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
    },
  })
  return (res.data.rows ?? []).map((r) => ({
    channel: r.dimensionValues?.[0]?.value ?? "Unknown",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }))
}

function shiftDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const newEnd = new Date(s)
  newEnd.setDate(newEnd.getDate() - 1)
  const newStart = new Date(newEnd)
  newStart.setDate(newStart.getDate() - days + 1)
  return {
    start: newStart.toISOString().split("T")[0],
    end: newEnd.toISOString().split("T")[0],
  }
}
