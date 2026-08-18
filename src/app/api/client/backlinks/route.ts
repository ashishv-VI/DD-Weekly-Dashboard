export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const payload = await verifyClientToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  const [client] = await db.select({ notes: clients.notes }).from(clients).where(eq(clients.id, payload.sub)).limit(1)
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const noCache = { headers: { "Cache-Control": "private, no-store" } }
  try {
    if (client.notes) {
      const p = JSON.parse(client.notes)
      if (p?._v === 1 && Array.isArray(p.backlinkMonths)) {
        return NextResponse.json({ months: p.backlinkMonths }, noCache)
      }
    }
  } catch {}
  return NextResponse.json({ months: [] }, noCache)
}
