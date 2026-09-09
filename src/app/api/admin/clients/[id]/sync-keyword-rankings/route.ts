export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { clients, keywordRankings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import {
  fetchSheetRankings,
  fetchAllMonthRankings,
  extractGsheetConfig,
  currentMonth,
} from "@/lib/gsheet-rankings"

/**
 * POST /api/admin/clients/[id]/sync-keyword-rankings
 *
 * Body options:
 *   { month: "YYYY-MM" }          → sync single month (uses currentRank column)
 *   { syncAll: true }             → detect ALL month columns, sync every one
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [client] = await db
    .select({ id: clients.id, name: clients.name, notes: clients.notes })
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1)

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const cfg = extractGsheetConfig(client.notes)
  if (!cfg) {
    return NextResponse.json({
      error: "No Google Sheets ranking config found. Set it up in Integrations → Keyword Rankings first.",
    }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))

  // ── Sync All Months ────────────────────────────────────────────────────────
  if (body.syncAll) {
    const { months, error } = await fetchAllMonthRankings(
      cfg.gsheetUrl,
      cfg.gsheetTab,
      cfg.mapping.keyword,
    )

    if (error) return NextResponse.json({ error }, { status: 400 })
    if (!months.length) return NextResponse.json({ error: "No month columns detected in sheet" }, { status: 400 })

    const now = new Date()
    const results: { month: string; label: string; saved: number }[] = []

    for (const { month, label, rows } of months) {
      if (!rows.length) continue
      // Delete existing rows for this client + month, then re-insert (idempotent)
      await db.delete(keywordRankings).where(
        and(eq(keywordRankings.clientId, id), eq(keywordRankings.month, month))
      )
      await db.insert(keywordRankings).values(
        rows.map(r => ({
          clientId: id,
          keyword: r.keyword,
          position: r.position,
          month,
          recordedAt: now,
        }))
      )
      results.push({ month, label, saved: rows.length })
    }

    return NextResponse.json({
      success: true,
      syncAll: true,
      monthsSynced: results.length,
      results,
    })
  }

  // ── Single Month Sync ──────────────────────────────────────────────────────
  const month =
    body.month && /^\d{4}-\d{2}$/.test(body.month) ? body.month : currentMonth()

  const { rows, error } = await fetchSheetRankings(cfg.gsheetUrl, cfg.gsheetTab, cfg.mapping)

  if (error) return NextResponse.json({ error }, { status: 400 })
  if (!rows.length) return NextResponse.json({ error: "Sheet returned no keyword rows" }, { status: 400 })

  await db.delete(keywordRankings).where(
    and(eq(keywordRankings.clientId, id), eq(keywordRankings.month, month))
  )

  const now = new Date()
  await db.insert(keywordRankings).values(
    rows.map(r => ({
      clientId: id,
      keyword: r.keyword,
      position: r.position,
      month,
      recordedAt: now,
    }))
  )

  return NextResponse.json({
    success: true,
    month,
    saved: rows.length,
    sheetUrl: cfg.gsheetUrl,
  })
}
