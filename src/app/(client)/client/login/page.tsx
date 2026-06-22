"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ClientLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: "", pin: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Login failed")
      router.push("/client/dashboard")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl">D</div>
          <h1 className="text-2xl font-bold text-gray-900">Damco Digital</h1>
          <p className="text-gray-500 text-sm mt-1">SEO Dashboard</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign In</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your PIN"
                value={form.pin}
                onChange={e => setForm({ ...form, pin: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-6">
            Credentials provided by Damco Digital.<br />Contact support if locked out.
          </p>
        </div>
      </div>
    </div>
  )
}
