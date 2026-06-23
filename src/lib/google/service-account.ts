import { GoogleAuth } from "google-auth-library"

let cached: { token: string; expiry: number } | null = null

export async function getServiceAccountToken(): Promise<string> {
  if (cached && Date.now() < cached.expiry - 5 * 60 * 1000) {
    return cached.token
  }

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY env var not set")

  const credentials = JSON.parse(keyJson)

  const auth = new GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
    ],
  })

  const client = await auth.getClient()
  const res = await client.getAccessToken()
  if (!res.token) throw new Error("Service account token fetch failed")

  cached = { token: res.token, expiry: Date.now() + 3600 * 1000 }
  return cached.token
}
