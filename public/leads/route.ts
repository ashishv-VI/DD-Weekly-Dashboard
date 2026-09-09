import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import {
  clients,
  leads,
} from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RequestBody = Record<string, unknown>

function textValue(
  value: unknown,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim().slice(0, maxLength)
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "")
}

function getAllowedOrigins(): Set<string> {
  const configuredOrigins =
    process.env.ALLOWED_LEAD_ORIGINS ??
    process.env.ALLOWED_ORIGINS ??
    ""

  return new Set(
    configuredOrigins
      .split(",")
      .map(normalizeOrigin)
      .filter(Boolean),
  )
}

function getCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods":
      "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}

function parseParkingSpaces(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  ) {
    return value
  }

  if (typeof value !== "string") {
    return null
  }

  // Allows values such as "100", "1,000" or "100+".
  const cleaned = value
    .trim()
    .replace(/,/g, "")

  const match = cleaned.match(/\d+/)

  if (!match) {
    return null
  }

  const parsedValue = Number.parseInt(
    match[0],
    10,
  )

  return Number.isInteger(parsedValue) &&
    parsedValue >= 0
    ? parsedValue
    : null
}

function parseShuttleValue(
  value: unknown,
): boolean | null {
  if (value === true || value === false) {
    return value
  }

  if (typeof value !== "string") {
    return null
  }

  const normalizedValue = value
    .trim()
    .toLowerCase()

  if (
    normalizedValue === "yes" ||
    normalizedValue === "true"
  ) {
    return true
  }

  if (
    normalizedValue === "no" ||
    normalizedValue === "false"
  ) {
    return false
  }

  return null
}

function parseParkingRate(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null
  }

  const cleaned = String(value)
    .trim()
    .replace(/[$,\s]/g, "")

  if (!cleaned) {
    return null
  }

  // Allows values such as 20, 20.5 and 20.50.
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null
  }

  return cleaned
}

export function OPTIONS(request: Request) {
  const origin = normalizeOrigin(
    request.headers.get("origin") ?? "",
  )

  const allowedOrigins = getAllowedOrigins()

  if (
    !origin ||
    !allowedOrigins.has(origin)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Origin not allowed",
      },
      { status: 403 },
    )
  }

  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

export async function POST(request: Request) {
  const origin = normalizeOrigin(
    request.headers.get("origin") ?? "",
  )

  const allowedOrigins = getAllowedOrigins()

  if (
    !origin ||
    !allowedOrigins.has(origin)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Origin not allowed",
      },
      { status: 403 },
    )
  }

  const corsHeaders = getCorsHeaders(origin)

  try {
    let body: RequestBody

    try {
      body = (await request.json()) as RequestBody
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      )
    }

    const clientSlug = textValue(
      body.clientSlug,
      100,
    ).toLowerCase()

    const firstName = textValue(
      body.firstName,
      100,
    )

    const lastName = textValue(
      body.lastName,
      100,
    )

    const email = textValue(
      body.email,
      255,
    ).toLowerCase()

    if (!clientSlug) {
      return NextResponse.json(
        {
          success: false,
          error: "Client slug is required",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      )
    }

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "First name, last name and email are required",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      )
    }

    const validEmail =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )

    if (!validEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please provide a valid email address",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      )
    }

    /*
     * Find the client using clientSlug.
     * For the KodaCars form, clientSlug must be
     * "kodacars".
     */
    const [client] = await db
      .select({
        id: clients.id,
        name: clients.name,
        slug: clients.slug,
        status: clients.status,
        leadsEnabled: clients.leadsEnabled,
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
      console.error(
        "Public lead client not found:",
        clientSlug,
      )

      return NextResponse.json(
        {
          success: false,
          error:
            "Client not found or leads are not enabled",
        },
        {
          status: 404,
          headers: corsHeaders,
        },
      )
    }

    const phone =
      textValue(body.phone, 40) || null

    const companyName =
      textValue(body.companyName, 255) ||
      null

    const parkingSpaces =
      parseParkingSpaces(body.parkingSpaces)

    const hasAirportShuttle =
      parseShuttleValue(
        body.hasAirportShuttle,
      )

    const shuttleServiceWork =
      textValue(
        body.shuttleServiceWork,
        500,
      ) || null

    const averageDailyParkingRate =
      parseParkingRate(
        body.averageDailyParkingRate,
      )

    const sourcePage =
      textValue(body.sourcePage, 255) ||
      null

    const sourcePageUrl =
      textValue(body.sourcePageUrl, 1000) ||
      null

    const comments =
      textValue(body.comments, 5000) ||
      null

    /*
     * This query actually inserts the lead.
     * The "await" is required.
     */
    const [createdLead] = await db
      .insert(leads)
      .values({
        clientId: client.id,
        firstName,
        lastName,
        email,
        phone,
        companyName,
        parkingSpaces,
        hasAirportShuttle,
        shuttleServiceWork,
        averageDailyParkingRate,
        status: "new",
        sourcePage,
        sourcePageUrl,
        comments,
        adminNotes: null,
      })
      .returning({
        id: leads.id,
        clientId: leads.clientId,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        createdAt: leads.createdAt,
      })

    if (!createdLead) {
      console.error(
        "Database did not return the created lead",
      )

      return NextResponse.json(
        {
          success: false,
          error: "Lead was not saved",
        },
        {
          status: 500,
          headers: corsHeaders,
        },
      )
    }

    console.log(
      "Created lead:",
      createdLead,
    )

    return NextResponse.json(
      {
        success: true,
        id: createdLead.id,
        clientId: createdLead.clientId,
        lead: createdLead,
      },
      {
        status: 201,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store",
        },
      },
    )
  } catch (error) {
    console.error(
      "Public lead API error:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error: "Unable to save lead",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    )
  }
}