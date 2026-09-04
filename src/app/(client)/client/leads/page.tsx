"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import type { Lead } from "@/types/lead"

export default function ClientLeadsPage() {
  const router = useRouter()

  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadLeads() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/client/leads", {
        cache: "no-store",
      })

      if (response.status === 401) {
        router.push("/client/login")
        return
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to load leads.",
        )
      }

      console.log(response);
      
      setLeads(result.leads)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load leads.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [])

  const filteredLeads = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) {
      return leads
    }

    return leads.filter((lead) =>
      [
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.phone,
        lead.companyName,
        lead.status,
      ].some((field) =>
        String(field ?? "")
          .toLowerCase()
          .includes(value),
      ),
    )
  }, [leads, search])

  async function deleteLead(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lead?",
    )

    if (!confirmed) {
      return
    }

    const response = await fetch(
      `/api/client/leads/${id}`,
      {
        method: "DELETE",
      },
    )

    const result = await response.json()

    if (!response.ok) {
      window.alert(
        result.error ?? "Unable to delete lead.",
      )
      return
    }

    setLeads((current) =>
      current.filter((lead) => lead.id !== id),
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Leads
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View and manage website enquiries.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/client/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium"
            >
              Dashboard
            </Link>

            <a
              href="/api/client/leads/export"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Export all leads
            </a>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by name, email, company or status"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Loading leads...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No leads found.
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                      {lead.firstName} {lead.lastName}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <div>{lead.email}</div>
                      <div className="text-slate-500">
                        {lead.phone || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {lead.companyName || "—"}
                    </td>

                    <td className="px-4 py-3 text-sm capitalize">
                      {lead.status}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {new Date(
                        lead.createdAt,
                      ).toLocaleDateString()}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/client/leads/${lead.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </Link>

                        <Link
                          href={`/client/leads/${lead.id}/edit`}
                          className="text-amber-600 hover:underline"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            deleteLead(lead.id)
                          }
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}