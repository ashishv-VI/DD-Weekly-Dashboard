"use client"

import Link from "next/link"
import {
  useParams,
  useRouter,
} from "next/navigation"
import {
  type FormEvent,
  useEffect,
  useState,
} from "react"

import type {
  Lead,
  LeadStatus,
} from "@/types/lead"

type LeadForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  companyName: string
  parkingSpaces: string
  hasAirportShuttle: "" | "yes" | "no"
  shuttleServiceWork: string
  averageDailyParkingRate: string
  status: LeadStatus
  sourcePage: string
  sourcePageUrl: string
  comments: string
  adminNotes: string
}

const initialForm: LeadForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  companyName: "",
  parkingSpaces: "",
  hasAirportShuttle: "",
  shuttleServiceWork: "",
  averageDailyParkingRate: "",
  status: "new",
  sourcePage: "",
  sourcePageUrl: "",
  comments: "",
  adminNotes: "",
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"

export default function EditLeadPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const id = params.id

  const [form, setForm] =
    useState<LeadForm>(initialForm)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

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

        const lead = result.lead as Lead

        setForm({
          firstName: lead.firstName ?? "",
          lastName: lead.lastName ?? "",
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          companyName:
            lead.companyName ?? "",
          parkingSpaces:
            lead.parkingSpaces === null
              ? ""
              : String(lead.parkingSpaces),
          hasAirportShuttle:
            lead.hasAirportShuttle === null
              ? ""
              : lead.hasAirportShuttle
                ? "yes"
                : "no",
          shuttleServiceWork:
            lead.shuttleServiceWork ?? "",
          averageDailyParkingRate:
            lead.averageDailyParkingRate ??
            "",
          status: lead.status,
          sourcePage:
            lead.sourcePage ?? "",
          sourcePageUrl:
            lead.sourcePageUrl ?? "",
          comments: lead.comments ?? "",
          adminNotes:
            lead.adminNotes ?? "",
        })
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

  function updateField<
    Key extends keyof LeadForm,
  >(field: Key, value: LeadForm[Key]) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setSaving(true)
    setError("")

    try {
      const response = await fetch(
        `/api/client/leads/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...form,
            parkingSpaces:
              form.parkingSpaces === ""
                ? null
                : Number(
                    form.parkingSpaces,
                  ),
            hasAirportShuttle:
              form.hasAirportShuttle ===
              ""
                ? null
                : form.hasAirportShuttle ===
                    "yes",
            averageDailyParkingRate:
              form.averageDailyParkingRate
                .replace(/[$,\s]/g, ""),
          }),
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
          result.error ??
            "Unable to update lead.",
        )
      }

      router.push(
        `/client/leads/${id}`,
      )

      router.refresh()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update lead.",
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Loading lead...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Edit Lead
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Update lead information and
              admin notes.
            </p>
          </div>

          <Link
            href={`/client/leads/${id}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                First Name *
              </span>

              <input
                type="text"
                required
                value={form.firstName}
                onChange={(event) =>
                  updateField(
                    "firstName",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Last Name *
              </span>

              <input
                type="text"
                required
                value={form.lastName}
                onChange={(event) =>
                  updateField(
                    "lastName",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Email *
              </span>

              <input
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  updateField(
                    "email",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone
              </span>

              <input
                type="text"
                value={form.phone}
                onChange={(event) =>
                  updateField(
                    "phone",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Company Name
              </span>

              <input
                type="text"
                value={form.companyName}
                onChange={(event) =>
                  updateField(
                    "companyName",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Parking Spaces
              </span>

              <input
                type="number"
                min="0"
                value={form.parkingSpaces}
                onChange={(event) =>
                  updateField(
                    "parkingSpaces",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">
                Do you have a shuttle to
                the airport?
              </legend>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="hasAirportShuttle"
                    checked={
                      form.hasAirportShuttle ===
                      "yes"
                    }
                    onChange={() =>
                      updateField(
                        "hasAirportShuttle",
                        "yes",
                      )
                    }
                  />
                  Yes
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="hasAirportShuttle"
                    checked={
                      form.hasAirportShuttle ===
                      "no"
                    }
                    onChange={() =>
                      updateField(
                        "hasAirportShuttle",
                        "no",
                      )
                    }
                  />
                  No
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">
                How does your shuttle
                service work?
              </legend>

              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="shuttleServiceWork"
                    value="Do customers call the hotel to request a shuttle?"
                    checked={
                      form.shuttleServiceWork ===
                      "Do customers call the hotel to request a shuttle?"
                    }
                    onChange={(event) =>
                      updateField(
                        "shuttleServiceWork",
                        event.target.value,
                      )
                    }
                  />

                  <span>
                    Do customers call the
                    hotel to request a
                    shuttle?
                  </span>
                </label>

                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="shuttleServiceWork"
                    value="Is the shuttle customer-initiated?"
                    checked={
                      form.shuttleServiceWork ===
                      "Is the shuttle customer-initiated?"
                    }
                    onChange={(event) =>
                      updateField(
                        "shuttleServiceWork",
                        event.target.value,
                      )
                    }
                  />

                  <span>
                    Is the shuttle
                    customer-initiated?
                  </span>
                </label>
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Average Daily Parking Rate
              </span>

              <input
                type="text"
                inputMode="decimal"
                placeholder="$0.00"
                value={
                  form.averageDailyParkingRate
                }
                onChange={(event) =>
                  updateField(
                    "averageDailyParkingRate",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Lead Status
              </span>

              <select
                value={form.status}
                onChange={(event) =>
                  updateField(
                    "status",
                    event.target
                      .value as LeadStatus,
                  )
                }
                className={inputClass}
              >
                <option value="new">
                  New
                </option>

                <option value="contacted">
                  Contacted
                </option>

                <option value="qualified">
                  Qualified
                </option>

                <option value="closed">
                  Closed
                </option>

                <option value="lost">
                  Lost
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Source Page
              </span>

              <input
                type="text"
                value={form.sourcePage}
                onChange={(event) =>
                  updateField(
                    "sourcePage",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Source Page URL
              </span>

              <input
                type="url"
                value={form.sourcePageUrl}
                onChange={(event) =>
                  updateField(
                    "sourcePageUrl",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Comments
            </span>

            <textarea
              rows={4}
              value={form.comments}
              onChange={(event) =>
                updateField(
                  "comments",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </label>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Admin Notes
            </span>

            <textarea
              rows={5}
              value={form.adminNotes}
              onChange={(event) =>
                updateField(
                  "adminNotes",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </label>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <Link
              href={`/client/leads/${id}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}