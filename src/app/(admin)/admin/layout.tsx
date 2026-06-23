import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // Save Google token to DB every time admin loads
  if (session.accessToken && session.user?.email) {
    try {
      const email = session.user.email
      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
      if (existing) {
        await db.update(users).set({ googleAccessToken: session.accessToken }).where(eq(users.email, email))
      } else {
        const [any] = await db.select().from(users).limit(1)
        await db.insert(users).values({
          name: session.user.name ?? email,
          email,
          role: any ? "seo_team" : "super_admin",
          googleAccessToken: session.accessToken,
        })
      }
    } catch {}
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar user={session.user} />
      <main className="flex-1 ml-64 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
