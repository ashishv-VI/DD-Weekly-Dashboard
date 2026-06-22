export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getGA4Properties } from "@/lib/google/ga4"
import { getGSCProperties } from "@/lib/google/gsc"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [ga4Props, gscProps] = await Promise.all([
      getGA4Properties(session.accessToken),
      getGSCProperties(session.accessToken),
    ])

    // Match GA4 properties to GSC sites by domain
    const properties = ga4Props.flatMap((ga4) => {
      const domain = ga4.displayName?.toLowerCase().replace(/^www\./, "") ?? ""
      const matchedGsc = gscProps.find((gsc) => {
        const gscDomain = (gsc.siteUrl ?? "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
        return gscDomain.includes(domain) || domain.includes(gscDomain)
      })

      if (!matchedGsc) return []

      const id = ga4.name?.replace("properties/", "") ?? ""
      return [{
        ga4Id: id,
        ga4Name: ga4.displayName ?? id,
        gscUrl: matchedGsc.siteUrl ?? "",
        label: ga4.displayName ?? matchedGsc.siteUrl ?? id,
      }]
    })

    // Fallback: return all possible combinations if no matches found
    if (properties.length === 0) {
      return NextResponse.json(
        ga4Props.map((ga4) => ({
          ga4Id: ga4.name?.replace("properties/", "") ?? "",
          ga4Name: ga4.displayName ?? "",
          gscUrl: gscProps[0]?.siteUrl ?? "",
          label: ga4.displayName ?? "",
        })),
      )
    }

    return NextResponse.json(properties)
  } catch (e) {
    console.error("Properties error:", e)
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 })
  }
}
