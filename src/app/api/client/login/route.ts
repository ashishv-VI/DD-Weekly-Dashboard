export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { verifyClientLogin, COOKIE_NAME } from "@/lib/auth/client-auth"

export async function POST(req: Request) {
  const body = await req.json()
  const { username, pin } = body
  if (typeof username === "string") body.username = username.trim()
  if (typeof pin === "string") body.pin = pin.trim()
  const ip = req.headers.get("x-forwarded-for") || "unknown"

  if (!username || !pin) {
    return NextResponse.json({ error: "Username and PIN required" }, { status: 400 })
  }

  const result = await verifyClientLogin(body.username, body.pin, ip)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 401 })
  }

  const res = NextResponse.json({ success: true, name: result.client!.name })
  res.cookies.set(COOKIE_NAME, result.token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  })

  return res
}
