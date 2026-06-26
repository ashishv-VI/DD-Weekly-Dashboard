"use client"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

const FEATURES = [
  { path: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Organic Traffic Analytics", color: "#fb923c" },
  { path: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", label: "Keyword Rankings & CTR", color: "#60a5fa" },
  { path: "M13 10V3L4 14h7v7l9-11h-7z", label: "AI Platform Visibility", color: "#c084fc" },
  { path: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "SEO Health Score", color: "#34d399" },
  { path: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "Weekly Performance Reports", color: "#2dd4bf" },
  { path: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z", label: "Technical SEO Audit", color: "#facc15" },
]

function DamcoLogoIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="clientLogoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb"/>
          <stop offset="100%" stopColor="#4338ca"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#clientLogoGrad)"/>
      {/* Rising bars representing SEO analytics */}
      <rect x="8"  y="30" width="8" height="10" rx="2" fill="white" fillOpacity="0.4"/>
      <rect x="20" y="22" width="8" height="18" rx="2" fill="white" fillOpacity="0.7"/>
      <rect x="32" y="12" width="8" height="28" rx="2" fill="white"/>
      {/* Upward trend line */}
      <polyline points="12,29 24,21 36,11" stroke="white" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export default function ClientLoginPage() {
  return (
    <Suspense>
      <ClientLoginInner />
    </Suspense>
  )
}

function ClientLoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ username: "", pin: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const u = searchParams.get("username")
    if (u) setForm(f => ({ ...f, username: u }))
  }, [searchParams])

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
    <div className="min-h-screen flex" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s ease-out forwards; }
        .fade-up-2 { animation: fadeUp 0.5s 0.1s ease-out both; }
        .fade-up-3 { animation: fadeUp 0.5s 0.2s ease-out both; }
        .fade-up-4 { animation: fadeUp 0.5s 0.3s ease-out both; }
      `}</style>

      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex flex-col w-[52%] min-h-screen px-12 py-10 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)" }}>

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
          backgroundSize: "48px 48px"
        }}/>

        {/* Accent glows */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }}/>
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, #2563eb, transparent)" }}/>

        {/* Logo */}
        <div className="relative fade-up mb-10">
          <div className="flex items-center gap-3">
            <DamcoLogoIcon size={48} />
            <div>
              <div className="text-white font-bold text-xl leading-none">Damco Digital</div>
              <div className="text-slate-400 text-xs mt-1">Client SEO Dashboard</div>
            </div>
          </div>
        </div>

        {/* Headline + content */}
        <div className="relative flex-1 flex flex-col justify-center">
          <div className="fade-up-2 mb-8">
            <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-3">Your SEO Performance Hub</p>
            <h2 className="text-4xl font-bold text-white leading-tight mb-3">
              See Your SEO<br/>in Real Time.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Track your website&apos;s organic performance, keyword rankings, AI visibility, and technical health — updated daily.
            </p>
          </div>

          {/* Features — 2 columns */}
          <div className="fade-up-3 grid grid-cols-2 gap-2.5 mb-8">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke={f.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d={f.path}/>
                  </svg>
                </div>
                <span className="text-slate-300 text-xs leading-snug">{f.label}</span>
              </div>
            ))}
          </div>

          {/* Trust note */}
          <div className="fade-up-4 bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Managed by Damco Digital</div>
                <div className="text-xs text-slate-400 mt-0.5">Your SEO is professionally monitored and optimised</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-xs text-slate-600 mt-8">
          © 2026 Damco Group · <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
        </div>
      </div>

      {/* ── Right Login Panel ── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <DamcoLogoIcon size={38} />
            <span className="font-bold text-gray-900">Damco Digital</span>
          </div>

          <div className="fade-up">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Client Sign In</h1>
            <p className="text-sm text-gray-500 mb-8">Enter your credentials to view your SEO dashboard</p>
          </div>

          {/* Login Card */}
          <div className="fade-up-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-4">

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Username</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g. kodacars"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">PIN</label>
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Your secure PIN"
                  value={form.pin}
                  onChange={e => setForm({ ...form, pin: e.target.value })}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                  </svg>
                )}
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-5 leading-relaxed">
              Credentials provided by your Damco Digital team.<br/>
              Contact support if you&apos;re locked out.
            </p>
          </div>

          {/* Agency link */}
          <div className="fade-up-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-xs text-gray-500 mb-2">Are you a Damco Digital team member?</p>
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">
              Team Login with Google →
            </Link>
          </div>

          {/* Security */}
          <div className="fade-up-4 flex items-center justify-center gap-5 mt-6">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Secure Login
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              Data Protected
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
              </svg>
              Encrypted
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
