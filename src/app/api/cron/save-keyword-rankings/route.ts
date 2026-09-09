export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { clients, keywordRankings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { fetchSheetRankings, extractGsheetConfig, currentMonth } from "@/lib/gsheet-rankings"

/**
 * Cron: runs on the 1st of every month at 06:00 UTC.
 * For each active client that has a Google Sheets ranking config:
 *   1. Fetch the sheet
 *   2. Save current month keyword positions to keyword_rankings table
 */
export async function GET(req: Request) {
  // Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const month = currentMonth()
  const allClients = await db.select({ id: clients.id, name: clients.name, notes: clients.notes })
    .from(clients)
    .where(eq(clients.status, "active"))

  const results: { client: string; status: string; saved?: number }[] = []

  for (const client of allClients) {
    const cfg = extractGsheetConfig(client.notes)
    if (!cfg) continue // no gsheet config — skip

    const { rows, error } = await fetchSheetRankings(cfg.gsheetUrl, cfg.gsheetTab, cfg.mapping)

    if (error || rows.length === 0) {
      results.push({ client: client.name, status: `skipped: ${error ?? "no rows"}` })
      continue
    }

    try {
      // Wipe existing records for this client + month, then re-insert (idempotent)
      await db.delete(keywordRankings).where(
        and(eq(keywordRankings.clientId, client.id), eq(keywordRankings.month, month))
      )

      const now = new Date()
      await db.insert(keywordRankings).values(
        rows.map(r => ({
          clientId: client.id,
          keyword: r.keyword,
          position: r.position,
          month,
          recordedAt: now,
        }))
      )

      results.push({ client: client.name, status: "ok", saved: rows.length })
    } catch (e) {
      results.push({ client: client.name, status: `db error: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  return NextResponse.json({
    month,
    processed: results.length,
    results,
  })
}
