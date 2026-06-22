"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "⊞" },
  { href: "/admin/clients", label: "Clients", icon: "👥" },
  { href: "/admin/reports", label: "Reports", icon: "📊" },
  { href: "/admin/team", label: "Team", icon: "👤" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
]

export function AdminSidebar({ user }: { user: { name?: string | null; email?: string | null } }) {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="font-bold text-lg text-white">Damco Digital</div>
        <div className="text-xs text-gray-400 mt-1">SEO Intelligence Platform</div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <div className="text-sm text-gray-300 mb-1 truncate">{user?.name}</div>
        <div className="text-xs text-gray-500 mb-3 truncate">{user?.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-xs text-gray-400 hover:text-red-400 transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
