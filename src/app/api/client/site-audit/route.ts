export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

interface AuditCheck { label: string; detail: string; status: "ok" | "warn" | "fail" }
interface SiteAuditResult {
  robots: { status: "ok" | "warn" | "fail"; checks: AuditCheck[] }
  sitemap: { status: "ok" | "warn" | "fail"; urlCount: number; checks: AuditCheck[] }
  schema: { status: "ok" | "warn" | "fail"; types: string[]; checks: AuditCheck[] }
}

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const payload = await verifyClientToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  const [client] = await db.select().from(clients).where(eq(clients.id, payload.sub)).limit(1)
  if (!client?.domain) return NextResponse.json({ error: "No domain" }, { status: 400 })

  const base = client.domain.startsWith("http") ? client.domain : `https://${client.domain}`
  const origin = base.replace(/\/$/, "")

  const [robotsRes, sitemapRes, htmlRes] = await Promise.allSettled([
    fetch(`${origin}/robots.txt`, { headers: { "User-Agent": "Googlebot" }, signal: AbortSignal.timeout(8000) }),
    fetch(`${origin}/sitemap.xml`, { headers: { "User-Agent": "Googlebot" }, signal: AbortSignal.timeout(8000) }),
    fetch(`${origin}/`, { headers: { "User-Agent": "Googlebot" }, signal: AbortSignal.timeout(8000) }),
  ])

  // ── Robots.txt ──────────────────────────────────────────────────────────────
  const robotsChecks: AuditCheck[] = []
  let robotsText = ""
  if (robotsRes.status === "fulfilled" && robotsRes.value.ok) {
    robotsText = await robotsRes.value.text()
    robotsChecks.push({ label: "Google can find and visit your site", detail: "No pages are accidentally hidden from Google.", status: "ok" })

    const blocksAll = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/(?!\S)/i.test(robotsText)
    if (blocksAll) {
      robotsChecks.push({ label: "Google is blocked from your entire site", detail: "Your robots.txt has 'Disallow: /' which prevents Google from indexing anything.", status: "fail" })
    } else {
      robotsChecks.push({ label: "Important pages are accessible", detail: "Your key pages are open for Google to crawl.", status: "ok" })
    }

    const hasSitemap = /sitemap/i.test(robotsText)
    robotsChecks.push(hasSitemap
      ? { label: "Sitemap is linked here", detail: "Google knows where to find your full list of pages.", status: "ok" }
      : { label: "Sitemap not mentioned", detail: "Adding 'Sitemap: yourdomain.com/sitemap.xml' helps Google find all your pages faster.", status: "warn" }
    )
  } else {
    robotsChecks.push(
      { label: "Robots.txt file is missing", detail: "Google will use default rules, but having one gives you more control.", status: "warn" },
      { label: "Cannot verify page access rules", detail: "Without a robots.txt, there may be accidental blocks.", status: "warn" }
    )
  }
  const robotsStatus: "ok" | "warn" | "fail" = robotsChecks.some(c => c.status === "fail") ? "fail" : robotsChecks.some(c => c.status === "warn") ? "warn" : "ok"

  // ── Sitemap ──────────────────────────────────────────────────────────────────
  const sitemapChecks: AuditCheck[] = []
  let urlCount = 0
  if (sitemapRes.status === "fulfilled" && sitemapRes.value.ok) {
    const xml = await sitemapRes.value.text()
    const matches = xml.match(/<loc>/g)
    urlCount = matches ? matches.length : 0
    sitemapChecks.push({ label: "Sitemap exists and is working", detail: `Found at ${origin}/sitemap.xml — ${urlCount} pages listed.`, status: "ok" })
    const isValidXml = xml.trim().startsWith("<?xml") || xml.includes("<urlset") || xml.includes("<sitemapindex")
    sitemapChecks.push(isValidXml
      ? { label: "Format is correct", detail: "Google can read it without any errors.", status: "ok" }
      : { label: "Sitemap format has issues", detail: "The XML structure may not be valid. Google could struggle to read it.", status: "warn" }
    )
    const lastmodMatch = xml.match(/<lastmod>([^<]+)<\/lastmod>/)
    if (lastmodMatch) {
      const lastmod = new Date(lastmodMatch[1])
      const daysSince = Math.floor((Date.now() - lastmod.getTime()) / 86400000)
      sitemapChecks.push(daysSince > 30
        ? { label: `Sitemap not updated in ${daysSince} days`, detail: "If you've added new pages recently, resubmit your sitemap in Google Search Console.", status: "warn" }
        : { label: "Sitemap is up to date", detail: `Last updated ${daysSince} days ago — Google has your latest pages.`, status: "ok" }
      )
    } else {
      sitemapChecks.push({ label: "No last-updated date in sitemap", detail: "Adding lastmod dates helps Google prioritise which pages to recrawl.", status: "warn" })
    }
  } else {
    sitemapChecks.push(
      { label: "No sitemap found", detail: `Could not find a sitemap at ${origin}/sitemap.xml. This slows down Google's ability to discover all your pages.`, status: "fail" },
      { label: "All pages may not be indexed", detail: "Without a sitemap, Google may miss some of your important pages.", status: "warn" }
    )
  }
  const sitemapStatus: "ok" | "warn" | "fail" = sitemapChecks.some(c => c.status === "fail") ? "fail" : sitemapChecks.some(c => c.status === "warn") ? "warn" : "ok"

  // ── Schema ───────────────────────────────────────────────────────────────────
  const schemaChecks: AuditCheck[] = []
  const schemaTypes: string[] = []
  if (htmlRes.status === "fulfilled" && htmlRes.value.ok) {
    const html = await htmlRes.value.text()
    const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    if (scripts.length > 0) {
      for (const s of scripts) {
        try {
          const parsed = JSON.parse(s[1])
          const type = parsed["@type"]
          if (type) schemaTypes.push(Array.isArray(type) ? type.join(", ") : type)
        } catch {}
      }
      schemaChecks.push({ label: "Business info code is present", detail: `Found: ${schemaTypes.join(", ") || "structured data"}. Google understands your site better.`, status: "ok" })
      const hasLocal = schemaTypes.some(t => /LocalBusiness|AutoDealer|CarDealer|Store/i.test(t))
      schemaChecks.push(hasLocal
        ? { label: "Local business details found", detail: "Your address, phone, and hours are set up — good for local Google searches.", status: "ok" }
        : { label: "No local business details", detail: "Adding your address, phone, and hours helps you appear in Google Maps and local searches.", status: "warn" }
      )
      const hasService = schemaTypes.some(t => /Service|Product|Offer/i.test(t))
      schemaChecks.push(hasService
        ? { label: "Service information found", detail: "Your services are described to Google — helps with specific search queries.", status: "ok" }
        : { label: "Services not described to Google", detail: "Describing your services in structured code helps Google show you for more specific searches.", status: "warn" }
      )
      schemaChecks.push({ label: "No broken or invalid code", detail: "What's there is correctly formatted — no errors.", status: "ok" })
    } else {
      schemaChecks.push(
        { label: "No business info found", detail: "Your site doesn't tell Google what your business is or does — a missed opportunity.", status: "fail" },
        { label: "Missing local business details", detail: "Adding your address, phone, and hours can help you appear in local Google searches and Maps.", status: "fail" },
        { label: "No service descriptions", detail: "Describing your services helps Google match you to more specific searches.", status: "warn" }
      )
    }
  } else {
    schemaChecks.push({ label: "Could not check your homepage", detail: "The homepage was not accessible during this check.", status: "warn" })
  }
  const schemaStatus: "ok" | "warn" | "fail" = schemaChecks.some(c => c.status === "fail") ? "fail" : schemaChecks.some(c => c.status === "warn") ? "warn" : "ok"

  const result: SiteAuditResult = {
    robots: { status: robotsStatus, checks: robotsChecks },
    sitemap: { status: sitemapStatus, urlCount, checks: sitemapChecks },
    schema: { status: schemaStatus, types: schemaTypes, checks: schemaChecks },
  }
  return NextResponse.json(result)
}
