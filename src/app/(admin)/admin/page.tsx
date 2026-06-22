import { db } from "@/lib/db"
import { clients, notifications } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import Link from "next/link"

export default async function AdminDashboard() {
  const [allClients, unreadNotifs] = await Promise.all([
    db.select().from(clients).orderBy(desc(clients.createdAt)),
    db.select().from(notifications).where(eq(notifications.read, false)).orderBy(desc(notifications.createdAt)).limit(10),
  ])

  const active = allClients.filter(c => c.status === "active").length
  const locked = allClients.filter(c => c.status === "locked").length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage all SEO clients from one place</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Client
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Clients", value: allClients.length, color: "blue" },
          { label: "Active", value: active, color: "green" },
          { label: "Locked", value: locked, color: "red" },
          { label: "Alerts", value: unreadNotifs.length, color: "yellow" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {unreadNotifs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-8">
          <h2 className="font-semibold text-yellow-900 mb-3">⚠ Alerts</h2>
          {unreadNotifs.map(n => (
            <div key={n.id} className="text-sm text-yellow-800 mb-1">• {n.message}</div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">All Clients</h2>
          <Link href="/admin/clients" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="text-left px-5 py-3">Client</th>
              <th className="text-left px-5 py-3">Domain</th>
              <th className="text-left px-5 py-3">Username</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allClients.slice(0, 10).map(client => (
              <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{client.name}</td>
                <td className="px-5 py-3 text-gray-500 text-sm">{client.domain}</td>
                <td className="px-5 py-3 text-gray-500 text-sm">{client.username}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    client.status === "active" ? "bg-green-100 text-green-700" :
                    client.status === "locked" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {client.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/clients/${client.id}`} className="text-sm text-blue-600 hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {allClients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                  No clients yet. <Link href="/admin/clients/new" className="text-blue-600 hover:underline">Add your first client</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
