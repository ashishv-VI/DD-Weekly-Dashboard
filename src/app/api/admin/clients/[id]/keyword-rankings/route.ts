export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { keywordRankings, clients } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// ─── GET — list all months with their keyword counts ─────────────────────────

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Verify client exists
  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id)).limit(1)
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const rows = await db
    .select()
    .from(keywordRankings)
    .where(eq(keywordRankings.clientId, id))
    .orderBy(keywordRankings.month, keywordRankings.keyword)

  // Group by month so admin can see what months have data
  const byMonth: Record<string, typeof rows> = {}
  for (const row of rows) {
    if (!byMonth[row.month]) byMonth[row.month] = []
    byMonth[row.month].push(row)
  }

  const months = Object.keys(byMonth)
    .sort((a, b) => b.localeCompare(a))
    .map(month => ({ month, count: byMonth[month].length, rows: byMonth[month] }))

  return NextResponse.json({ months })
}

// ─── POST — upsert rankings for a specific month ──────────────────────────────
// Body: { month: "2026-09", rankings: [{ keyword, position }] }
// position can be null (keyword not ranking)

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, id)).limit(1)
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const body = await req.json()
  const { month, rankings } = body as { month: string; rankings: { keyword: string; position: number | null }[] }

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 })
  }
  if (!Array.isArray(rankings) || rankings.length === 0) {
    return NextResponse.json({ error: "rankings must be a non-empty array" }, { status: 400 })
  }

  // Delete existing rows for this client + month, then re-insert
  await db.delete(keywordRankings).where(
    and(eq(keywordRankings.clientId, id), eq(keywordRankings.month, month))
  )

  const now = new Date()
  const rows = rankings
    .filter(r => r.keyword && r.keyword.trim())
    .map(r => ({
      clientId: id,
      keyword: r.keyword.trim(),
      position: r.position ?? null,
      month,
      recordedAt: now,
    }))

  if (rows.length > 0) {
    await db.insert(keywordRankings).values(rows)
  }

  return NextResponse.json({ saved: rows.length, month })
}

// ─── DELETE — remove all rankings for a specific month ────────────────────────
// Query param: ?month=2026-09

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month")

  if (!month) return NextResponse.json({ error: "month query param required" }, { status: 400 })

  await db.delete(keywordRankings).where(
    and(eq(keywordRankings.clientId, id), eq(keywordRankings.month, month))
  )

  return NextResponse.json({ deleted: true, month })
}
