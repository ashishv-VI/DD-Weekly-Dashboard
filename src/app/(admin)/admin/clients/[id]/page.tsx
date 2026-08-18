"use client"
import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

type Tab = "profile" | "integrations" | "access" | "danger"

function extractDominantColor(ctx: CanvasRenderingContext2D, w: number, h: number): string {
  const data = ctx.getImageData(0, 0, w, h).data
  const freq: Record<string, number> = {}
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a < 128) continue
    const sum = r + g + b
    if (sum > 700 || sum < 60) continue
    const max = Math.max(r, g, b)
    const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max
    if (sat < 0.2) continue
    const qr = Math.round(r / 32) * 32, qg = Math.round(g / 32) * 32, qb = Math.round(b / 32) * 32
    const k = `${qr},${qg},${qb}`
    freq[k] = (freq[k] || 0) + 1
  }
  let best = "", bestN = 0
  for (const [k, n] of Object.entries(freq)) { if (n > bestN) { bestN = n; best = k } }
  if (!best) return "#2563eb"
  const [r, g, b] = best.split(",").map(Number)
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")
}

function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.35 ? "#1e293b" : "#ffffff"
}

interface RankingMapping { keyword: string; prevRank: string; currentRank: string; volume: string; url: string; location: string }
interface RankingRow { keyword: string; prevRank: number | null; currentRank: number | null; volume: number | null; url: string; location: string }
interface RankingConfig { type: "excel" | "gsheet"; gsheetUrl: string; gsheetTab: string; mapping: RankingMapping; data: RankingRow[]; rowCount: number; updatedAt: string }
interface BacklinkMonth { month: string; count: number } // month: "2026-07"

function parseNotes(raw: string | null): { industry: string; country: string; assignedTo: string; notes: string; logoUrl: string; themeColor: string; textOnTheme: string; rankingConfig: RankingConfig | null; backlinkMonths: BacklinkMonth[] } {
  if (!raw) return { industry: "", country: "", assignedTo: "", notes: "", logoUrl: "", themeColor: "", textOnTheme: "", rankingConfig: null, backlinkMonths: [] }
  try {
    const p = JSON.parse(raw)
    if (p && p._v === 1) return { industry: p.industry || "", country: p.country || "", assignedTo: p.assignedTo || "", notes: p.notes || "", logoUrl: p.logoUrl || "", themeColor: p.themeColor || "", textOnTheme: p.textOnTheme || "", rankingConfig: p.rankingConfig ?? null, backlinkMonths: Array.isArray(p.backlinkMonths) ? p.backlinkMonths : [] }
  } catch {}
  return { industry: "", country: "", assignedTo: "", notes: raw, logoUrl: "", themeColor: "", textOnTheme: "", rankingConfig: null, backlinkMonths: [] }
}

function serializeNotes(industry: string, country: string, assignedTo: string, notes: string, logoUrl: string, themeColor: string, textOnTheme: string, rankingConfig: RankingConfig | null, backlinkMonths: BacklinkMonth[]): string {
  return JSON.stringify({ _v: 1, industry, country, assignedTo, notes, logoUrl, themeColor, textOnTheme, rankingConfig, backlinkMonths })
}

// ─── Backlinks Card ───────────────────────────────────────────────────────────

function BacklinksCard({ months, onSave }: { months: BacklinkMonth[]; onSave: (months: BacklinkMonth[]) => void }) {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [inputMonth, setInputMonth] = useState(defaultMonth)
  const [inputCount, setInputCount] = useState("")
  const [saved, setSaved] = useState(false)

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-")
    return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  }

  const handleAdd = () => {
    const count = parseInt(inputCount, 10)
    if (!inputMonth || isNaN(count) || count < 0) return
    const existing = months.filter(m => m.month !== inputMonth)
    const newMonths = [{ month: inputMonth, count }, ...existing].sort((a, b) => b.month.localeCompare(a.month))
    onSave(newMonths)
    setInputCount("")
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = (month: string) => onSave(months.filter(m => m.month !== month))

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <span>🔗</span> Backlinks Tracking
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Monthly backlinks created — affects the client&apos;s overall performance score (10% weight)</div>
        </div>
        <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full font-semibold shrink-0">10% weight</span>
      </div>

      <div className="flex gap-2 items-end flex-wrap">
        <div className="min-w-[140px] flex-1">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
          <input type="month" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={inputMonth} onChange={e => setInputMonth(e.target.value)} />
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Backlinks Created</label>
          <input type="number" min="0" placeholder="e.g. 45"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={inputCount} onChange={e => setInputCount(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()} />
        </div>
        <button type="button" onClick={handleAdd}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors whitespace-nowrap">
          {saved ? "✓ Saved" : "Add / Update"}
        </button>
      </div>

      {months.length > 0 && (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">History</div>
          {months.map((m, i) => {
            const prev = months[i + 1]
            const diff = prev ? m.count - prev.count : null
            return (
              <div key={m.month} className={`flex items-center justify-between px-3 py-2.5 text-sm ${i < months.length - 1 ? "border-b border-gray-100" : ""}`}>
                <span className="text-gray-700 font-medium">{monthLabel(m.month)}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-purple-700">{m.count} backlinks</span>
                  {diff !== null && (
                    <span className={`text-xs font-semibold ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {diff >= 0 ? `↑ +${diff}` : `↓ ${diff}`} vs prev
                    </span>
                  )}
                  <button type="button" onClick={() => handleDelete(m.month)} className="text-gray-300 hover:text-red-500 transition-colors text-xs ml-1">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {months.length === 0 && (
        <div className="text-xs text-gray-400 text-center py-2 border border-dashed border-gray-200 rounded-lg">
          No backlink data added yet — add the first month above
        </div>
      )}
    </div>
  )
}

const INDUSTRIES = ["Technology", "E-commerce", "Healthcare", "Finance", "Real Estate", "Education", "Travel", "Manufacturing", "Legal", "Retail", "Other"]

function RankingConfigCard({ config, onSave }: { config: RankingConfig | null; onSave: (cfg: RankingConfig) => void }) {
  const [open, setOpen] = useState(false)
  const [srcType, setSrcType] = useState<"excel" | "gsheet">("excel")
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState("")
  const [gsheetUrl, setGsheetUrl] = useState("")
  const [gsheetTab, setGsheetTab] = useState("Sheet1")
  const [fetching, setFetching] = useState(false)
  const [mapping, setMapping] = useState<RankingMapping>({ keyword: "", prevRank: "", currentRank: "", volume: "", url: "", location: "" })
  const [err, setErr] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const wbRef = useRef<any>(null)

  // Excel stores date-formatted header cells as serial numbers (e.g. 46113 = 01 Apr 2026)
  const isExcelDate = (h: string) => { const n = Number(h); return !isNaN(n) && n > 40000 && n < 60000 }
  const fmtColLabel = (h: string) => {
    if (!isExcelDate(h)) return h
    return new Date(Math.round((Number(h) - 25569) * 86400000)).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
  }

  function autoMap(cols: string[]) {
    const find = (patterns: string[]) => cols.find(c => patterns.some(p => c.toLowerCase().includes(p))) ?? ""
    // Auto-detect date serial columns (e.g. "46113", "46143") — sort ascending so older date = prev
    const dateCols = cols.filter(isExcelDate).sort((a, b) => Number(a) - Number(b))
    setMapping({
      keyword: find(["keyword", "search term", "query", "key word"]),
      prevRank: dateCols[0] || find(["prev", "last", "previous", "old", "before", "feb", "jan", "mar"]),
      currentRank: dateCols[1] || find(["curr", "current", "now", "this", "latest", "new", "apr", "may", "jun"]),
      volume: find(["volume", "vol", "search vol", "searches", "monthly"]),
      url: find(["url", "page", "landing", "link", "slug"]),
      location: find(["location", "country", "region", "city", "market", "geo"]),
    })
  }

  async function loadSheet(wb: any, sheetName: string) {
    const XLSX = await import("xlsx")
    const ws = wb.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" })
    const rows = (data as string[][]).filter(r => r.some(c => String(c).trim()))
    setRawRows(rows)
    const hdrs = (rows[0] ?? []).map(String)
    setHeaders(hdrs)
    autoMap(hdrs)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setErr("")
    try {
      const XLSX = await import("xlsx")
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      wbRef.current = wb
      setSheetNames(wb.SheetNames)
      const sn = wb.SheetNames[0]
      setActiveSheet(sn)
      await loadSheet(wb, sn)
    } catch { setErr("Could not read file. Upload a valid .xlsx, .xls, or .csv file.") }
  }

  async function handleSheetSwitch(sn: string) {
    setActiveSheet(sn)
    if (wbRef.current) await loadSheet(wbRef.current, sn)
  }

  async function handleGsheetFetch() {
    if (!gsheetUrl.trim()) return
    setFetching(true); setErr("")
    try {
      const res = await fetch(`/api/admin/fetch-gsheet?url=${encodeURIComponent(gsheetUrl)}&tab=${encodeURIComponent(gsheetTab)}`)
      const d = await res.json()
      if (!res.ok || d.error) throw new Error(d.error ?? "Failed to fetch")
      setHeaders(d.headers)
      setRawRows([d.headers, ...d.preview])
      autoMap(d.headers)
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not fetch sheet") }
    finally { setFetching(false) }
  }

  function handleSaveConfig() {
    if (!mapping.keyword || !mapping.prevRank || !mapping.currentRank) {
      setErr("Keyword, Previous Rank, and Current Rank are required."); return
    }
    const ci = (col: string) => headers.indexOf(col)
    const ki = ci(mapping.keyword), pi = ci(mapping.prevRank), ri = ci(mapping.currentRank)
    const vi = ci(mapping.volume), ui = ci(mapping.url), li = ci(mapping.location)
    const num = (v: string) => { const n = Number(v); return isNaN(n) ? null : n }
    let data: RankingRow[] = rawRows.slice(1)
      .map(row => ({
        keyword: String(row[ki] ?? "").trim(),
        prevRank: pi >= 0 ? num(String(row[pi] ?? "")) : null,
        currentRank: ri >= 0 ? num(String(row[ri] ?? "")) : null,
        volume: vi >= 0 ? num(String(row[vi] ?? "")) : null,
        url: ui >= 0 ? String(row[ui] ?? "").trim() : "",
        location: li >= 0 ? String(row[li] ?? "").trim() : "",
      }))
      .filter(r => r.keyword)
    if (srcType === "excel" && data.length > 2000) { data = data.slice(0, 2000); setErr("Truncated to 2000 rows max.") }
    onSave({ type: srcType, gsheetUrl: srcType === "gsheet" ? gsheetUrl : "", gsheetTab: srcType === "gsheet" ? gsheetTab : "", mapping, data: srcType === "excel" ? data : [], rowCount: data.length, updatedAt: new Date().toISOString().slice(0, 10) })
    setOpen(false); setHeaders([]); setRawRows([])
  }

  const mappingFields: { key: keyof RankingMapping; label: string; required: boolean }[] = [
    { key: "keyword", label: "Keyword Column", required: true },
    { key: "prevRank", label: "Previous Month Ranking", required: true },
    { key: "currentRank", label: "Current Month Ranking", required: true },
    { key: "volume", label: "Search Volume", required: false },
    { key: "url", label: "Landing URL", required: false },
    { key: "location", label: "Location / Market", required: false },
  ]

  const preview = rawRows.slice(1, 6).map(row => ({
    keyword: headers.indexOf(mapping.keyword) >= 0 ? String(row[headers.indexOf(mapping.keyword)] ?? "—") : "—",
    prev: headers.indexOf(mapping.prevRank) >= 0 ? String(row[headers.indexOf(mapping.prevRank)] ?? "—") : "—",
    curr: headers.indexOf(mapping.currentRank) >= 0 ? String(row[headers.indexOf(mapping.currentRank)] ?? "—") : "—",
    vol: mapping.volume && headers.indexOf(mapping.volume) >= 0 ? String(row[headers.indexOf(mapping.volume)] ?? "—") : null,
  }))
  const canSave = headers.length > 0 && mapping.keyword && mapping.prevRank && mapping.currentRank

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
      <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900">Keyword Rankings</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
            {config ? "Connected" : "Not Connected"}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Import monthly keyword rankings from Excel/CSV or a public Google Sheet. Map columns once — dashboard updates on each import.</p>

        {config && !open && (
          <div className="text-xs text-gray-600 bg-white rounded-lg border border-gray-200 p-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{config.type === "excel" ? "Excel / CSV" : "Google Sheets"}</span>
              <span className="text-gray-300">•</span>
              <span>{config.rowCount} keywords</span>
              <span className="text-gray-300">•</span>
              <span>Updated {config.updatedAt}</span>
            </div>
            {config.type === "gsheet" && <p className="text-gray-400 mt-1 truncate">Sheet: {config.gsheetUrl}</p>}
            <p className="text-gray-400 mt-0.5">Columns: {config.mapping.keyword} → Prev: {fmtColLabel(config.mapping.prevRank)} → Current: {fmtColLabel(config.mapping.currentRank)}</p>
          </div>
        )}

        {!open ? (
          <button type="button" onClick={() => setOpen(true)}
            className="text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            {config ? "Reconfigure" : "Configure Rankings"}
          </button>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            {/* Source type */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Data Source</p>
              <div className="flex gap-2">
                {(["excel", "gsheet"] as const).map(t => (
                  <button key={t} type="button" onClick={() => { setSrcType(t); setHeaders([]); setRawRows([]) }}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${srcType === t ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                    {t === "excel" ? "📄 Excel / CSV" : "🔗 Google Sheets"}
                  </button>
                ))}
              </div>
            </div>

            {/* Excel upload */}
            {srcType === "excel" && (
              <div className="space-y-2">
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  Click to upload .xlsx / .xls / .csv
                </button>
                {sheetNames.length > 1 && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Worksheet / Tab</label>
                    <select value={activeSheet} onChange={e => handleSheetSwitch(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                      {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {rawRows.length > 0 && <p className="text-xs text-emerald-600">✓ {rawRows.length - 1} rows detected · {headers.length} columns</p>}
              </div>
            )}

            {/* Google Sheets */}
            {srcType === "gsheet" && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Google Sheets URL (must be public — "Anyone with link can view")</label>
                  <input type="url" value={gsheetUrl} onChange={e => setGsheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Tab / Sheet Name</label>
                    <input value={gsheetTab} onChange={e => setGsheetTab(e.target.value)} placeholder="Sheet1"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <button type="button" onClick={handleGsheetFetch} disabled={!gsheetUrl.trim() || fetching}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap font-medium">
                    {fetching ? "Fetching…" : "Fetch Columns →"}
                  </button>
                </div>
                {rawRows.length > 0 && <p className="text-xs text-emerald-600">✓ {headers.length} columns detected from sheet</p>}
              </div>
            )}

            {/* Column Mapping */}
            {headers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Map Columns</p>
                <div className="space-y-2">
                  {mappingFields.map(({ key, label, required }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="text-xs text-gray-600 shrink-0 w-44">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
                      <select value={mapping[key]} onChange={e => setMapping(m => ({ ...m, [key]: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">— {required ? "select column" : "skip (optional)"} —</option>
                        {headers.map(h => <option key={h} value={h}>{fmtColLabel(h)}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview table */}
            {preview.length > 0 && canSave && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Preview (first 5 rows)</p>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Keyword</th>
                        <th className="text-center px-3 py-2 text-gray-500 font-medium">Prev</th>
                        <th className="text-center px-3 py-2 text-gray-500 font-medium">Current</th>
                        {mapping.volume && <th className="text-center px-3 py-2 text-gray-500 font-medium">Volume</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="px-3 py-2 text-gray-800 font-medium max-w-[180px] truncate">{row.keyword}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{row.prev}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{row.curr}</td>
                          {mapping.volume && <td className="px-3 py-2 text-center text-gray-400">{row.vol}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {err && <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">{err}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setOpen(false); setHeaders([]); setRawRows([]) }}
                className="text-xs text-gray-500 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleSaveConfig} disabled={!canSave}
                className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
                Save Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Record<string, string> | null>(null)
  const [tab, setTab] = useState<Tab>("profile")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const logoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: "", domain: "", username: "", pin: "",
    ga4PropertyId: "", gscSiteUrl: "", status: "",
    industry: "", country: "", assignedTo: "", notes: "", logoUrl: "", themeColor: "", textOnTheme: "",
    rankingConfig: null as RankingConfig | null,
    backlinkMonths: [] as BacklinkMonth[],
  })

  useEffect(() => {
    fetch(`/api/admin/clients/${id}`).then(r => r.json()).then(d => {
      setClient(d)
      const meta = parseNotes(d.notes)
      setForm({
        name: d.name || "", domain: d.domain || "", username: d.username || "", pin: "",
        ga4PropertyId: d.ga4PropertyId || "", gscSiteUrl: d.gscSiteUrl || "", status: d.status || "active",
        industry: meta.industry, country: meta.country, assignedTo: meta.assignedTo, notes: meta.notes, logoUrl: meta.logoUrl, themeColor: meta.themeColor, textOnTheme: meta.textOnTheme,
        rankingConfig: meta.rankingConfig,
        backlinkMonths: meta.backlinkMonths,
      })
      setLoading(false)
    })
  }, [id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(""); setSuccess("")
    try {
      const body = {
        name: form.name, domain: form.domain, username: form.username, pin: form.pin,
        ga4PropertyId: form.ga4PropertyId, gscSiteUrl: form.gscSiteUrl, status: form.status,
        notes: serializeNotes(form.industry, form.country, form.assignedTo, form.notes, form.logoUrl, form.themeColor, form.textOnTheme, form.rankingConfig, form.backlinkMonths),
      }
      const res = await fetch(`/api/admin/clients/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error)
      setSuccess("Saved successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (e) { setError(e instanceof Error ? e.message : "Error") }
    finally { setSaving(false) }
  }

  const handleUnlock = async () => {
    await fetch(`/api/admin/clients/${id}/unlock`, { method: "POST" })
    setForm(f => ({ ...f, status: "active" }))
    setSuccess("Account unlocked!")
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX = 256
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const themeColor = extractDominantColor(ctx, canvas.width, canvas.height)
        const textOnTheme = getContrastText(themeColor)
        setForm(f => ({ ...f, logoUrl: canvas.toDataURL("image/webp", 0.85), themeColor, textOnTheme }))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${client?.name}"? This cannot be undone.`)) return
    await fetch(`/api/admin/clients/${id}`, { method: "DELETE" })
    router.push("/admin")
  }

  if (loading) return (
    <div className="p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-32"/>
        <div className="h-8 bg-gray-200 rounded w-64"/>
        <div className="h-64 bg-gray-200 rounded-xl"/>
      </div>
    </div>
  )

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { key: "integrations", label: "Integrations", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
    { key: "access", label: "Access & Login", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" },
    { key: "danger", label: "Danger Zone", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  ]

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">Dashboard</Link>
        <span className="text-gray-300">/</span>
        <Link href="/admin/clients" className="text-gray-400 hover:text-gray-600">Clients</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{client?.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative group w-12 h-12 cursor-pointer shrink-0" onClick={() => logoInputRef.current?.click()} title="Click to upload logo">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-200"/>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white text-lg font-bold flex items-center justify-center">
                {client?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload}/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{client?.name}</h1>
            <p className="text-sm text-gray-500">{client?.domain}</p>
            <p className="text-xs text-gray-400 mt-0.5">Click logo to upload</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`/client/login?username=${encodeURIComponent(form.username)}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            Login Preview
          </a>
          {form.status === "locked" && (
            <button onClick={handleUnlock} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
              Unlock
            </button>
          )}
        </div>
      </div>

      {/* Status alert if locked */}
      {form.status === "locked" && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span className="text-red-700">This account is locked due to too many failed login attempts.</span>
        </div>
      )}

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-0.5 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={t.icon}/>
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {/* Profile Tab */}
        {tab === "profile" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Client Profile</h2>

            {/* Logo Upload */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="relative group w-16 h-16 cursor-pointer shrink-0" onClick={() => logoInputRef.current?.click()} title="Upload logo">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm"/>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white text-2xl font-bold flex items-center justify-center">
                    {form.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-700 mb-0.5">Client Logo</div>
                <div className="text-xs text-gray-400 mb-2">PNG, JPG or SVG. Brand color auto-extracted on upload.</div>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => logoInputRef.current?.click()}
                    className="text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                    {form.logoUrl ? "Change Logo" : "Upload Logo"}
                  </button>
                  {form.logoUrl && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, logoUrl: "", themeColor: "", textOnTheme: "" }))}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 transition-colors">
                      Remove
                    </button>
                  )}
                </div>
                {form.themeColor && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md border border-gray-200 shrink-0" style={{ background: form.themeColor }}/>
                    <span className="text-xs font-mono text-gray-500">{form.themeColor}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: form.themeColor, color: form.textOnTheme }}>
                      Dashboard theme
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client Name *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Domain *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Industry</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Country</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. India, UAE, USA" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assigned SEO Executive</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Ashish Verma" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="locked">Locked</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Internal Notes</label>
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3} placeholder="Internal notes about this client..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center justify-end pt-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {tab === "integrations" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Google Integrations</h2>

            <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
              {/* Google Analytics icon */}
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm p-1.5">
                <svg viewBox="26 -29 130 60" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <linearGradient id="ga4-g" gradientUnits="userSpaceOnUse" x1="56" y1="24" x2="99" y2="24">
                    <stop offset="0" stopColor="#e96f0b"/><stop offset="1" stopColor="#f37901"/>
                  </linearGradient>
                  <rect x="30" y="-23" width="16" height="52" rx="8" fill="#f9ab00"/>
                  <rect x="54" y="-4" width="16" height="33" rx="8" fill="url(#ga4-g)"/>
                  <circle cx="42" cy="22" r="8" fill="#e37400"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900">Google Analytics 4</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.ga4PropertyId ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                    {form.ga4PropertyId ? "Connected" : "Not Connected"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Powers: Traffic sources, conversions, engagement time, AI traffic analysis</p>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Property ID</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g. 390504767" value={form.ga4PropertyId} onChange={e => setForm({ ...form, ga4PropertyId: e.target.value })} />
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
              {/* Google Search Console icon */}
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm p-1">
                <svg viewBox="0 0 296 264" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <path d="M272 264H24a24 24 0 01-24-24V83L41 42h214L296 83v157a24 24 0 01-24 24z" fill="#e6e7e8"/>
                  <path d="M0 127V83L41 42h214L296 83v44z" fill="#d0d1d2"/>
                  <rect x="34" y="84" width="228" height="180" rx="10" fill="#458cf5"/>
                  <rect x="34" y="127" width="228" height="137" fill="#fff"/>
                  <rect x="49" y="143" width="76" height="85" fill="#d2d3d4"/>
                  <rect x="49" y="247" width="98" height="17" fill="#d2d3d4"/>
                  <path d="M213 232v32h-42v-31a49.5 49.5 0 01-1-90V190l21 13 22-13v-47a49.5 49.5 0 010 89z" fill="#505050"/>
                  <circle cx="57" cy="103" r="8.5" fill="#e6e7e8"/>
                  <circle cx="82" cy="103" r="8.5" fill="#e6e7e8"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900">Google Search Console</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.gscSiteUrl ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"}`}>
                    {form.gscSiteUrl ? "Connected" : "Not Connected"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Powers: Keywords, impressions, CTR, position, health score calculation</p>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Site URL</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g. https://example.com/" value={form.gscSiteUrl} onChange={e => setForm({ ...form, gscSiteUrl: e.target.value })} />
              </div>
            </div>

            <RankingConfigCard config={form.rankingConfig} onSave={(cfg) => setForm(f => ({ ...f, rankingConfig: cfg }))} />

            <BacklinksCard months={form.backlinkMonths} onSave={(months) => setForm(f => ({ ...f, backlinkMonths: months }))} />

            <div className="flex items-center justify-end pt-2">
              <button type="submit" disabled={saving}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? "Saving..." : "Save Integrations"}
              </button>
            </div>
          </div>
        )}

        {/* Access Tab */}
        {tab === "access" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 text-sm mb-4">Login Credentials</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Username *</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">New PIN <span className="text-gray-400 font-normal">(leave blank to keep)</span></label>
                  <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new PIN to change" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-end pt-2">
                <button type="submit" disabled={saving}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Update Credentials"}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Client Login Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2 items-center">
                  <span className="text-gray-500 w-24 shrink-0 text-xs">Dashboard URL</span>
                  <span className="font-mono text-blue-600 text-xs break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/client/login
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-gray-500 w-24 shrink-0 text-xs">Username</span>
                  <span className="font-mono text-gray-800 text-xs">{form.username}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-gray-500 w-24 shrink-0 text-xs">PIN</span>
                  <span className="text-gray-400 text-xs">Hidden (set above to change)</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <a href={`/client/login?username=${encodeURIComponent(form.username)}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline">Open login page →</a>
                <button type="button" onClick={() => {
                  const url = `${window.location.origin}/client/login?username=${encodeURIComponent(form.username)}`
                  navigator.clipboard.writeText(url)
                }} className="text-xs text-gray-500 hover:text-gray-700 hover:underline">Copy URL</button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Danger Zone (no form wrapping needed) */}
      {tab === "danger" && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
          <h2 className="font-semibold text-red-600 text-sm mb-4">Danger Zone</h2>
          <div className="space-y-4">
            {form.status === "locked" && (
              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Unlock Account</p>
                  <p className="text-xs text-gray-500">Remove the login lock caused by failed PIN attempts</p>
                </div>
                <button onClick={handleUnlock}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                  Unlock
                </button>
              </div>
            )}
            <div className="flex items-center justify-between p-4 border border-red-100 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-red-700">Delete Client</p>
                <p className="text-xs text-red-500">Permanently remove this client and all their data. Cannot be undone.</p>
              </div>
              <button onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
