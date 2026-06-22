import { google } from "googleapis"

function getGSCClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.searchconsole({ version: "v1", auth })
}

export async function getGSCProperties(accessToken: string) {
  const client = getGSCClient(accessToken)
  const res = await client.sites.list()
  return res.data.siteEntry ?? []
}

export interface GSCMetrics {
  clicks: number
  impressions: number
  ctr: number
  position: number
  prevClicks: number
  prevImpressions: number
  prevCtr: number
  prevPosition: number
}

export interface GSCDailyRow {
  date: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface KeywordRow {
  keyword: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export async function getGSCMetrics(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<{ totals: GSCMetrics; daily: GSCDailyRow[] }> {
  const client = getGSCClient(accessToken)
  const prevRange = shiftDateRange(startDate, endDate)

  const [currRes, prevRes, dailyRes] = await Promise.all([
    client.searchanalytics.query({
      siteUrl,
      requestBody: { startDate, endDate, dimensions: [] },
    }),
    client.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: prevRange.start, endDate: prevRange.end, dimensions: [] },
    }),
    client.searchanalytics.query({
      siteUrl,
      requestBody: { startDate, endDate, dimensions: ["date"], rowLimit: 90 },
    }),
  ])

  const curr = currRes.data.rows?.[0] ?? {}
  const prev = prevRes.data.rows?.[0] ?? {}

  const totals: GSCMetrics = {
    clicks: curr.clicks ?? 0,
    impressions: curr.impressions ?? 0,
    ctr: (curr.ctr ?? 0) * 100,
    position: curr.position ?? 0,
    prevClicks: prev.clicks ?? 0,
    prevImpressions: prev.impressions ?? 0,
    prevCtr: (prev.ctr ?? 0) * 100,
    prevPosition: prev.position ?? 0,
  }

  const daily: GSCDailyRow[] = (dailyRes.data.rows ?? []).map((r) => ({
    date: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: (r.ctr ?? 0) * 100,
    position: r.position ?? 0,
  }))

  return { totals, daily }
}

export async function getTopKeywords(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 100,
): Promise<KeywordRow[]> {
  const client = getGSCClient(accessToken)
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit,
    },
  })
  return (res.data.rows ?? []).map((r) => ({
    keyword: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: (r.ctr ?? 0) * 100,
    position: r.position ?? 0,
  }))
}

export async function getLandingPages(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 100,
) {
  const client = getGSCClient(accessToken)
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit,
    },
  })
  return (res.data.rows ?? []).map((r) => ({
    url: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: (r.ctr ?? 0) * 100,
    position: r.position ?? 0,
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
