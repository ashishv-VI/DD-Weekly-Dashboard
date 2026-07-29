import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { db } from "@/lib/db"
import { clients, loginAttemptLogs, notifications } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const MAX_ATTEMPTS = 4
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  throw new Error("AUTH_SECRET or NEXTAUTH_SECRET environment variable must be set")
}
const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)
const COOKIE_NAME = "client-session"

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12)
}

export async function verifyClientLogin(username: string, pin: string, ip: string) {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.username, username))
    .limit(1)

  if (!client) {
    return { success: false, error: "Invalid username or PIN" }
  }

  if (client.status === "locked") {
    return { success: false, error: "Account is locked. Please contact Damco support." }
  }

  if (client.status === "inactive") {
    return { success: false, error: "Account is inactive." }
  }

  const validPin = await bcrypt.compare(pin, client.pinHash)

  if (!validPin) {
    const newAttempts = (client.loginAttempts || 0) + 1
    const shouldLock = newAttempts >= MAX_ATTEMPTS

    await db
      .update(clients)
      .set({
        loginAttempts: newAttempts,
        status: shouldLock ? "locked" : client.status,
        lockedAt: shouldLock ? new Date() : client.lockedAt,
      })
      .where(eq(clients.id, client.id))

    await db.insert(loginAttemptLogs).values({
      clientId: client.id,
      ipAddress: ip,
      success: false,
    })

    if (shouldLock) {
      await db.insert(notifications).values({
        type: "account_locked",
        title: "Account Locked",
        message: `Client "${client.name}" account has been locked after ${MAX_ATTEMPTS} failed login attempts.`,
        clientId: client.id,
        read: false,
      })
      return { success: false, error: "Account locked after too many attempts. Contact Damco support." }
    }

    return {
      success: false,
      error: `Invalid PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`,
    }
  }

  // Success
  await db
    .update(clients)
    .set({ loginAttempts: 0 })
    .where(eq(clients.id, client.id))

  await db.insert(loginAttemptLogs).values({
    clientId: client.id,
    ipAddress: ip,
    success: true,
  })

  const token = await new SignJWT({
    sub: client.id,
    username: client.username,
    name: client.name,
    role: "client",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET)

  return { success: true, token, client }
}

export async function verifyClientToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { sub: string; username: string; name: string; role: string }
  } catch {
    return null
  }
}

export { COOKIE_NAME }
