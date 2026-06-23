export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getPageSpeed } from "@/lib/google/pagespeed"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const payload = await verifyClientToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  const [client] = await db.select().from(clients).where(eq(clients.id, payload.sub)).limit(1)
  if (!client?.domain) return NextResponse.json({ error: "No domain configured" }, { status: 400 })

  const url = client.domain.startsWith("http") ? client.domain : `https://${client.domain}`
  try {
    const result = await getPageSpeed(url)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "PageSpeed API failed" }, { status: 500 })
  }
}
