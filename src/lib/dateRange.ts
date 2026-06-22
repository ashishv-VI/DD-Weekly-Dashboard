import { subDays, subMonths, startOfQuarter, startOfYear, format } from "date-fns"

export function getDateRange(range: string): { startDate: string; endDate: string } {
  const today = new Date()
  const end = format(today, "yyyy-MM-dd")

  switch (range) {
    case "7d":
      return { startDate: format(subDays(today, 7), "yyyy-MM-dd"), endDate: end }
    case "30d":
      return { startDate: format(subDays(today, 30), "yyyy-MM-dd"), endDate: end }
    case "90d":
      return { startDate: format(subDays(today, 90), "yyyy-MM-dd"), endDate: end }
    case "quarter":
      return { startDate: format(startOfQuarter(today), "yyyy-MM-dd"), endDate: end }
    case "year":
      return { startDate: format(startOfYear(today), "yyyy-MM-dd"), endDate: end }
    default:
      return { startDate: format(subDays(today, 30), "yyyy-MM-dd"), endDate: end }
  }
}
