export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { hashPin } from "@/lib/auth/client-auth"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { eq, desc } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt))
  return NextResponse.json(allClients)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, domain, username, pin, ga4PropertyId, gscSiteUrl, notes } = body

  if (!name || !domain || !username || !pin) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const slug = username.toLowerCase().replace(/[^a-z0-9]/g, "-")
  const pinHash = await hashPin(pin)

  const [client] = await db
    .insert(clients)
    .values({
      id: uuidv4(),
      name,
      domain,
      slug,
      username: username.toLowerCase(),
      pinHash,
      ga4PropertyId: ga4PropertyId || null,
      gscSiteUrl: gscSiteUrl || null,
      notes: notes || null,
      status: "active",
    })
    .returning()

  return NextResponse.json(client)
}
