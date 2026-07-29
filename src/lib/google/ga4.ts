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
  newUsers: number
  returningUsers: number
  engagedSessions: number
  engagementRate: number
  conversions: number
  revenue: number
  avgSessionDuration: number
  screenPageViewsPerSession: number
  prevClicks: number
  prevImpressions: number
  prevSessions: number
  prevUsers: number
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
          { name: "newUsers" },
          { name: "engagedSessions" },
          { name: "engagementRate" },
          { name: "conversions" },
          { name: "purchaseRevenue" },
          { name: "averageSessionDuration" },
          { name: "screenPageViewsPerSession" },
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
    newUsers: Number(curr[2]?.value ?? 0),
    returningUsers: Math.max(0, Number(curr[1]?.value ?? 0) - Number(curr[2]?.value ?? 0)),
    engagedSessions: Number(curr[3]?.value ?? 0),
    engagementRate: Number(curr[4]?.value ?? 0) * 100,
    conversions: Number(curr[5]?.value ?? 0),
    revenue: Number(curr[6]?.value ?? 0),
    avgSessionDuration: Number(curr[7]?.value ?? 0),
    screenPageViewsPerSession: Number(curr[8]?.value ?? 0),
    prevSessions: Number(prev[0]?.value ?? 0),
    prevUsers: Number(prev[1]?.value ?? 0),
    prevConversions: Number(prev[5]?.value ?? 0),
  }

  const daily: DailyMetric[] = (dailyRes.data.rows ?? []).map((r) => ({
    date: r.dimensionValues?.[0]?.value ?? "",
    clicks: 0,
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    conversions: Number(r.metricValues?.[1]?.value ?? 0),
  }))

  return { totals, daily }
}

export async function getDeviceBreakdown(
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
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
  })
  return (res.data.rows ?? []).map((r) => ({
    device: r.dimensionValues?.[0]?.value ?? "Unknown",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    users: Number(r.metricValues?.[1]?.value ?? 0),
  }))
}

export async function getCountryTraffic(
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
      dimensions: [{ name: "country" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
  })
  return (res.data.rows ?? []).slice(0, 10).map((r) => ({
    country: r.dimensionValues?.[0]?.value ?? "Unknown",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    users: Number(r.metricValues?.[1]?.value ?? 0),
  }))
}

export interface ChannelRow {
  channel: string
  sessions: number
  users: number
  engagementRate: number
  conversions: number
  prevSessions: number
}

export async function getTrafficByChannel(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<ChannelRow[]> {
  const client = getAnalyticsClient(accessToken)
  const prev = shiftDateRange(startDate, endDate)

  const [currRes, prevRes] = await Promise.all([
    client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "engagementRate" },
          { name: "conversions" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      },
    }),
    client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: prev.start, endDate: prev.end }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
      },
    }),
  ])

  const prevMap = new Map<string, number>()
  for (const r of prevRes.data.rows ?? []) {
    const ch = r.dimensionValues?.[0]?.value ?? ""
    prevMap.set(ch, Number(r.metricValues?.[0]?.value ?? 0))
  }

  return (currRes.data.rows ?? []).map((r) => {
    const ch = r.dimensionValues?.[0]?.value ?? "Other"
    return {
      channel: ch,
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      users: Number(r.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(r.metricValues?.[2]?.value ?? 0) * 100,
      conversions: Number(r.metricValues?.[3]?.value ?? 0),
      prevSessions: prevMap.get(ch) ?? 0,
    }
  })
}

const AI_SOURCES = [
  "chat.openai.com",
  "chatgpt.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "bard.google.com",
  "copilot.microsoft.com",
  "bing.com",
  "you.com",
  "phind.com",
  "character.ai",
  "poe.com",
  "kagi.com",
  "mistral.ai",
  "meta.ai",
  "grok.x.ai",
]

export interface AISourceRow {
  source: string
  sessions: number
  users: number
  avgDuration: number
  conversions: number
}

export interface AILandingPage {
  page: string
  sessions: number
  users: number
}

export interface AITrafficData {
  total: number
  totalUsers: number
  bySource: AISourceRow[]
  topPages: AILandingPage[]
  daily: { date: string; sessions: number }[]
}

export async function getAITraffic(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<AITrafficData> {
  const client = getAnalyticsClient(accessToken)

  const filter = {
    filter: {
      fieldName: "sessionSource",
      inListFilter: { values: AI_SOURCES },
    },
  }

  const [bySourceRes, byPageRes, dailyRes] = await Promise.all([
    client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "averageSessionDuration" },
          { name: "conversions" },
        ],
        dimensionFilter: filter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      },
    }),
    client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "landingPage" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        dimensionFilter: filter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "10",
      },
    }),
    client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: filter,
        orderBys: [{ dimension: { dimensionName: "date" } }],
      },
    }),
  ])

  const bySource: AISourceRow[] = (bySourceRes.data.rows ?? []).map((r) => ({
    source: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    users: Number(r.metricValues?.[1]?.value ?? 0),
    avgDuration: Number(r.metricValues?.[2]?.value ?? 0),
    conversions: Number(r.metricValues?.[3]?.value ?? 0),
  }))

  const topPages: AILandingPage[] = (byPageRes.data.rows ?? []).map((r) => ({
    page: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    users: Number(r.metricValues?.[1]?.value ?? 0),
  }))

  const daily = (dailyRes.data.rows ?? []).map((r) => ({
    date: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }))

  const total = bySource.reduce((s, r) => s + r.sessions, 0)
  const totalUsers = bySource.reduce((s, r) => s + r.users, 0)

  return { total, totalUsers, bySource, topPages, daily }
}

export interface UserBreakdownRow {
  type: "new" | "returning"
  sessions: number
  users: number
  avgDuration: number
  engagementRate: number
  pagesPerSession: number
}

export async function getUserBreakdown(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<UserBreakdownRow[]> {
  const client = getAnalyticsClient(accessToken)
  const res = await client.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "newVsReturning" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "averageSessionDuration" },
        { name: "engagementRate" },
        { name: "screenPageViewsPerSession" },
      ],
    },
  })

  // GA4 can return "(not set)" as a third value — merge all rows by type to avoid duplicates
  const acc: Record<string, { sessions: number; users: number; totalDuration: number; totalEngRate: number; totalPPS: number; count: number }> = {}

  for (const r of res.data.rows ?? []) {
    const raw = r.dimensionValues?.[0]?.value ?? ""
    const type = raw.toLowerCase().includes("new") ? "new" : "returning"
    const sessions = Number(r.metricValues?.[0]?.value ?? 0)
    if (!acc[type]) acc[type] = { sessions: 0, users: 0, totalDuration: 0, totalEngRate: 0, totalPPS: 0, count: 0 }
    acc[type].sessions += sessions
    acc[type].users += Number(r.metricValues?.[1]?.value ?? 0)
    acc[type].totalDuration += Number(r.metricValues?.[2]?.value ?? 0) * sessions
    acc[type].totalEngRate += Number(r.metricValues?.[3]?.value ?? 0) * 100 * sessions
    acc[type].totalPPS += Number(r.metricValues?.[4]?.value ?? 0) * sessions
    acc[type].count += sessions
  }

  return (Object.entries(acc) as ["new" | "returning", typeof acc[string]][]).map(([type, v]) => ({
    type,
    sessions: v.sessions,
    users: v.users,
    avgDuration: v.count > 0 ? v.totalDuration / v.count : 0,
    engagementRate: v.count > 0 ? v.totalEngRate / v.count : 0,
    pagesPerSession: v.count > 0 ? v.totalPPS / v.count : 0,
  }))
}

export interface PagePerformanceRow {
  landingPage: string
  users: number
  sessions: number
  avgEngagementTime: number
  conversions: number
  engagementRate: number
}

export async function getPagePerformance(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<PagePerformanceRow[]> {
  const client = getAnalyticsClient(accessToken)
  const res = await client.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "landingPage" }],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "userEngagementDuration" },
        { name: "conversions" },
        { name: "engagementRate" },
      ],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
    },
  })
  return (res.data.rows ?? []).map(r => ({
    landingPage: r.dimensionValues?.[0]?.value ?? "",
    users: Number(r.metricValues?.[0]?.value ?? 0),
    sessions: Number(r.metricValues?.[1]?.value ?? 0),
    avgEngagementTime: Number(r.metricValues?.[2]?.value ?? 0) / Math.max(Number(r.metricValues?.[1]?.value ?? 1), 1),
    conversions: Number(r.metricValues?.[3]?.value ?? 0),
    engagementRate: Number(r.metricValues?.[4]?.value ?? 0) * 100,
  }))
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
