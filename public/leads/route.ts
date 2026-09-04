import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { clients, leads } from "@/lib/db/schema"

function allowedOrigins() {
  return new Set(
    (process.env.ALLOWED_LEAD_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  }
}

function textValue(
  value: unknown,
  maxLength: number,
) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : ""
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? ""

  if (!allowedOrigins().has(origin)) {
    return new Response(null, { status: 403 })
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  })
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin") ?? ""

  if (!allowedOrigins().has(origin)) {
    return Response.json(
      { error: "Origin not allowed" },
      { status: 403 },
    )
  }

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "Invalid JSON request" },
      {
        status: 400,
        headers: corsHeaders(origin),
      },
    )
  }

  const clientSlug = textValue(body.clientSlug, 100)
  const firstName = textValue(body.firstName, 100)
  const lastName = textValue(body.lastName, 100)
  const email = textValue(body.email, 255)

  if (!clientSlug || !firstName || !lastName || !email) {
    return Response.json(
      {
        error:
          "Client slug, first name, last name and email are required.",
      },
      {
        status: 400,
        headers: corsHeaders(origin),
      },
    )
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json(
      { error: "Please provide a valid email." },
      {
        status: 400,
        headers: corsHeaders(origin),
      },
    )
  }

  const [client] = await db
    .select({
      id: clients.id,
    })
    .from(clients)
    .where(
      and(
        eq(clients.slug, clientSlug),
        eq(clients.status, "active"),
        eq(clients.leadsEnabled, true),
      ),
    )
    .limit(1)

  if (!client) {
    return Response.json(
      { error: "Client not found" },
      {
        status: 404,
        headers: corsHeaders(origin),
      },
    )
  }

  const parkingSpacesValue =
    body.parkingSpaces === "" ||
    body.parkingSpaces === null ||
    body.parkingSpaces === undefined
      ? null
      : Number(body.parkingSpaces)

  const parkingSpaces =
    parkingSpacesValue !== null &&
    Number.isInteger(parkingSpacesValue) &&
    parkingSpacesValue >= 0
      ? parkingSpacesValue
      : null

  const hasAirportShuttle =
    body.hasAirportShuttle === true ||
    body.hasAirportShuttle === "yes"
      ? true
      : body.hasAirportShuttle === false ||
          body.hasAirportShuttle === "no"
        ? false
        : null

  const [createdLead] = await db
    .insert(leads)
    .values({
      clientId: client.id,
      firstName,
      lastName,
      email,
      phone: textValue(body.phone, 40) || null,
      companyName:
        textValue(body.companyName, 255) || null,
      parkingSpaces,
      hasAirportShuttle,
      shuttleServiceWork:
        textValue(body.shuttleServiceWork, 255) ||
        null,
      averageDailyParkingRate:
        textValue(
          body.averageDailyParkingRate,
          30,
        ).replace(/[$,]/g, "") || null,
      sourcePage:
        textValue(body.sourcePage, 255) || null,
      sourcePageUrl:
        textValue(body.sourcePageUrl, 1000) ||
        null,
      comments:
        textValue(body.comments, 5000) || null,
      status: "new",
    })
    .returning({ id: leads.id })

  return Response.json(
    {
      success: true,
      leadId: createdLead.id,
    },
    {
      status: 201,
      headers: corsHeaders(origin),
    },
  )
}