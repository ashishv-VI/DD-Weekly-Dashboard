export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { clients, keywordRankings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { fetchSheetRankings, fetchAllMonthRankings, extractGsheetConfig, currentMonth, type SheetRankingRow } from "@/lib/gsheet-rankings"

/**
 * Cron: runs daily at 06:00 UTC.
 * For each active client that has a Google Sheets ranking config:
 *   1. Fetch the sheet
 *   2. Save every month column (Jun'26, Jul'26…) to the keyword_rankings table.
 *      If the sheet has no month columns, save the "current rank" column as this month.
 * Each month only replaces itself, so history for months no longer in the sheet is kept.
 */
export async function GET(req: Request) {
  // Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const allClients = await db.select({ id: clients.id, name: clients.name, slug: clients.slug, notes: clients.notes })
    .from(clients)
    .where(eq(clients.status, "active"))

  const results: { client: string; status: string; months?: string[] }[] = []

  for (const client of allClients) {
    const cfg = extractGsheetConfig(client.notes, client.slug)
    if (!cfg) continue // no gsheet config — skip

    let toSave: { month: string; rows: SheetRankingRow[] }[] = []
    const all = await fetchAllMonthRankings(cfg.gsheetUrl, cfg.gsheetTab, cfg.mapping.keyword)
    if (all.months.length) {
      // Skip empty month columns so a blank column never wipes saved data
      toSave = all.months.filter(m => m.rows.some(r => r.position !== null))
    } else {
      const single = await fetchSheetRankings(cfg.gsheetUrl, cfg.gsheetTab, cfg.mapping)
      if (single.rows.length) toSave = [{ month: currentMonth(), rows: single.rows }]
      else {
        results.push({ client: client.name, status: `skipped: ${single.error ?? all.error ?? "no rows"}` })
        continue
      }
    }

    try {
      const now = new Date()
      for (const { month, rows } of toSave) {
        // Wipe existing records for this client + month, then re-insert (idempotent)
        await db.delete(keywordRankings).where(
          and(eq(keywordRankings.clientId, client.id), eq(keywordRankings.month, month))
        )
        await db.insert(keywordRankings).values(
          rows.map(r => ({
            clientId: client.id,
            keyword: r.keyword,
            position: r.position,
            month,
            recordedAt: now,
          }))
        )
      }
      results.push({ client: client.name, status: "ok", months: toSave.map(m => m.month) })
    } catch (e) {
      results.push({ client: client.name, status: `db error: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  })
}
