"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { ChevronDown } from "lucide-react"

const DATE_RANGES = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "This quarter", value: "quarter" },
  { label: "This year", value: "year" },
]

interface HeaderProps {
  title: string
  dateRange: string
  onDateRangeChange: (v: string) => void
  property?: string
  onPropertyChange?: () => void
}

export function Header({ title, dateRange, onDateRangeChange, property, onPropertyChange }: HeaderProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const current = DATE_RANGES.find((r) => r.value === dateRange)

  return (
    <header
      className="fixed top-0 right-0 left-60 h-14 flex items-center justify-between px-6 z-30"
      style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          {title}
        </h1>
        {property && (
          <button
            onClick={onPropertyChange}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {property}
            <ChevronDown size={12} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Date range picker */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border"
            style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--card)" }}
          >
            {current?.label}
            <ChevronDown size={14} />
          </button>
          {open && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-lg shadow-lg py-1 z-50"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              {DATE_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { onDateRangeChange(r.value); setOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                  style={{
                    color: r.value === dateRange ? "var(--primary)" : "var(--foreground)",
                    fontWeight: r.value === dateRange ? 500 : 400,
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User avatar */}
        {session?.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name ?? ""}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
            style={{ background: "var(--primary)" }}
          >
            {session?.user?.name?.[0] ?? "U"}
          </div>
        )}
      </div>
    </header>
  )
}
