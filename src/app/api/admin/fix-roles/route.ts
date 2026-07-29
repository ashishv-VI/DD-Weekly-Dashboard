export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const SUPER_ADMIN_EMAIL = "damcodigitalseo@gmail.com"
const SEO_TEAM_EMAIL = "ashishv@damcogroup.com"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  try {
    const allUsersBefore = await db.select({
      email: users.email,
      role: users.role,
      hasAccessToken: users.googleAccessToken,
      hasRefreshToken: users.googleRefreshToken,
    }).from(users)

    // Check if damcodigitalseo exists in DB
    const superAdminUser = allUsersBefore.find(u => u.email === SUPER_ADMIN_EMAIL)

    if (!superAdminUser) {
      return NextResponse.json({
        error: "damcodigitalseo@gmail.com not found in database",
        action_required: "Log in at /login with damcodigitalseo@gmail.com first, then re-run this endpoint",
        currentUsers: allUsersBefore.map(u => ({ email: u.email, role: u.role })),
      }, { status: 400 })
    }

    // Fix roles
    await db.update(users).set({ role: "super_admin" }).where(eq(users.email, SUPER_ADMIN_EMAIL))
    await db.update(users).set({ role: "seo_team" }).where(eq(users.email, SEO_TEAM_EMAIL))

    const allUsersAfter = await db.select({
      email: users.email,
      role: users.role,
      hasAccessToken: users.googleAccessToken,
      hasRefreshToken: users.googleRefreshToken,
    }).from(users)

    const superAdminAfter = allUsersAfter.find(u => u.email === SUPER_ADMIN_EMAIL)

    const tokenStatus = {
      hasAccessToken: !!superAdminAfter?.hasAccessToken,
      hasRefreshToken: !!superAdminAfter?.hasRefreshToken,
    }

    const nextStep = !tokenStatus.hasRefreshToken
      ? "WARNING: damcodigitalseo@gmail.com has no refresh token. Token will expire in 1 hour. Log out and log in with damcodigitalseo@gmail.com to fix permanently."
      : "All good! Token will auto-refresh. Data should load correctly now."

    return NextResponse.json({
      message: "Roles fixed successfully",
      before: allUsersBefore.map(u => ({ email: u.email, role: u.role })),
      after: allUsersAfter.map(u => ({ email: u.email, role: u.role })),
      superAdminTokenStatus: tokenStatus,
      nextStep,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
