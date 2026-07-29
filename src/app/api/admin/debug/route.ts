export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { users, clients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getSuperAdminToken } from "@/lib/auth/get-super-admin-token"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "No session" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const testClient = searchParams.get("client")

  // 1. Session info (current logged-in admin user)
  const sessionInfo = {
    email: session.user?.email,
    hasSessionToken: !!session.accessToken,
    sessionError: (session as { error?: string }).error ?? null,
    tokenPreview: session.accessToken ? (session.accessToken as string).slice(0, 20) + "..." : null,
  }

  // 2. All users in DB (for diagnosis)
  const allUsers = await db.select({
    email: users.email,
    role: users.role,
    hasAccessToken: users.googleAccessToken,
    hasRefreshToken: users.googleRefreshToken,
  }).from(users)

  const dbInfo = allUsers.map(u => ({
    email: u.email,
    role: u.role,
    hasAccessToken: !!u.hasAccessToken,
    hasRefreshToken: !!u.hasRefreshToken,
    tokenPreview: u.hasAccessToken ? (u.hasAccessToken as string).slice(0, 20) + "..." : null,
  }))

  // 3. Get super_admin token (the one actually used for data fetching)
  const superAdminToken = await getSuperAdminToken()
  const superAdminInfo = {
    tokenFound: !!superAdminToken,
    tokenPreview: superAdminToken ? superAdminToken.slice(0, 20) + "..." : null,
  }

  // 4. Test actual API call using super_admin token
  let apiTest = null
  if (testClient && superAdminToken) {
    const [clientRow] = await db.select().from(clients).where(eq(clients.slug, testClient)).limit(1)
    if (clientRow) {
      let gscResult = null
      if (clientRow.gscSiteUrl) {
        try {
          const res = await fetch(
            `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(clientRow.gscSiteUrl)}/searchAnalytics/query`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${superAdminToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ startDate: "2025-05-01", endDate: "2025-05-31", dimensions: ["query"], rowLimit: 1 }),
            }
          )
          const data = await res.json()
          gscResult = res.ok ? "OK" : `${res.status}: ${JSON.stringify(data.error?.message ?? data)}`
        } catch (e) {
          gscResult = e instanceof Error ? e.message : String(e)
        }
      }

      let ga4Result = null
      if (clientRow.ga4PropertyId) {
        try {
          const res = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/properties/${clientRow.ga4PropertyId}:runReport`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${superAdminToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                dateRanges: [{ startDate: "2025-05-01", endDate: "2025-05-31" }],
                metrics: [{ name: "sessions" }],
              }),
            }
          )
          const data = await res.json()
          ga4Result = res.ok ? "OK" : `${res.status}: ${JSON.stringify(data.error?.message ?? data)}`
        } catch (e) {
          ga4Result = e instanceof Error ? e.message : String(e)
        }
      }

      apiTest = {
        clientName: clientRow.name,
        gscUrl: clientRow.gscSiteUrl,
        ga4PropertyId: clientRow.ga4PropertyId,
        gscResult,
        ga4Result,
        tokenUsed: "super_admin (damcodigitalseo@gmail.com)",
      }
    } else {
      apiTest = { error: `Client "${testClient}" not found` }
    }
  } else if (testClient && !superAdminToken) {
    apiTest = { error: "No super_admin token available. Run /api/admin/fix-roles first, then damcodigitalseo@gmail.com must log in." }
  }

  return NextResponse.json({ sessionInfo, dbInfo, superAdminInfo, apiTest })
}
