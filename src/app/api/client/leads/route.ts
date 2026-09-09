import { desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { leads } from "@/lib/db/schema"
import { requireLeadClient } from "@/lib/require-lead-client"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const client = await requireLeadClient(request)

  if (!client) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.clientId, client.id))
    .orderBy(desc(leads.createdAt))

  return Response.json({ leads: result })
}