"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { format, parseISO } from "date-fns"

interface Series {
  key: string
  label: string
  color: string
}

interface TrendChartProps {
  data: Record<string, string | number>[]
  series: Series[]
  height?: number
  formatY?: (v: number) => string
}

function formatDate(dateStr: string) {
  try {
    const cleaned = dateStr.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
    return format(parseISO(cleaned), "MMM d")
  } catch {
    return dateStr
  }
}

function formatK(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return v.toString()
}

export function TrendChart({ data, series, height = 240, formatY = formatK }: TrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm" style={{ height, color: "var(--muted-foreground)" }}>
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatY}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: 12,
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
          labelFormatter={(label) => formatDate(String(label))}
          formatter={(v, name) => [formatK(Number(v ?? 0)), String(name)]}
        />
        {series.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#64748b" }}
            iconType="circle"
            iconSize={8}
          />
        )}
        {series.map(({ key, label, color }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
