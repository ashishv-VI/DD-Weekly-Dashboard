import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar user={session.user} />
      <main className="flex-1 ml-64 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
