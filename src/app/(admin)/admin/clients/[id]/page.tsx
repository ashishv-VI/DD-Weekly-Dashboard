"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState({ name: "", domain: "", username: "", pin: "", ga4PropertyId: "", gscSiteUrl: "", notes: "", status: "" })

  useEffect(() => {
    fetch(`/api/admin/clients/${id}`).then(r => r.json()).then(d => {
      setClient(d)
      setForm({ name: d.name || "", domain: d.domain || "", username: d.username || "", pin: "",
        ga4PropertyId: d.ga4PropertyId || "", gscSiteUrl: d.gscSiteUrl || "", notes: d.notes || "", status: d.status || "active" })
      setLoading(false)
    })
  }, [id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(""); setSuccess("")
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSuccess("Saved successfully!")
    } catch (e) { setError(e instanceof Error ? e.message : "Error") }
    finally { setSaving(false) }
  }

  const handleUnlock = async () => {
    await fetch(`/api/admin/clients/${id}/unlock`, { method: "POST" })
    setForm(f => ({ ...f, status: "active" }))
    setSuccess("Account unlocked!")
  }

  const handleDelete = async () => {
    if (!confirm("Delete this client? This cannot be undone.")) return
    await fetch(`/api/admin/clients/${id}`, { method: "DELETE" })
    router.push("/admin/clients")
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => router.push("/admin/clients")} className="text-gray-400 hover:text-gray-600 text-sm">← Clients</button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-600">{client?.name}</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{client?.name}</h1>

      {form.status === "locked" && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-red-700 text-sm font-medium">🔒 Account is locked</span>
          <button onClick={handleUnlock} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700">Unlock</button>
        </div>
      )}

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{success}</div>}

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New PIN (leave blank to keep)</label>
            <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Enter new PIN to change"
              value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GA4 Property ID</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="123456789" value={form.ga4PropertyId} onChange={e => setForm({...form, ga4PropertyId: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GSC Site URL</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="https://www.example.com/" value={form.gscSiteUrl} onChange={e => setForm({...form, gscSiteUrl: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="locked">Locked</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>
        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={handleDelete} className="text-red-500 hover:text-red-700 text-sm">Delete Client</button>
        </div>
      </form>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Client Login Credentials</h3>
        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
          <div className="flex gap-2"><span className="text-gray-500 w-24">Dashboard:</span><span className="font-mono text-blue-600">{typeof window !== "undefined" ? window.location.origin : ""}/client/login</span></div>
          <div className="flex gap-2"><span className="text-gray-500 w-24">Username:</span><span className="font-mono">{client?.username}</span></div>
          <div className="flex gap-2"><span className="text-gray-500 w-24">PIN:</span><span className="text-gray-400">Hidden (set above to change)</span></div>
        </div>
      </div>
    </div>
  )
}
