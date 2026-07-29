export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const row: string[] = []
    let cur = "", inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else inQ = !inQ }
      else if (ch === ',' && !inQ) { row.push(cur.trim()); cur = "" }
      else cur += ch
    }
    row.push(cur.trim())
    rows.push(row)
  }
  return rows
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const url = searchParams.get("url") ?? ""
  const tab = searchParams.get("tab") ?? "Sheet1"

  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return NextResponse.json({ error: "Invalid Google Sheets URL" }, { status: 400 })

  const sheetId = match[1]
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`

  try {
    const res = await fetch(csvUrl, { headers: { "User-Agent": "Mozilla/5.0" } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    if (text.includes("google-visualization-errors")) throw new Error("Sheet not found or not public")
    const rows = parseCSV(text)
    if (!rows.length) return NextResponse.json({ error: "Sheet is empty" }, { status: 400 })
    return NextResponse.json({ headers: rows[0], preview: rows.slice(1, 6), rowCount: rows.length - 1 })
  } catch (e) {
    return NextResponse.json({ error: `Could not fetch sheet: ${e instanceof Error ? e.message : "unknown error"}. Make sure the sheet is public (Anyone with link can view).` }, { status: 400 })
  }
}
