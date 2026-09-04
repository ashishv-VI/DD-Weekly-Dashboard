"use client"

import Link from "next/link"
import {
  useParams,
  useRouter,
} from "next/navigation"
import {
  useEffect,
  useState,
} from "react"

import type { Lead } from "@/types/lead"

function DetailItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="border-b border-slate-100 py-4">
      <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd className="break-words text-sm text-slate-900">
        {value || "—"}
      </dd>
    </div>
  )
}

export default function ViewLeadPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const id = params.id

  const [lead, setLead] =
    useState<Lead | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  useEffect(() => {
    async function loadLead() {
      setLoading(true)
      setError("")

      try {
        const response = await fetch(
          `/api/client/leads/${id}`,
          {
            cache: "no-store",
          },
        )

        const result = await response
          .json()
          .catch(() => ({}))

        console.log(
          "View lead API result:",
          result,
        )

        if (response.status === 401) {
          router.push("/client/login")
          return
        }

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Unable to load lead.",
          )
        }

        setLead(result.lead)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load lead.",
        )
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      void loadLead()
    }
  }, [id, router])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Loading lead...
        </div>
      </main>
    )
  }

  if (error || !lead) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error || "Lead not found."}
          </div>

          <Link
            href="/client/leads"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Back to Leads
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {lead.firstName}{" "}
              {lead.lastName}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Lead details
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/client/leads"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Back
            </Link>

            <Link
              href={`/client/leads/${lead.id}/edit`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Edit Lead
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="grid gap-x-8 md:grid-cols-2">
            <DetailItem
              label="First Name"
              value={lead.firstName}
            />

            <DetailItem
              label="Last Name"
              value={lead.lastName}
            />

            <DetailItem
              label="Email"
              value={
                <a
                  href={`mailto:${lead.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {lead.email}
                </a>
              }
            />

            <DetailItem
              label="Phone"
              value={lead.phone}
            />

            <DetailItem
              label="Company Name"
              value={lead.companyName}
            />

            <DetailItem
              label="Parking Spaces"
              value={lead.parkingSpaces}
            />

            <DetailItem
              label="Airport Shuttle"
              value={
                lead.hasAirportShuttle === null
                  ? "Not provided"
                  : lead.hasAirportShuttle
                    ? "Yes"
                    : "No"
              }
            />

            <DetailItem
              label="Shuttle Service"
              value={lead.shuttleServiceWork}
            />

            <DetailItem
              label="Average Daily Parking Rate"
              value={
                lead.averageDailyParkingRate
                  ? `$${lead.averageDailyParkingRate}`
                  : null
              }
            />

            <DetailItem
              label="Lead Status"
              value={
                <span className="capitalize">
                  {lead.status}
                </span>
              }
            />

            <DetailItem
              label="Source Page"
              value={lead.sourcePage}
            />

            <DetailItem
              label="Submitted On"
              value={new Date(
                lead.createdAt,
              ).toLocaleString()}
            />
          </div>

          <DetailItem
            label="Source Page URL"
            value={
              lead.sourcePageUrl ? (
                <a
                  href={lead.sourcePageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {lead.sourcePageUrl}
                </a>
              ) : null
            }
          />

          <DetailItem
            label="Comments"
            value={
              <p className="whitespace-pre-wrap">
                {lead.comments || "—"}
              </p>
            }
          />

                   <DetailItem
            label="Admin Notes"
            value={
              <p className="whitespace-pre-wrap">
                {lead.adminNotes || "—"}
              </p>
            }
          />
        </div>
      </div>
    </main>
  )
}