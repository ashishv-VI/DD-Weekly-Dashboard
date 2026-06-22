import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export type TeamRole = "super_admin" | "seo_team" | "marketing" | "account_manager"

export async function getTeamSession() {
  return getServerSession(authOptions)
}

export async function requireTeamAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  return session
}

export async function getOrCreateUser(email: string, name: string, googleId: string) {
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) return existing

  const [allUsers] = await db.select().from(users).limit(1)
  const role = allUsers ? "seo_team" : "super_admin"

  const [created] = await db.insert(users).values({ name, email, googleId, role }).returning()
  return created
}
