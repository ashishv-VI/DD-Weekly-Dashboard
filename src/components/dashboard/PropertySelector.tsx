"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"

interface Property {
  ga4Id: string
  ga4Name: string
  gscUrl: string
  label: string
}

interface PropertySelectorProps {
  onSelect: (p: Property) => void
  accessToken?: string
}

export function PropertySelector({ onSelect, accessToken }: PropertySelectorProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!accessToken) return
    fetch("/api/properties")
      .then((r) => r.json())
      .then(setProperties)
      .catch(() => setError("Could not load properties"))
      .finally(() => setLoading(false))
  }, [accessToken])

  const filtered = properties.filter(
    (p) =>
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.gscUrl.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex items-center justify-center min-h-screen p-6" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-lg rounded-2xl shadow-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-lg font-semibold">Select a Property</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Choose which website you want to view data for
          </p>
        </div>

        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--muted)" }}>
            <Search size={14} style={{ color: "var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder="Search properties…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-72">
          {loading && (
            <div className="p-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
              Loading properties…
            </div>
          )}
          {error && (
            <div className="p-6 text-center text-sm text-red-500">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
              No properties found. Make sure your Google account has access to GA4 and Search Console.
            </div>
          )}
          {filtered.map((p) => (
            <button
              key={p.ga4Id}
              onClick={() => onSelect(p)}
              className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50 transition-colors border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: "var(--primary)" }}
              >
                {p.label[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{p.label}</div>
                <div className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                  {p.gscUrl}
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                Select
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
