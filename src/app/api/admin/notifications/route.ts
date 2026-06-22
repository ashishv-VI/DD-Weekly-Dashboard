export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifications } from "@/lib/db/schema"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { eq, desc } from "drizzle-orm"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const all = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50)
  return NextResponse.json(all)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  await db.update(notifications).set({ read: true }).where(eq(notifications.id, id))
  return NextResponse.json({ success: true })
}
