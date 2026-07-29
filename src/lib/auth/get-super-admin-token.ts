import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function getSuperAdminToken(): Promise<string | null> {
  const [superAdmin] = await db.select().from(users)
    .where(eq(users.role, "super_admin"))
    .limit(1)

  if (!superAdmin) return null

  // Always try to refresh via refresh_token — guarantees a non-expired token
  if (superAdmin.googleRefreshToken) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          grant_type: "refresh_token",
          refresh_token: superAdmin.googleRefreshToken,
        }),
      })
      const data = await res.json()
      if (res.ok && data.access_token) {
        // Persist fresh token to DB
        await db.update(users)
          .set({ googleAccessToken: data.access_token as string })
          .where(eq(users.email, superAdmin.email))
          .catch(() => {})
        return data.access_token as string
      }
    } catch { /* fall through to stored token */ }
  }

  // Fallback: stored token (might be expired if no refresh token)
  return superAdmin.googleAccessToken ?? null
}
