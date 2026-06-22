import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import Link from "next/link"

export default async function ClientsPage() {
  const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Link href="/admin/clients/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Add Client
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="text-left px-5 py-3">Client Name</th>
              <th className="text-left px-5 py-3">Domain</th>
              <th className="text-left px-5 py-3">Username</th>
              <th className="text-left px-5 py-3">GA4</th>
              <th className="text-left px-5 py-3">GSC</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allClients.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-5 py-3 text-gray-500 text-sm">{c.domain}</td>
                <td className="px-5 py-3 text-gray-500 text-sm font-mono">{c.username}</td>
                <td className="px-5 py-3 text-xs">
                  {c.ga4PropertyId ? <span className="text-green-600">✓ Connected</span> : <span className="text-gray-400">Not set</span>}
                </td>
                <td className="px-5 py-3 text-xs">
                  {c.gscSiteUrl ? <span className="text-green-600">✓ Connected</span> : <span className="text-gray-400">Not set</span>}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    c.status === "active" ? "bg-green-100 text-green-700" :
                    c.status === "locked" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                  }`}>{c.status}</span>
                </td>
                <td className="px-5 py-3 flex gap-2">
                  <Link href={`/admin/clients/${c.id}`} className="text-sm text-blue-600 hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
            {allClients.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No clients yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
