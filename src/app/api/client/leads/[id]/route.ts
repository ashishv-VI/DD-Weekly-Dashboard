import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { leads } from "@/lib/db/schema"
import { requireLeadClient } from "@/lib/require-lead-client"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const allowedStatuses = [
  "new",
  "contacted",
  "qualified",
  "closed",
  "lost",
] as const

type LeadStatus = (typeof allowedStatuses)[number]

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const cleaned = value.trim()
  return cleaned || null
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  const client = await requireLeadClient(request)

  if (!client) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  const { id } = await context.params

  const [lead] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.id, id),
        eq(leads.clientId, client.id),
      ),
    )
    .limit(1)

  if (!lead) {
    return Response.json(
      { error: "Lead not found" },
      { status: 404 },
    )
  }

  return Response.json({ lead })
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const client = await requireLeadClient(request)

  if (!client) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  const { id } = await context.params
  const body = await request.json()

  const firstName = optionalText(body.firstName)
  const lastName = optionalText(body.lastName)
  const email = optionalText(body.email)

  if (!firstName || !lastName || !email) {
    return Response.json(
      {
        error:
          "First name, last name and email are required.",
      },
      { status: 400 },
    )
  }

  const requestedStatus = String(body.status ?? "new")
  const status = allowedStatuses.includes(
    requestedStatus as LeadStatus,
  )
    ? (requestedStatus as LeadStatus)
    : "new"

  const parkingSpaces =
    body.parkingSpaces === "" ||
    body.parkingSpaces === null ||
    body.parkingSpaces === undefined
      ? null
      : Number(body.parkingSpaces)

  if (
    parkingSpaces !== null &&
    (!Number.isInteger(parkingSpaces) ||
      parkingSpaces < 0)
  ) {
    return Response.json(
      {
        error:
          "Parking spaces must be a valid whole number.",
      },
      { status: 400 },
    )
  }

  const [updatedLead] = await db
    .update(leads)
    .set({
      firstName,
      lastName,
      email,
      phone: optionalText(body.phone),
      companyName: optionalText(body.companyName),
      parkingSpaces,
      hasAirportShuttle:
        typeof body.hasAirportShuttle === "boolean"
          ? body.hasAirportShuttle
          : null,
      shuttleServiceWork: optionalText(
        body.shuttleServiceWork,
      ),
      averageDailyParkingRate: optionalText(
        body.averageDailyParkingRate,
      ),
      status,
      sourcePage: optionalText(body.sourcePage),
      sourcePageUrl: optionalText(body.sourcePageUrl),
      comments: optionalText(body.comments),
      adminNotes: optionalText(body.adminNotes),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(leads.id, id),
        eq(leads.clientId, client.id),
      ),
    )
    .returning()

  if (!updatedLead) {
    return Response.json(
      { error: "Lead not found" },
      { status: 404 },
    )
  }

  return Response.json({ lead: updatedLead })
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  const client = await requireLeadClient(request)

  if (!client) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
  }

  const { id } = await context.params

  const [deletedLead] = await db
    .delete(leads)
    .where(
      and(
        eq(leads.id, id),
        eq(leads.clientId, client.id),
      ),
    )
    .returning({ id: leads.id })

  if (!deletedLead) {
    return Response.json(
      { error: "Lead not found" },
      { status: 404 },
    )
  }

  return Response.json({ success: true })
}