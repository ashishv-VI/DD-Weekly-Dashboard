"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/dashboard/Header"
import { KPICard } from "@/components/dashboard/KPICard"
import { TrendChart } from "@/components/charts/TrendChart"
import { PropertySelector } from "@/components/dashboard/PropertySelector"

interface DashboardData {
  gsc: {
    clicks: number; impressions: number; ctr: number; position: number
    prevClicks: number; prevImpressions: number; prevCtr: number; prevPosition: number
    daily: { date: string; clicks: number; impressions: number }[]
  }
  ga4: {
    sessions: number; users: number; engagedSessions: number
    engagementRate: number; conversions: number; revenue: number
    prevSessions: number; prevConversions: number
    daily: { date: string; sessions: number; conversions: number }[]
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [dateRange, setDateRange] = useState("30d")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [property, setProperty] = useState<{ ga4Id: string; gscUrl: string; label: string } | null>(null)
  const [showSelector, setShowSelector] = useState(false)

  const fetchData = useCallback(async () => {
    if (!property || !session?.accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/dashboard?ga4=${property.ga4Id}&gsc=${encodeURIComponent(property.gscUrl)}&range=${dateRange}`
      )
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [property, session?.accessToken, dateRange])

  useEffect(() => { fetchData() }, [fetchData])

  // Check localStorage for saved property
  useEffect(() => {
    const saved = localStorage.getItem("seo_property")
    if (saved) {
      try { setProperty(JSON.parse(saved)) } catch {}
    }
  }, [])

  const handlePropertySelect = (p: { ga4Id: string; gscUrl: string; label: string }) => {
    setProperty(p)
    localStorage.setItem("seo_property", JSON.stringify(p))
    setShowSelector(false)
  }

  const trendData = data
    ? data.gsc.daily.map((d) => {
        const ga4 = data.ga4.daily.find((g) => g.date === d.date)
        return { date: d.date, Clicks: d.clicks, Sessions: ga4?.sessions ?? 0 }
      })
    : []

  if (!property || showSelector) {
    return (
      <PropertySelector
        onSelect={handlePropertySelect}
        accessToken={session?.accessToken}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Executive Dashboard"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        property={property.label}
        onPropertyChange={() => setShowSelector(true)}
      />

      <div className="pt-14 p-6 flex flex-col gap-6">
        {error && (
          <div className="rounded-lg px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Organic Clicks" value={data?.gsc.clicks ?? 0} prevValue={data?.gsc.prevClicks} loading={loading} />
          <KPICard title="Impressions" value={data?.gsc.impressions ?? 0} prevValue={data?.gsc.prevImpressions} loading={loading} />
          <KPICard title="CTR" value={data?.gsc.ctr ?? 0} prevValue={data?.gsc.prevCtr} format="percent" loading={loading} />
          <KPICard title="Avg Position" value={data?.gsc.position ?? 0} prevValue={data?.gsc.prevPosition} format="position" invertTrend loading={loading} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Organic Sessions" value={data?.ga4.sessions ?? 0} prevValue={data?.ga4.prevSessions} loading={loading} />
          <KPICard title="Users" value={data?.ga4.users ?? 0} loading={loading} />
          <KPICard title="Engagement Rate" value={data?.ga4.engagementRate ?? 0} format="percent" loading={loading} />
          <KPICard title="Conversions" value={data?.ga4.conversions ?? 0} prevValue={data?.ga4.prevConversions} loading={loading} />
        </div>

        {/* Trend Chart */}
        <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Traffic Trend</h2>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Clicks vs Sessions</span>
          </div>
          {loading ? (
            <div className="h-60 rounded animate-pulse" style={{ background: "var(--muted)" }} />
          ) : (
            <TrendChart
              data={trendData}
              series={[
                { key: "Clicks", label: "Clicks (GSC)", color: "#2563eb" },
                { key: "Sessions", label: "Sessions (GA4)", color: "#16a34a" },
              ]}
            />
          )}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="font-semibold text-sm mb-3" style={{ color: "var(--foreground)" }}>Quick Stats</h2>
            <div className="space-y-3">
              {[
                { label: "Engaged Sessions", value: data?.ga4.engagedSessions ?? 0 },
                { label: "Revenue", value: data?.ga4.revenue ?? 0, prefix: "$" },
              ].map(({ label, value, prefix }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
                  <span className="font-medium">{prefix}{value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5 flex flex-col items-center justify-center gap-2" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="text-4xl font-bold" style={{ color: "var(--primary)" }}>
              {loading ? "—" : data ? Math.round((data.gsc.clicks / Math.max(data.gsc.impressions, 1)) * 1000) / 10 + "%" : "—"}
            </div>
            <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>Overall CTR</div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Clicks ÷ Impressions</div>
          </div>
        </div>
      </div>
    </div>
  )
}
