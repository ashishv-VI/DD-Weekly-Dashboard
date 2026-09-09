/**
 * Shared helper: fetch a Google Sheet and extract keyword + position pairs
 * using the column mapping stored in rankingConfig.
 */

export interface SheetRankingRow {
  keyword: string
  position: number | null
}

interface RankingMapping {
  keyword: string
  currentRank: string
  [key: string]: string
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const row: string[] = []
    let cur = "", inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (ch === ',' && !inQ) {
        row.push(cur.trim()); cur = ""
      } else cur += ch
    }
    row.push(cur.trim())
    rows.push(row)
  }
  return rows
}

export async function fetchSheetRankings(
  gsheetUrl: string,
  gsheetTab: string,
  mapping: RankingMapping,
): Promise<{ rows: SheetRankingRow[]; error?: string }> {
  const match = gsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return { rows: [], error: "Invalid Google Sheets URL" }

  const sheetId = match[1]
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(gsheetTab || "Sheet1")}`

  try {
    const res = await fetch(csvUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    })
    if (!res.ok) return { rows: [], error: `HTTP ${res.status}` }

    const text = await res.text()
    if (text.includes("google-visualization-errors"))
      return { rows: [], error: "Sheet not found or not public (Anyone with link must be enabled)" }

    const allRows = parseCSV(text)
    if (!allRows.length) return { rows: [], error: "Sheet is empty" }

    const headers = allRows[0].map(h => h.trim())
    const ki = headers.indexOf(mapping.keyword)
    const ri = headers.indexOf(mapping.currentRank)

    if (ki < 0) return { rows: [], error: `Keyword column "${mapping.keyword}" not found in sheet` }
    if (ri < 0) return { rows: [], error: `Position column "${mapping.currentRank}" not found in sheet` }

    const rows: SheetRankingRow[] = allRows.slice(1)
      .map(row => {
        const keyword = (row[ki] ?? "").trim()
        const rawPos = (row[ri] ?? "").trim()
        const position = rawPos ? (parseInt(rawPos, 10) || null) : null
        return { keyword, position }
      })
      .filter(r => r.keyword)

    return { rows }
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : "Unknown error" }
  }
}

/** Parse the client.notes JSON and return rankingConfig if it's a gsheet config */
export function extractGsheetConfig(notes: string | null): {
  gsheetUrl: string
  gsheetTab: string
  mapping: RankingMapping
} | null {
  if (!notes) return null
  try {
    const p = JSON.parse(notes)
    if (p?._v === 1 && p.rankingConfig?.type === "gsheet" && p.rankingConfig.gsheetUrl) {
      return {
        gsheetUrl: p.rankingConfig.gsheetUrl,
        gsheetTab: p.rankingConfig.gsheetTab ?? "Sheet1",
        mapping: p.rankingConfig.mapping,
      }
    }
  } catch {}
  return null
}

/** Return current month as "YYYY-MM" */
export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}
