"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const INDUSTRIES = ["Technology", "E-commerce", "Healthcare", "Finance", "Real Estate", "Education", "Travel", "Manufacturing", "Legal", "Retail", "Other"]

function serializeNotes(industry: string, country: string, assignedTo: string, notes: string): string {
  return JSON.stringify({ _v: 1, industry, country, assignedTo, notes })
}

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "", domain: "", username: "", pin: "",
    ga4PropertyId: "", gscSiteUrl: "",
    industry: "", country: "", assignedTo: "", notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, domain: form.domain, username: form.username, pin: form.pin,
          ga4PropertyId: form.ga4PropertyId, gscSiteUrl: form.gscSiteUrl,
          notes: serializeNotes(form.industry, form.country, form.assignedTo, form.notes),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create client")
      router.push("/admin")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">Dashboard</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">Add Client</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Client</h1>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client Name *</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Damco Digital" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Domain *</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. damcodigital.com" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} required />
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
        </div>

        {/* Login */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Login Credentials</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Username *</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. damco" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">PIN *</label>
              <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min 4 digits" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} required />
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Google Integrations <span className="text-gray-400 font-normal">(optional, can add later)</span></h2>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 p-1.5">
              <svg viewBox="26 -29 130 60" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <linearGradient id="ga4-n" gradientUnits="userSpaceOnUse" x1="56" y1="24" x2="99" y2="24">
                  <stop offset="0" stopColor="#e96f0b"/><stop offset="1" stopColor="#f37901"/>
                </linearGradient>
                <rect x="30" y="-23" width="16" height="52" rx="8" fill="#f9ab00"/>
                <rect x="54" y="-4" width="16" height="33" rx="8" fill="url(#ga4-n)"/>
                <circle cx="42" cy="22" r="8" fill="#e37400"/>
              </svg>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">GA4 Property ID</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 390504767" value={form.ga4PropertyId} onChange={e => setForm({ ...form, ga4PropertyId: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 p-1">
              <svg viewBox="0 0 296 264" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <path d="M272 264H24a24 24 0 01-24-24V83L41 42h214L296 83v157a24 24 0 01-24 24z" fill="#e6e7e8"/>
                <path d="M0 127V83L41 42h214L296 83v44z" fill="#d0d1d2"/>
                <rect x="34" y="84" width="228" height="180" rx="10" fill="#458cf5"/>
                <rect x="34" y="127" width="228" height="137" fill="#fff"/>
                <rect x="49" y="143" width="76" height="85" fill="#d2d3d4"/>
                <path d="M213 232v32h-42v-31a49.5 49.5 0 01-1-90V190l21 13 22-13v-47a49.5 49.5 0 010 89z" fill="#505050"/>
                <circle cx="57" cy="103" r="8.5" fill="#e6e7e8"/>
                <circle cx="82" cy="103" r="8.5" fill="#e6e7e8"/>
              </svg>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">GSC Site URL</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. https://damcodigital.com/" value={form.gscSiteUrl} onChange={e => setForm({ ...form, gscSiteUrl: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Internal Notes</label>
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2} placeholder="Internal notes about this client..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? "Creating..." : "Create Client"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 text-sm px-4 py-2.5">Cancel</button>
        </div>
      </form>
    </div>
  )
}
