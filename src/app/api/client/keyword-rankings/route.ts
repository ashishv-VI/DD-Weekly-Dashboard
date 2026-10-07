export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients, keywordRankings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { extractGsheetConfig, fetchAllMonthRankings } from "@/lib/gsheet-rankings"

// GET /api/client/keyword-rankings
// Returns all historical keyword ranking data for the authenticated client.
// If the client has a Google Sheet configured, every month column in the sheet is
// read live and overrides the saved history for that month — so sheet edits show
// up immediately. Months only in the database (e.g. old uploads) are kept.
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

  const [rows, [client]] = await Promise.all([
    db
      .select()
      .from(keywordRankings)
      .where(eq(keywordRankings.clientId, payload.sub))
      .orderBy(keywordRankings.month, keywordRankings.keyword),
    db.select({ notes: clients.notes, slug: clients.slug }).from(clients).where(eq(clients.id, payload.sub)).limit(1),
  ])

  // Live months from the Google Sheet (if configured). A failed fetch just falls back to saved history.
  const cfg = extractGsheetConfig(client?.notes ?? null, client?.slug)
  const sheetMonths = cfg?.mapping?.keyword
    ? (await fetchAllMonthRankings(cfg.gsheetUrl, cfg.gsheetTab, cfg.mapping.keyword)).months
        .filter(m => m.rows.some(r => r.position !== null))
    : []
  const liveMonths = new Set(sheetMonths.map(m => m.month))

  // Build a pivot: keyword → month → position
  const data: Record<string, Record<string, number | null>> = {}
  const monthSet = new Set<string>()
  const keywordSet = new Set<string>()
  const put = (keyword: string, month: string, position: number | null) => {
    keywordSet.add(keyword)
    monthSet.add(month)
    if (!data[keyword]) data[keyword] = {}
    data[keyword][month] = position
  }

  for (const row of rows) {
    if (!liveMonths.has(row.month)) put(row.keyword, row.month, row.position)
  }
  for (const { month, rows: sheetRows } of sheetMonths) {
    for (const r of sheetRows) put(r.keyword, month, r.position)
  }

  const months = Array.from(monthSet).sort((a, b) => b.localeCompare(a))
  const keywords = Array.from(keywordSet).sort()

  const noCache = { headers: { "Cache-Control": "private, no-store" } }
  return NextResponse.json({ keywords, months, data }, noCache)
}
