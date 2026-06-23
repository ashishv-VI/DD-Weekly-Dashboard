export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "No session" }, { status: 401 })

  const email = session.user?.email ?? null
  const hasToken = !!session.accessToken
  const tokenPreview = session.accessToken ? (session.accessToken as string).slice(0, 20) : null

  let dbResult = null
  let dbError = null
  try {
    if (email) {
      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
      if (existing) {
        await db.update(users).set({ googleAccessToken: session.accessToken as string }).where(eq(users.email, email))
        dbResult = "updated"
      } else {
        const [any] = await db.select().from(users).limit(1)
        await db.insert(users).values({
          name: session.user?.name ?? email,
          email,
          role: any ? "seo_team" : "super_admin",
          googleAccessToken: session.accessToken as string,
        })
        dbResult = "inserted"
      }
    }
  } catch (e: unknown) {
    dbError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({ email, hasToken, tokenPreview, dbResult, dbError })
}
