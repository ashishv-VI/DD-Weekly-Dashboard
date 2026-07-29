import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import Link from "next/link"

export default async function TeamPage() {
  const teamMembers = await db.select().from(users).orderBy(desc(users.createdAt))

  const roleColors: Record<string, { bg: string; text: string; label: string }> = {
    super_admin: { bg: "bg-purple-100", text: "text-purple-700", label: "Super Admin" },
    seo_team: { bg: "bg-blue-100", text: "text-blue-700", label: "SEO Executive" },
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-400 mt-0.5">{teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""} with admin access</p>
        </div>
        <Link href="/login"
          className="flex items-center gap-2 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add via Google Login
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide border-b border-gray-100">
              <th className="text-left px-5 py-3">Team Member</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-center px-4 py-3">Google</th>
              <th className="text-left px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map(m => {
              const role = roleColors[m.role] ?? { bg: "bg-gray-100", text: "text-gray-600", label: m.role }
              return (
                <tr key={m.id} className="border-t border-gray-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{m.email}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${role.bg} ${role.text}`}>
                      {role.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {m.googleAccessToken
                      ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/>{" "}Connected</span>
                      : <span className="text-xs text-gray-400">Not connected</span>
                    }
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                </tr>
              )
            })}
            {teamMembers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">
                  No team members yet. Sign in with Google to add the first admin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500">
        <strong className="text-gray-700">How to add team members:</strong> Have them sign in via the Google login at <Link href="/login" className="text-blue-600 hover:underline">/login</Link>.
        The first user automatically gets Super Admin role. Subsequent users are assigned SEO Executive role.
      </div>
    </div>
  )
}
