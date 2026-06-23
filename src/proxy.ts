import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  const isAdminRoute = path.startsWith("/admin")
  const isClientRoute = path.startsWith("/client/dashboard") || path.startsWith("/client/reports")
  const isLoginPage = path === "/login"
  const isClientLoginPage = path === "/client/login"

  // Team auth (Google session cookie)
  const teamToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value

  // Client auth cookie
  const clientToken = req.cookies.get("client-session")?.value

  // Protect admin routes
  if (isAdminRoute && !teamToken) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Protect client dashboard
  if (isClientRoute && !clientToken) {
    return NextResponse.redirect(new URL("/client/login", req.url))
  }

  // Redirect logged-in team from /login to /admin
  if (isLoginPage && teamToken) {
    return NextResponse.redirect(new URL("/admin", req.url))
  }

  // Redirect logged-in client from /client/login to /client/dashboard
  if (isClientLoginPage && clientToken) {
    return NextResponse.redirect(new URL("/client/dashboard", req.url))
  }
}

export const config = {
  matcher: ["/admin/:path*", "/client/dashboard/:path*", "/client/reports/:path*", "/login", "/client/login"],
}
