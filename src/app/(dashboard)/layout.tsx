"use client"
import { SessionProvider } from "next-auth/react"
import { Sidebar } from "@/components/dashboard/Sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-60 min-h-screen" style={{ background: "var(--background)" }}>
          {children}
        </main>
      </div>
    </SessionProvider>
  )
}
