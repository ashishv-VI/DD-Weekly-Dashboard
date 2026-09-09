export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { keywordRankings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// GET /api/client/keyword-rankings
// Returns all historical keyword ranking data for the authenticated client.
// Response shape:
//   {
//     keywords: string[],          // sorted list of all unique keywords
//     months: string[],            // sorted desc ["2026-09", "2026-08", ...]
//     data: {                      // keyed by keyword → month → position | null
//       [keyword: string]: { [month: string]: number | null }
//     }
//   }

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const payload = await verifyClientToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  const rows = await db
    .select()
    .from(keywordRankings)
    .where(eq(keywordRankings.clientId, payload.sub))
    .orderBy(keywordRankings.month, keywordRankings.keyword)

  // Build a pivot: keyword → month → position
  const data: Record<string, Record<string, number | null>> = {}
  const monthSet = new Set<string>()
  const keywordSet = new Set<string>()

  for (const row of rows) {
    keywordSet.add(row.keyword)
    monthSet.add(row.month)
    if (!data[row.keyword]) data[row.keyword] = {}
    data[row.keyword][row.month] = row.position
  }

  const months = Array.from(monthSet).sort((a, b) => b.localeCompare(a))
  const keywords = Array.from(keywordSet).sort()

  const noCache = { headers: { "Cache-Control": "private, no-store" } }
  return NextResponse.json({ keywords, months, data }, noCache)
}
