"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "", domain: "", username: "", pin: "",
    ga4PropertyId: "", gscSiteUrl: "", notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Failed to create client")
      }
      router.push("/admin/clients")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Client</h1>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Redwood Interiors" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain *</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="redwoodinteriors.in" value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="redwood" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN *</label>
            <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min 4 digits" value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GA4 Property ID</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123456789" value={form.ga4PropertyId} onChange={e => setForm({...form, ga4PropertyId: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GSC Site URL</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://www.redwoodinteriors.in/" value={form.gscSiteUrl} onChange={e => setForm({...form, gscSiteUrl: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2} placeholder="Internal notes..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Creating..." : "Create Client"}
          </button>
          <button type="button" onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-sm px-4 py-2">Cancel</button>
        </div>
      </form>
    </div>
  )
}
