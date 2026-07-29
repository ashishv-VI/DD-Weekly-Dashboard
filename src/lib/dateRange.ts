import { subDays, subMonths, startOfQuarter, startOfYear, startOfMonth, endOfMonth, format } from "date-fns"

export function getDateRange(range: string): { startDate: string; endDate: string } {
  const today = new Date()
  const end = format(today, "yyyy-MM-dd")

  switch (range) {
    case "7d":
      return { startDate: format(subDays(today, 7), "yyyy-MM-dd"), endDate: end }
    case "28d":
      return { startDate: format(subDays(today, 28), "yyyy-MM-dd"), endDate: end }
    case "30d":
      return { startDate: format(subDays(today, 30), "yyyy-MM-dd"), endDate: end }
    case "90d":
      return { startDate: format(subDays(today, 90), "yyyy-MM-dd"), endDate: end }
    case "quarter":
      return { startDate: format(startOfQuarter(today), "yyyy-MM-dd"), endDate: end }
    case "year":
      return { startDate: format(startOfYear(today), "yyyy-MM-dd"), endDate: end }
    case "thisMonth":
      return { startDate: format(startOfMonth(today), "yyyy-MM-dd"), endDate: end }
    case "lastMonth": {
      const lastMonth = subMonths(today, 1)
      return {
        startDate: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        endDate: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      }
    }
    default:
      return { startDate: format(subDays(today, 30), "yyyy-MM-dd"), endDate: end }
  }
}

export const DATE_PRESETS = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 28 days", value: "28d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "This month", value: "thisMonth" },
  { label: "Last month", value: "lastMonth" },
] as const
