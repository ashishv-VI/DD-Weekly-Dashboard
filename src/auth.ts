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
          // Update token on every login
          await db.update(users).set({
            googleAccessToken: account?.access_token ?? existing.googleAccessToken,
            googleRefreshToken: account?.refresh_token ?? existing.googleRefreshToken,
          }).where(eq(users.email, user.email))
        } else {
          // First user = super_admin, rest = seo_team
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
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: { signIn: "/login" },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
export default handler
