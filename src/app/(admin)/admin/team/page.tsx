import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { desc } from "drizzle-orm"

export default async function TeamPage() {
  const teamMembers = await db.select().from(users).orderBy(desc(users.createdAt))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="text-gray-400 text-sm mt-1">SEO team members with admin access</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Team Members ({teamMembers.length})</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">Google Connected</th>
              <th className="text-left px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map(m => (
              <tr key={m.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 text-sm">{m.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">{m.email}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    m.role === "super_admin"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {m.role === "super_admin" ? "Super Admin" : "SEO Team"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {m.googleAccessToken
                    ? <span className="text-xs text-emerald-600 font-semibold">✓ Connected</span>
                    : <span className="text-xs text-red-500">✗ Not connected</span>}
                </td>
                <td className="px-5 py-4 text-xs text-gray-400">
                  {m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
