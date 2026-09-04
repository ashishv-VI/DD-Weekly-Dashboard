"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import type { Lead } from "@/types/lead"

export default function ClientLeadsPage() {
  const router = useRouter()

  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<
    string | null
  >(null)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(
        "/api/client/leads",
        {
          method: "GET",
          cache: "no-store",
        },
      )

      const result = await response.json()

      console.log(
        "Response status:",
        response.status,
      )
      console.log("Lead API data:", result)

      if (response.status === 401) {
        router.push("/client/login")
        return
      }

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to load leads.",
        )
      }

      const leadRecords: Lead[] = Array.isArray(
        result,
      )
        ? result
        : result.leads ?? []

      setLeads(leadRecords)
    } catch (loadError) {
      console.error(
        "Load leads error:",
        loadError,
      )

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load leads.",
      )
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void loadLeads()
  }, [loadLeads])

  const filteredLeads = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase()

    if (!searchValue) {
      return leads
    }

    return leads.filter((lead) => {
      const searchableValues = [
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.phone,
        lead.companyName,
        lead.status,
        lead.sourcePage,
      ]

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(searchValue),
      )
    })
  }, [leads, search])

  async function deleteLead(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lead?",
    )

    if (!confirmed) {
      return
    }

    setDeletingId(id)
    setError("")

    try {
      const response = await fetch(
        `/api/client/leads/${id}`,
        {
          method: "DELETE",
        },
      )

      const result = await response
        .json()
        .catch(() => ({}))

      if (response.status === 401) {
        router.push("/client/login")
        return
      }

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to delete lead.",
        )
      }

      setLeads((currentLeads) =>
        currentLeads.filter(
          (lead) => lead.id !== id,
        ),
      )
    } catch (deleteError) {
      console.error(
        "Delete lead error:",
        deleteError,
      )

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete lead.",
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Leads
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View and manage website enquiries.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/client/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back to Dashboard
            </Link>

            <button
              type="button"
              onClick={() => void loadLeads()}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <a
              href="/api/client/leads/export"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Export All Leads
            </a>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Search and total */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by name, email, company or status"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition-colors focus:border-blue-500 sm:max-w-md"
            />

            <div className="text-sm text-slate-500">
              Total leads:{" "}
              <span className="font-semibold text-slate-900">
                {filteredLeads.length}
              </span>
            </div>
          </div>
        </div>

        {/* Leads table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading leads...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-10 text-center">
              <h2 className="font-semibold text-slate-700">
                No leads found
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Submitted leads will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contact
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Company
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Parking Spaces
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Source
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {lead.firstName}{" "}
                          {lead.lastName}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <a
                          href={`mailto:${lead.email}`}
                          className="block text-sm text-blue-600 hover:underline"
                        >
                          {lead.email}
                        </a>

                        <div className="mt-0.5 text-xs text-slate-500">
                          {lead.phone || "No phone"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-700">
                        {lead.companyName || "—"}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-700">
                        {lead.parkingSpaces ?? "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            lead.status === "new"
                              ? "bg-blue-100 text-blue-700"
                              : lead.status ===
                                  "contacted"
                                ? "bg-amber-100 text-amber-700"
                                : lead.status ===
                                    "qualified"
                                  ? "bg-purple-100 text-purple-700"
                                  : lead.status ===
                                      "closed"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700">
                          {lead.sourcePage || "—"}
                        </div>

                        {lead.sourcePageUrl && (
                          <a
                            href={lead.sourcePageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 block max-w-40 truncate text-xs text-blue-600 hover:underline"
                          >
                            Open page
                          </a>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {lead.createdAt
                          ? new Date(
                              lead.createdAt,
                            ).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-3 text-sm">
                          <Link
                            href={`/client/leads/${lead.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            View
                          </Link>

                          <Link
                            href={`/client/leads/${lead.id}/edit`}
                            className="font-medium text-amber-600 hover:underline"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            disabled={
                              deletingId === lead.id
                            }
                            onClick={() =>
                              void deleteLead(lead.id)
                            }
                            className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === lead.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}