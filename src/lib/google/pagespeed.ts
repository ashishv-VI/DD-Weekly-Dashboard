export interface PageSpeedMetrics {
  score: number
  lcp: string
  cls: string
  fcp: string
  tbt: string
  si: string
}

export interface PageSpeedResult {
  mobile: PageSpeedMetrics
  desktop: PageSpeedMetrics
}

function parseResult(data: Record<string, unknown>): PageSpeedMetrics {
  const lr = data.lighthouseResult as Record<string, unknown> | undefined
  const audits = lr?.audits as Record<string, { displayValue?: string }> | undefined
  const categories = lr?.categories as Record<string, { score?: number }> | undefined
  return {
    score: Math.round((categories?.performance?.score ?? 0) * 100),
    lcp: audits?.["largest-contentful-paint"]?.displayValue ?? "—",
    cls: audits?.["cumulative-layout-shift"]?.displayValue ?? "—",
    fcp: audits?.["first-contentful-paint"]?.displayValue ?? "—",
    tbt: audits?.["total-blocking-time"]?.displayValue ?? "—",
    si: audits?.["speed-index"]?.displayValue ?? "—",
  }
}

export async function getPageSpeed(url: string): Promise<PageSpeedResult> {
  const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
  const key = process.env.PAGESPEED_API_KEY ? `&key=${process.env.PAGESPEED_API_KEY}` : ""
  const encoded = encodeURIComponent(url)
  const cats = "&category=performance"

  const [mRes, dRes] = await Promise.all([
    fetch(`${base}?url=${encoded}&strategy=mobile${cats}${key}`),
    fetch(`${base}?url=${encoded}&strategy=desktop${cats}${key}`),
  ])

  const [mobile, desktop] = await Promise.all([mRes.json(), dRes.json()])

  if (mobile.error || !mobile.lighthouseResult) {
    throw new Error(mobile.error?.message ?? "PageSpeed API returned no lighthouse data")
  }

  return { mobile: parseResult(mobile), desktop: parseResult(desktop) }
}
