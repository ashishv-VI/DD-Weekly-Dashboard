export type AuthenticatedLeadClient = {
  id: string
  name: string
  leadsEnabled: boolean
}

export async function requireLeadClient(
  request: Request,
): Promise<AuthenticatedLeadClient | null> {
  const cookie = request.headers.get("cookie") ?? ""

  const response = await fetch(
    new URL("/api/client/me", request.url),
    {
      headers: {
        cookie,
      },
      cache: "no-store",
    },
  )

  if (!response.ok) {
    return null
  }

  const client =
    (await response.json()) as AuthenticatedLeadClient

  if (!client.id || !client.leadsEnabled) {
    return null
  }

  return client
}