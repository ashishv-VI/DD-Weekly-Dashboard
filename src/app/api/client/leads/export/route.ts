import { desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { leads } from "@/lib/db/schema"
import { requireLeadClient } from "@/lib/require-lead-client"

function csvCell(value: unknown) {
  let text =
    value === null || value === undefined
      ? ""
      : String(value)

  // Prevent Excel formula injection.
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`
  }

  return `"${text.replace(/"/g, '""')}"`
}

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

  const headers = [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Company Name",
    "Parking Spaces",
    "Airport Shuttle",
    "Shuttle Service",
    "Average Daily Parking Rate",
    "Lead Status",
    "Source Page",
    "Source Page URL",
    "Comments",
    "Admin Notes",
    "Created At",
  ]

  const rows = result.map((lead) => [
    lead.firstName,
    lead.lastName,
    lead.email,
    lead.phone,
    lead.companyName,
    lead.parkingSpaces,
    lead.hasAirportShuttle === null
      ? ""
      : lead.hasAirportShuttle
        ? "Yes"
        : "No",
    lead.shuttleServiceWork,
    lead.averageDailyParkingRate,
    lead.status,
    lead.sourcePage,
    lead.sourcePageUrl,
    lead.comments,
    lead.adminNotes,
    lead.createdAt?.toISOString(),
  ])

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      row.map(csvCell).join(","),
    ),
  ].join("\r\n")

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="leads.csv"',
      "Cache-Control": "no-store",
    },
  })
}