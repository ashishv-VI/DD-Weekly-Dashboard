import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import Link from "next/link"

function parseNotesMeta(notes: string | null) {
  if (!notes) return { industry: "", country: "" }
  try {
    const p = JSON.parse(notes)
    if (p && p._v === 1) return { industry: p.industry || "", country: p.country || "" }
  } catch {}
  return { industry: "", country: "" }
}

export default async function ClientsPage() {
  const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-400 mt-0.5">{allClients.length} total clients</p>
        </div>
        <Link href="/admin/clients/new"
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Add Client
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide border-b border-gray-100">
              <th className="text-left px-5 py-3">Client</th>
              <th className="text-left px-5 py-3">Domain</th>
              <th className="text-left px-5 py-3">Username</th>
              <th className="text-left px-5 py-3">Industry</th>
              <th className="text-center px-4 py-3">GA4</th>
              <th className="text-center px-4 py-3">GSC</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allClients.map(c => {
              const meta = parseNotesMeta(c.notes)
              return (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                        {meta.country && <div className="text-xs text-gray-400">{meta.country}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{c.domain}</td>
                  <td className="px-5 py-3.5 text-sm font-mono text-gray-600">{c.username}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{meta.industry || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${c.ga4PropertyId ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                      {c.ga4PropertyId ? "✓" : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${c.gscSiteUrl ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                      {c.gscSiteUrl ? "✓" : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      c.status === "active" ? "bg-green-100 text-green-700" :
                      c.status === "locked" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{c.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/clients/${c.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline">Manage →</Link>
                  </td>
                </tr>
              )
            })}
            {allClients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <p className="text-gray-400 text-sm">No clients yet.</p>
                  <Link href="/admin/clients/new" className="text-blue-600 text-sm hover:underline mt-1 inline-block">Add your first client →</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
