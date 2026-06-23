export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const accessToken = session.accessToken
  if (!accessToken) return NextResponse.json({ error: "No access token in session" }, { status: 400 })

  const email = session.user.email
  const name = session.user.name ?? email

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (existing) {
    await db.update(users).set({ googleAccessToken: accessToken }).where(eq(users.email, email))
  } else {
    const [any] = await db.select().from(users).limit(1)
    await db.insert(users).values({
      name,
      email,
      googleId: session.user.image ?? null,
      role: any ? "seo_team" : "super_admin",
      googleAccessToken: accessToken,
    })
  }

  return NextResponse.json({ success: true })
}
