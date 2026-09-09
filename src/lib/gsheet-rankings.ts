/**
 * Shared helper: fetch a Google Sheet and extract keyword + position pairs.
 */

export interface SheetRankingRow {
  keyword: string
  position: number | null
}

export interface MonthData {
  month: string   // "YYYY-MM"
  label: string   // original column name e.g. "Jun'26"
  rows: SheetRankingRow[]
}

interface RankingMapping {
  keyword: string
  currentRank: string
  [key: string]: string
}

// ─── Month name parser ────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04",
  may: "05", jun: "06", jul: "07", aug: "08",
  sep: "09", sept: "09", oct: "10", nov: "11", dec: "12",
  january: "01", february: "02", march: "03", april: "04",
  june: "06", july: "07", august: "08", september: "09",
  october: "10", november: "11", december: "12",
}

/**
 * Try to parse a column header as a month, e.g.:
 *   "Jun'26" → "2026-06"
 *   "Jul 26" → "2026-07"
 *   "Aug-26" → "2026-08"
 *   "Sept'26" → "2026-09"
 *   "June 2026" → "2026-06"
 *   "2026-09" → "2026-09"
 * Returns null if not a recognizable month column.
 */
export function parseMonthColumn(col: string): string | null {
  const clean = col.trim()

  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(clean)) return clean

  const lower = clean.toLowerCase()

  // "Jun'26" / "Jul 26" / "Aug-26" / "Sept'26"
  const short = lower.match(/^([a-z]{3,9})['\s\-_](\d{2})$/)
  if (short) {
    const mo = MONTH_MAP[short[1]]
    if (mo) return `20${short[2]}-${mo}`
  }

  // "June 2026" / "Jun 2026"
  const long = lower.match(/^([a-z]{3,9})\s+(\d{4})$/)
  if (long) {
    const mo = MONTH_MAP[long[1]]
    if (mo) return `${long[2]}-${mo}`
  }

  // "2026 Jun" / "2026 June"
  const reverse = lower.match(/^(\d{4})\s+([a-z]{3,9})$/)
  if (reverse) {
    const mo = MONTH_MAP[reverse[2]]
    if (mo) return `${reverse[1]}-${mo}`
  }

  return null
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

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

// ─── Fetch raw sheet ──────────────────────────────────────────────────────────

async function fetchSheetCSV(gsheetUrl: string, gsheetTab: string): Promise<{ allRows: string[][]; error?: string }> {
  const match = gsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return { allRows: [], error: "Invalid Google Sheets URL" }

  const sheetId = match[1]
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(gsheetTab || "Sheet1")}`

  try {
    const res = await fetch(csvUrl, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } })
    if (!res.ok) return { allRows: [], error: `HTTP ${res.status}` }
    const text = await res.text()
    if (text.includes("google-visualization-errors"))
      return { allRows: [], error: "Sheet not found or not public. Enable 'Anyone with link can view'." }
    const allRows = parseCSV(text)
    if (!allRows.length) return { allRows: [], error: "Sheet is empty" }
    return { allRows }
  } catch (e) {
    return { allRows: [], error: e instanceof Error ? e.message : "Unknown error" }
  }
}

// ─── Single month fetch (existing behaviour) ─────────────────────────────────

export async function fetchSheetRankings(
  gsheetUrl: string,
  gsheetTab: string,
  mapping: RankingMapping,
): Promise<{ rows: SheetRankingRow[]; error?: string }> {
  const { allRows, error } = await fetchSheetCSV(gsheetUrl, gsheetTab)
  if (error) return { rows: [], error }

  const headers = allRows[0].map(h => h.trim())
  const ki = headers.indexOf(mapping.keyword)
  const ri = headers.indexOf(mapping.currentRank)

  if (ki < 0) return { rows: [], error: `Keyword column "${mapping.keyword}" not found in sheet` }
  if (ri < 0) return { rows: [], error: `Position column "${mapping.currentRank}" not found in sheet` }

  const rows: SheetRankingRow[] = allRows.slice(1)
    .map(row => ({
      keyword: (row[ki] ?? "").trim(),
      position: (() => { const v = (row[ri] ?? "").trim(); return v && v !== "—" && v !== "-" ? (parseInt(v, 10) || null) : null })(),
    }))
    .filter(r => r.keyword)

  return { rows }
}

// ─── All months fetch (NEW) ───────────────────────────────────────────────────

/**
 * Read every month column from the sheet and return data for all of them.
 * keywordCol = the column name mapped as "keyword" (e.g. "Keyword").
 */
export async function fetchAllMonthRankings(
  gsheetUrl: string,
  gsheetTab: string,
  keywordCol: string,
): Promise<{ months: MonthData[]; error?: string }> {
  const { allRows, error } = await fetchSheetCSV(gsheetUrl, gsheetTab)
  if (error) return { months: [], error }

  const headers = allRows[0].map(h => h.trim())
  const ki = headers.indexOf(keywordCol)
  if (ki < 0) return { months: [], error: `Keyword column "${keywordCol}" not found in sheet` }

  // Find all columns that look like a month
  const monthCols: { index: number; label: string; month: string }[] = []
  headers.forEach((h, i) => {
    if (i === ki) return
    const parsed = parseMonthColumn(h)
    if (parsed) monthCols.push({ index: i, label: h, month: parsed })
  })

  if (monthCols.length === 0)
    return { months: [], error: "No month columns found. Column headers should look like Jun'26, Jul'26, Aug'26 etc." }

  const dataRows = allRows.slice(1)

  const months: MonthData[] = monthCols.map(col => {
    const rows: SheetRankingRow[] = dataRows
      .map(row => {
        const keyword = (row[ki] ?? "").trim()
        const rawPos = (row[col.index] ?? "").trim()
        const position = rawPos && rawPos !== "—" && rawPos !== "-" ? (parseInt(rawPos, 10) || null) : null
        return { keyword, position }
      })
      .filter(r => r.keyword)
    return { month: col.month, label: col.label, rows }
  })

  return { months }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
