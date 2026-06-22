export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { hashPin } from "@/lib/auth/client-auth"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { eq } from "drizzle-orm"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { pinHash, googleAccessToken, googleRefreshToken, ...safe } = client
  return NextResponse.json(safe)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, domain, username, pin, ga4PropertyId, gscSiteUrl, notes, status } = body

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (name) updates.name = name
  if (domain) updates.domain = domain
  if (username) updates.username = username.toLowerCase()
  if (pin) updates.pinHash = await hashPin(pin)
  if (ga4PropertyId !== undefined) updates.ga4PropertyId = ga4PropertyId
  if (gscSiteUrl !== undefined) updates.gscSiteUrl = gscSiteUrl
  if (notes !== undefined) updates.notes = notes
  if (status) updates.status = status

  const [updated] = await db.update(clients).set(updates).where(eq(clients.id, id)).returning()
  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.delete(clients).where(eq(clients.id, id))
  return NextResponse.json({ success: true })
}
