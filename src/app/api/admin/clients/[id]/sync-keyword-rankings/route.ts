export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { clients, keywordRankings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { fetchSheetRankings, extractGsheetConfig, currentMonth } from "@/lib/gsheet-rankings"

/**
 * POST /api/admin/clients/[id]/sync-keyword-rankings
 * Manually trigger a Google Sheets sync for a single client.
 * Optional body: { month: "YYYY-MM" } — defaults to current month.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [client] = await db.select({ id: clients.id, name: clients.name, notes: clients.notes })
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

  let month: string
  try {
    const body = await req.json().catch(() => ({}))
    month = (body.month && /^\d{4}-\d{2}$/.test(body.month)) ? body.month : currentMonth()
  } catch {
    month = currentMonth()
  }

  const { rows, error } = await fetchSheetRankings(cfg.gsheetUrl, cfg.gsheetTab, cfg.mapping)

  if (error) return NextResponse.json({ error }, { status: 400 })
  if (rows.length === 0) return NextResponse.json({ error: "Sheet returned no keyword rows" }, { status: 400 })

  // Wipe + re-insert (idempotent)
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
