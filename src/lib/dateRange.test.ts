import { afterEach, describe, expect, it, vi } from "vitest"
import { getDateRange } from "./dateRange"

describe("getDateRange all available", () => {
  afterEach(() => vi.useRealTimers())

  it("covers the current month and the previous 15 calendar months", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 7, 12))

    expect(getDateRange("all")).toEqual({
      startDate: "2025-07-01",
      endDate: "2026-10-07",
    })
  })
})