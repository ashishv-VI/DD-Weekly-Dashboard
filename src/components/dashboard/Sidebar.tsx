"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Search,
  BarChart3,
  FileText,
  History,
  Bot,
  Bell,
  LogOut,
  ChevronRight,
} from "lucide-react"

const nav = [
  { href: "/dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/search-console", label: "Search Console", icon: Search },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/landing-pages", label: "Landing Pages", icon: FileText },
  { href: "/dashboard/historical", label: "Historical", icon: History },
  { href: "/dashboard/ai-traffic", label: "AI Traffic", icon: Bot },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-40"
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
          style={{ background: "var(--primary)" }}
        >
          S
        </div>
        <div>
          <div className="text-white font-semibold text-sm">SEO Dashboard</div>
          <div className="text-xs" style={{ color: "var(--sidebar-text)" }}>Intelligence Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <div className="px-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group"
                style={{
                  background: active ? "rgba(37,99,235,0.15)" : "transparent",
                  color: active ? "#fff" : "var(--sidebar-text)",
                }}
              >
                <Icon
                  size={16}
                  style={{ color: active ? "var(--primary)" : "var(--sidebar-text)" }}
                />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} style={{ color: "var(--sidebar-text)" }} />}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-colors hover:bg-white/5"
          style={{ color: "var(--sidebar-text)" }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
