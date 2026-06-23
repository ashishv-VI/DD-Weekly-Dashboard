export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { users, clients } from "@/lib/db/schema"
import { eq, isNotNull } from "drizzle-orm"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "No session" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const testClient = searchParams.get("client") // optional: test specific client slug

  // 1. Session info
  const sessionInfo = {
    email: session.user?.email,
    hasSessionToken: !!session.accessToken,
    sessionError: (session as { error?: string }).error ?? null,
    tokenPreview: session.accessToken ? (session.accessToken as string).slice(0, 20) + "..." : null,
  }

  // 2. DB token info
  const [teamMember] = await db.select().from(users).where(isNotNull(users.googleAccessToken)).limit(1)
  const dbInfo = {
    hasDbToken: !!teamMember?.googleAccessToken,
    hasRefreshToken: !!teamMember?.googleRefreshToken,
    dbEmail: teamMember?.email ?? null,
    dbTokenPreview: teamMember?.googleAccessToken ? teamMember.googleAccessToken.slice(0, 20) + "..." : null,
  }

  // 3. Save session token to DB
  let syncResult = null
  if (session.user?.email && session.accessToken) {
    try {
      await db.update(users)
        .set({ googleAccessToken: session.accessToken as string })
        .where(eq(users.email, session.user.email))
      syncResult = "token synced to DB"
    } catch (e) {
      syncResult = `sync error: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  // 4. Test actual API call if client specified
  let apiTest = null
  if (testClient && teamMember?.googleAccessToken) {
    const [clientRow] = await db.select().from(clients).where(eq(clients.slug, testClient)).limit(1)
    if (clientRow) {
      const token = session.accessToken as string || teamMember.googleAccessToken

      // Test GSC
      let gscError = null
      if (clientRow.gscSiteUrl) {
        try {
          const res = await fetch(
            `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(clientRow.gscSiteUrl)}/searchAnalytics/query`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ startDate: "2025-05-01", endDate: "2025-05-31", dimensions: ["query"], rowLimit: 1 }),
            }
          )
          const data = await res.json()
          gscError = res.ok ? "OK" : `${res.status}: ${JSON.stringify(data.error?.message ?? data)}`
        } catch (e) {
          gscError = e instanceof Error ? e.message : String(e)
        }
      }

      // Test GA4
      let ga4Error = null
      if (clientRow.ga4PropertyId) {
        try {
          const res = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/properties/${clientRow.ga4PropertyId}:runReport`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                dateRanges: [{ startDate: "2025-05-01", endDate: "2025-05-31" }],
                metrics: [{ name: "sessions" }],
              }),
            }
          )
          const data = await res.json()
          ga4Error = res.ok ? "OK" : `${res.status}: ${JSON.stringify(data.error?.message ?? data)}`
        } catch (e) {
          ga4Error = e instanceof Error ? e.message : String(e)
        }
      }

      apiTest = {
        clientName: clientRow.name,
        gscUrl: clientRow.gscSiteUrl,
        ga4PropertyId: clientRow.ga4PropertyId,
        gscResult: gscError,
        ga4Result: ga4Error,
      }
    } else {
      apiTest = { error: `Client with slug "${testClient}" not found` }
    }
  }

  return NextResponse.json({ sessionInfo, dbInfo, syncResult, apiTest })
}
