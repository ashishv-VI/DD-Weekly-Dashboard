"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import Link from "next/link"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    await signIn("google", { callbackUrl: "/admin" })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl">D</div>
          <h1 className="text-2xl font-bold text-gray-900">Damco Digital</h1>
          <p className="text-gray-500 text-sm mt-1">SEO Intelligence Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Team Login</h2>
          <p className="text-xs text-gray-400 mb-5">For Damco Digital team members only</p>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <GoogleIcon />
            {loading ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500 mb-3">Are you a client?</p>
          <Link href="/client/login" className="text-sm text-blue-600 hover:underline font-medium">
            Go to Client Login →
          </Link>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#fff" d="M17.64 9.2a10 10 0 0 0-.16-1.7H9v3.21h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.49z" />
    </svg>
  )
}
