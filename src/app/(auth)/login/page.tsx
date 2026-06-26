"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import Link from "next/link"

const FEATURES = [
  { path: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Google Analytics 4 Integration", color: "#fb923c" },
  { path: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", label: "Search Console Insights", color: "#60a5fa" },
  { path: "M13 10V3L4 14h7v7l9-11h-7z", label: "AI Visibility Tracking", color: "#c084fc" },
  { path: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "Technical SEO Monitoring", color: "#34d399" },
  { path: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label: "Automated Weekly Reports", color: "#2dd4bf" },
  { path: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z", label: "Keyword Intelligence", color: "#facc15" },
]

const STATS = [
  { value: "50+", label: "Websites" },
  { value: "12K+", label: "Keywords" },
  { value: "5", label: "AI Platforms" },
  { value: "100%", label: "Real-time" },
]

function DamcoLogoIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="adminLogoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb"/>
          <stop offset="100%" stopColor="#4338ca"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#adminLogoGrad)"/>
      {/* Rising bars representing SEO analytics */}
      <rect x="8"  y="30" width="8" height="10" rx="2" fill="white" fillOpacity="0.4"/>
      <rect x="20" y="22" width="8" height="18" rx="2" fill="white" fillOpacity="0.7"/>
      <rect x="32" y="12" width="8" height="28" rx="2" fill="white"/>
      {/* Upward trend line */}
      <polyline points="12,29 24,21 36,11" stroke="white" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    await signIn("google", { callbackUrl: "/admin" })
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

        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
          backgroundSize: "48px 48px"
        }}/>

        {/* Accent glows */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }}/>
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }}/>

        {/* Logo */}
        <div className="relative fade-up mb-10">
          <div className="flex items-center gap-3">
            <DamcoLogoIcon size={48} />
            <div>
              <div className="text-white font-bold text-xl leading-none">Damco Digital</div>
              <div className="text-slate-400 text-xs mt-1">SEO Intelligence Platform</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative flex-1 flex flex-col justify-center">
          <div className="fade-up-2 mb-8">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">All-in-one SEO Command Center</p>
            <h2 className="text-4xl font-bold text-white leading-tight mb-3">
              Monitor. Analyse.<br/>Grow.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Track SEO performance, AI visibility, Google Analytics, and Search Console — all from one intelligent dashboard.
            </p>
          </div>

          {/* Features — 2 columns to fill width */}
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

          {/* Stats */}
          <div className="fade-up-4 grid grid-cols-4 gap-4 pt-6 border-t border-white/10">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-xs text-slate-600 mt-8">
          © 2026 Damco Group · Powered by Damco Digital
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500 mb-8">Sign in to access your SEO Intelligence Platform</p>
          </div>

          {/* Team Login Card */}
          <div className="fade-up-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Agency Team Login</h2>
            </div>
            <p className="text-xs text-gray-400 mb-6 ml-7">For Damco Digital team members only</p>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:border-blue-300 hover:shadow-md hover:bg-blue-50 disabled:opacity-50 transition-all duration-200 group"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-blue-600 rounded-full animate-spin"/>
              ) : (
                <GoogleColorIcon />
              )}
              {loading ? "Connecting…" : "Continue with Google"}
            </button>
          </div>

          {/* Client Login Card */}
          <div className="fade-up-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">Client Portal</span>
            </div>
            <p className="text-xs text-gray-400 mb-4 ml-7">Login with your username and PIN</p>
            <Link href="/client/login"
              className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all">
              Go to Client Login
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>

          {/* Security badges */}
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
              Google Protected
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

function GoogleColorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path fill="#4285F4" d="M17.64 9.2a10 10 0 00-.16-1.7H9v3.21h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92a8.78 8.78 0 002.68-6.49z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.93v2.33A8.99 8.99 0 009 18z"/>
      <path fill="#FBBC05" d="M3.97 10.71a5.41 5.41 0 010-3.42V4.96H.93a9 9 0 000 8.08l3.04-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.57-2.57C13.46.89 11.43 0 9 0A8.99 8.99 0 00.93 4.96L3.97 7.3C4.68 5.17 6.66 3.58 9 3.58z"/>
    </svg>
  )
}
