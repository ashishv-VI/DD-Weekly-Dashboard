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

function parseNotes(raw: string | null): { industry: string; country: string; assignedTo: string; notes: string; logoUrl: string; themeColor: string; textOnTheme: string } {
  if (!raw) return { industry: "", country: "", assignedTo: "", notes: "", logoUrl: "", themeColor: "", textOnTheme: "" }
  try {
    const p = JSON.parse(raw)
    if (p && p._v === 1) return { industry: p.industry || "", country: p.country || "", assignedTo: p.assignedTo || "", notes: p.notes || "", logoUrl: p.logoUrl || "", themeColor: p.themeColor || "", textOnTheme: p.textOnTheme || "" }
  } catch {}
  return { industry: "", country: "", assignedTo: "", notes: raw, logoUrl: "", themeColor: "", textOnTheme: "" }
}

function serializeNotes(industry: string, country: string, assignedTo: string, notes: string, logoUrl: string, themeColor: string, textOnTheme: string): string {
  return JSON.stringify({ _v: 1, industry, country, assignedTo, notes, logoUrl, themeColor, textOnTheme })
}

const INDUSTRIES = ["Technology", "E-commerce", "Healthcare", "Finance", "Real Estate", "Education", "Travel", "Manufacturing", "Legal", "Retail", "Other"]

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
  })

  useEffect(() => {
    fetch(`/api/admin/clients/${id}`).then(r => r.json()).then(d => {
      setClient(d)
      const meta = parseNotes(d.notes)
      setForm({
        name: d.name || "", domain: d.domain || "", username: d.username || "", pin: "",
        ga4PropertyId: d.ga4PropertyId || "", gscSiteUrl: d.gscSiteUrl || "", status: d.status || "active",
        industry: meta.industry, country: meta.country, assignedTo: meta.assignedTo, notes: meta.notes, logoUrl: meta.logoUrl, themeColor: meta.themeColor, textOnTheme: meta.textOnTheme,
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
        notes: serializeNotes(form.industry, form.country, form.assignedTo, form.notes, form.logoUrl, form.themeColor, form.textOnTheme),
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
