import NextAuth, { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/analytics.readonly",
            "https://www.googleapis.com/auth/webmasters.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false
      try {
        const [existing] = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
        if (existing) {
          await db.update(users).set({
            googleAccessToken: account?.access_token ?? existing.googleAccessToken,
            googleRefreshToken: account?.refresh_token ?? existing.googleRefreshToken,
          }).where(eq(users.email, user.email))
        } else {
          const [any] = await db.select().from(users).limit(1)
          await db.insert(users).values({
            name: user.name ?? user.email,
            email: user.email,
            googleId: user.id,
            role: any ? "seo_team" : "super_admin",
            googleAccessToken: account?.access_token ?? null,
            googleRefreshToken: account?.refresh_token ?? null,
          })
        }
      } catch (e) {
        console.error("signIn DB error:", e)
      }
      return true
    },
    async jwt({ token, account }) {
      if (account) {
        // Fresh login — store all token info
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000
        return token
      }

      // Token still valid (5 min buffer before expiry)?
      if (token.expiresAt && Date.now() < (token.expiresAt as number) - 5 * 60 * 1000) {
        return token
      }

      // Token expired — try silent refresh using refresh token
      if (!token.refreshToken) return { ...token, error: "NoRefreshToken" }

      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
        })

        const refreshed = await res.json()
        if (!res.ok) throw new Error(refreshed.error ?? "refresh_failed")

        const newToken = {
          ...token,
          accessToken: refreshed.access_token as string,
          expiresAt: Date.now() + (refreshed.expires_in as number) * 1000,
          error: undefined,
        }

        // Persist fresh access token to DB so /api/client/data picks it up
        if (token.email) {
          try {
            await db.update(users)
              .set({ googleAccessToken: refreshed.access_token as string })
              .where(eq(users.email, token.email as string))
          } catch (dbErr) {
            console.error("DB token update error:", dbErr)
          }
        }

        return newToken
      } catch (e) {
        console.error("Token refresh failed:", e)
        return { ...token, error: "RefreshAccessTokenError" }
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      if (token.error) session.error = token.error as string
      return session
    },
  },
  pages: { signIn: "/login" },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
export default handler
