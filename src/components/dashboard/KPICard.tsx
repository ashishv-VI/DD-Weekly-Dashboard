import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { formatNumber, formatPercent, calcChange } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: number | string
  prevValue?: number
  format?: "number" | "percent" | "position" | "currency" | "raw"
  suffix?: string
  prefix?: string
  invertTrend?: boolean
  loading?: boolean
}

export function KPICard({ title, value, prevValue, format = "number", suffix, prefix, invertTrend, loading }: KPICardProps) {
  const numValue = typeof value === "number" ? value : 0
  const change = prevValue !== undefined ? calcChange(numValue, prevValue) : null

  const displayValue = () => {
    if (loading) return "—"
    if (typeof value === "string") return value
    switch (format) {
      case "percent": return formatPercent(numValue)
      case "position": return numValue.toFixed(1)
      case "currency": return `$${formatNumber(numValue)}`
      default: return formatNumber(numValue)
    }
  }

  const trendPositive = change !== null ? (invertTrend ? change < 0 : change > 0) : null

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
        {title}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {prefix}{displayValue()}{suffix}
          </div>
          {change !== null && !loading && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trendPositive ? "text-green-600" : change === 0 ? "text-gray-400" : "text-red-500"}`}>
              {change === 0 ? (
                <Minus size={13} />
              ) : trendPositive ? (
                <TrendingUp size={13} />
              ) : (
                <TrendingDown size={13} />
              )}
              <span>{Math.abs(change).toFixed(1)}% vs prev period</span>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="h-2 rounded animate-pulse" style={{ background: "var(--muted)", width: "60%" }} />
      )}
    </div>
  )
}
