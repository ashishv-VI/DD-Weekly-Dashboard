"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface ClientInfo {
  id: string; name: string; domain: string; username: string
  ga4PropertyId: string | null; gscSiteUrl: string | null
}

export default function ClientDashboard() {
  const router = useRouter()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState("30d")

  useEffect(() => {
    fetch("/api/client/me").then(r => {
      if (!r.ok) { router.push("/client/login"); return null }
      return r.json()
    }).then(d => { if (d) setClient(d) })
  }, [router])

  useEffect(() => {
    if (!client) return
    setLoading(true)
    fetch(`/api/client/data?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [client, range])

  const handleLogout = async () => {
    await fetch("/api/client/logout", { method: "POST" })
    router.push("/client/login")
  }

  if (!client) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>

  const gsc = data?.gsc as Record<string, number> | null
  const ga4 = data?.ga4 as Record<string, number> | null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="font-semibold text-gray-900">{client.name}</div>
          <div className="text-xs text-gray-400">{client.domain}</div>
        </div>
        <div className="flex items-center gap-4">
          <select value={range} onChange={e => setRange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500">Sign out</button>
        </div>
      </header>

      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">SEO Dashboard</h1>

        {!client.ga4PropertyId && !client.gscSiteUrl && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6 text-sm text-yellow-800">
            ⚠ Google Analytics and Search Console are being connected by the Damco team. Data will appear soon.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Organic Clicks", value: gsc?.clicks, loading },
            { label: "Impressions", value: gsc?.impressions, loading },
            { label: "CTR", value: gsc ? `${gsc.ctr?.toFixed(1)}%` : null, loading },
            { label: "Avg Position", value: gsc?.position?.toFixed(1), loading },
          ].map(({ label, value, loading }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 mb-2">{label}</div>
              {loading ? (
                <div className="h-7 w-20 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-bold text-gray-900">{value ?? "—"}</div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Sessions", value: ga4?.sessions },
            { label: "Users", value: ga4?.users },
            { label: "Engagement Rate", value: ga4 ? `${((ga4.engagementRate || 0) * 100).toFixed(1)}%` : null },
            { label: "Conversions", value: ga4?.conversions },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 mb-2">{label}</div>
              {loading ? (
                <div className="h-7 w-20 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-bold text-gray-900">{value ?? "—"}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
