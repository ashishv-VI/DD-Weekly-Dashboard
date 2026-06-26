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

  const [client] = await db
    .select({
      id: clients.id, name: clients.name, domain: clients.domain,
      username: clients.username, status: clients.status,
      ga4PropertyId: clients.ga4PropertyId, gscSiteUrl: clients.gscSiteUrl,
      notes: clients.notes,
    })
    .from(clients)
    .where(eq(clients.id, payload.sub))
    .limit(1)

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  let logoUrl = "", themeColor = "", textOnTheme = ""
  try {
    if (client.notes) {
      const p = JSON.parse(client.notes)
      if (p && p._v === 1) {
        logoUrl = p.logoUrl || ""
        themeColor = p.themeColor || ""
        textOnTheme = p.textOnTheme || ""
      }
    }
  } catch {}

  const { notes: _n, ...rest } = client
  return NextResponse.json({ ...rest, logoUrl, themeColor, textOnTheme })
}
