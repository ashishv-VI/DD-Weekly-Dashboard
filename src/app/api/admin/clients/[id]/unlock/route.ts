export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { clients, notifications } from "@/lib/db/schema"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { eq } from "drizzle-orm"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const [client] = await db
    .update(clients)
    .set({ status: "active", loginAttempts: 0, lockedAt: null })
    .where(eq(clients.id, id))
    .returning()

  await db.insert(notifications).values({
    type: "account_unlocked",
    title: "Account Unlocked",
    message: `Client "${client.name}" account has been unlocked by admin.`,
    clientId: id,
    read: false,
  })

  return NextResponse.json({ success: true })
}
