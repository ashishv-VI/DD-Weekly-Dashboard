export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { builtInGsheetConfig, fetchAllMonthRankings, sheetCsvUrl } from "@/lib/gsheet-rankings"

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = "", inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQ && text[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === ',' && !inQ) {
      row.push(cur.trim()); cur = ""
    } else if (!inQ && (ch === '\n' || (ch === '\r' && text[i + 1] === '\n'))) {
      if (ch === '\r') i++
      row.push(cur.trim())
      if (row.some(c => c.length > 0)) rows.push(row)
      row = []; cur = ""
    } else {
      cur += ch
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur.trim()); if (row.some(c => c.length > 0)) rows.push(row) }
  return rows
}

interface RankingMapping { keyword: string; prevRank: string; currentRank: string; volume: string; url: string; location: string }
interface RankingRow { keyword: string; prevRank: number | null; currentRank: number | null; volume: number | null; url: string; location: string }
interface RankingConfig { type: "excel" | "gsheet"; gsheetUrl: string; gsheetTab: string; mapping: RankingMapping; data: RankingRow[]; rowCount: number; updatedAt: string }

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const payload = await verifyClientToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  const [client] = await db.select({ notes: clients.notes, slug: clients.slug }).from(clients).where(eq(clients.id, payload.sub)).limit(1)
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let rankingConfig: RankingConfig | null = null
  try { if (client.notes) { const p = JSON.parse(client.notes); if (p?._v === 1) rankingConfig = p.rankingConfig ?? null } } catch {}

  const noCache = { headers: { "Cache-Control": "private, no-store" } }

  // Built-in sheet (wired in code for this client) — used unless a Google Sheet is set up in admin.
  // Compares the two latest month columns that have rankings.
  const builtIn = rankingConfig?.type === "gsheet" ? null : builtInGsheetConfig(client.slug)
  if (builtIn) {
    const { months, error } = await fetchAllMonthRankings(builtIn.gsheetUrl, builtIn.gsheetTab, builtIn.mapping.keyword)
    const filled = months.filter(m => m.rows.some(r => r.position !== null)).sort((a, b) => a.month.localeCompare(b.month))
    const curr = filled[filled.length - 1], prev = filled[filled.length - 2]
    if (!curr) return NextResponse.json({ data: [], config: null, error: error ?? "No ranking data in sheet" }, noCache)
    const prevPos = new Map(prev?.rows.map(r => [r.keyword, r.position]) ?? [])
    const data: RankingRow[] = curr.rows.map(r => ({
      keyword: r.keyword, prevRank: prevPos.get(r.keyword) ?? null, currentRank: r.position, volume: null, url: "", location: "",
    }))
    const mapping: RankingMapping = { keyword: builtIn.mapping.keyword, prevRank: prev?.label ?? "", currentRank: curr.label, volume: "", url: "", location: "" }
    return NextResponse.json({ data, config: { type: "gsheet", gsheetUrl: builtIn.gsheetUrl, gsheetTab: builtIn.gsheetTab, mapping, data: [], rowCount: data.length, updatedAt: "" } satisfies RankingConfig }, noCache)
  }

  if (!rankingConfig) return NextResponse.json({ data: [], config: null }, noCache)

  if (rankingConfig.type === "excel") {
    return NextResponse.json({ data: rankingConfig.data ?? [], config: rankingConfig }, noCache)
  }

  // Google Sheets — fetch live
  if (rankingConfig.type === "gsheet" && rankingConfig.gsheetUrl) {
    const csvUrl = sheetCsvUrl(rankingConfig.gsheetUrl, rankingConfig.gsheetTab)
    if (!csvUrl) return NextResponse.json({ data: [], config: rankingConfig, error: "Invalid sheet URL" })
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 10000)
      const res = await fetch(csvUrl, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } })
      clearTimeout(timer)
      if (!res.ok) throw new Error("Sheet not accessible")
      const text = await res.text()
      const rows = parseCSV(text)
      const headers = rows[0] ?? []
      const m = rankingConfig.mapping
      const ci = (col: string) => headers.indexOf(col)
      const ki = ci(m.keyword), pi = ci(m.prevRank), ri = ci(m.currentRank)
      const vi = ci(m.volume), ui = ci(m.url), li = ci(m.location)
      const num = (v: string) => { const n = Number(v); return isNaN(n) ? null : n }
      if (ki < 0) return NextResponse.json({ data: [], config: rankingConfig, error: "Keyword column not found — check column mapping" }, { headers: { "Cache-Control": "private, no-store" } })
      const data: RankingRow[] = rows.slice(1).map(row => ({
        keyword: ki >= 0 ? String(row[ki] ?? "").trim() : "",
        prevRank: pi >= 0 ? num(String(row[pi] ?? "")) : null,
        currentRank: ri >= 0 ? num(String(row[ri] ?? "")) : null,
        volume: vi >= 0 ? num(String(row[vi] ?? "")) : null,
        url: ui >= 0 ? String(row[ui] ?? "").trim() : "",
        location: li >= 0 ? String(row[li] ?? "").trim() : "",
      })).filter(r => r.keyword)
      return NextResponse.json({ data, config: rankingConfig }, noCache)
    } catch (e) {
      return NextResponse.json({ data: [], config: rankingConfig, error: "Could not fetch sheet" }, noCache)
    }
  }

  return NextResponse.json({ data: [], config: rankingConfig }, noCache)
}
