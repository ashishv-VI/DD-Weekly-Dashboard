"use client"

import type { BenchmarkResult, BenchmarkStatus } from "@/lib/benchmarks"

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BenchmarkStatus,
  { label: string; badgeClass: string; icon: string }
> = {
  achieved:     { label: "On Target",    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",  icon: "✓" },
  above_range:  { label: "Above Range",  badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",    icon: "↑" },
  below_target: { label: "Below Target", badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",        icon: "↓" },
  no_data:      { label: "No Data",      badgeClass: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",   icon: "—" },
}

function fmt(n: number, dp = 2) {
  return n.toFixed(dp)
}

function benchmarkLabel(b: BenchmarkResult["benchmark"]): string {
  if (b.target !== undefined) return `≥ ${fmt(b.target)}%`
  if (b.min !== undefined && b.max !== undefined) return `${fmt(b.min)}% – ${fmt(b.max)}%`
  return "—"
}

function deltaLabel(result: BenchmarkResult): string {
  if (result.status === "no_data") return "—"
  const sign = result.delta >= 0 ? "+" : ""
  return `${sign}${fmt(result.delta)}%`
}

// ─── Single Row ───────────────────────────────────────────────────────────────

function BenchmarkRow({ result }: { result: BenchmarkResult }) {
  const cfg = STATUS_CONFIG[result.status]

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0 border-slate-100 dark:border-slate-800">
      {/* Metric name */}
      <div className="w-36 shrink-0">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {result.metric}
        </span>
      </div>

      {/* Current value */}
      <div className="w-20 text-right tabular-nums">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          {result.status === "no_data" ? "—" : `${fmt(result.currentValue)}%`}
        </span>
      </div>

      {/* Required benchmark */}
      <div className="w-28 text-right tabular-nums text-xs text-slate-500 dark:text-slate-400">
        {benchmarkLabel(result.benchmark)}
      </div>

      {/* Delta */}
      <div
        className={`w-16 text-right tabular-nums text-xs font-semibold ${
          result.status === "no_data"
            ? "text-slate-400"
            : result.delta >= 0
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {deltaLabel(result)}
      </div>

      {/* Status badge */}
      <div className="ml-auto">
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}
        >
          <span>{cfg.icon}</span>
          {cfg.label}
        </span>
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export interface WeeklyBenchmarkCardProps {
  trafficGrowth: BenchmarkResult
  visitorGrowth: BenchmarkResult
  ctr: BenchmarkResult
  /** e.g. "19 Aug – 25 Aug 2026" */
  windowLabel?: string
  /** Reporting window size in days (default 7) */
  windowDays?: number
}

export function WeeklyBenchmarkCard({
  trafficGrowth,
  visitorGrowth,
  ctr,
  windowLabel,
  windowDays = 7,
}: WeeklyBenchmarkCardProps) {
  const results = [trafficGrowth, visitorGrowth, ctr]
  const passed = results.filter((r) => r.achieved).length
  const total = results.length

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {windowDays}-Day Benchmarks
          </h3>
          {windowLabel && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{windowLabel}</p>
          )}
        </div>

        {/* Summary pill */}
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            passed === total
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              : passed > 0
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          }`}
        >
          {passed}/{total} targets met
        </span>
      </div>

      {/* Column headings */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-1">
        <div className="w-36 shrink-0 text-xs text-slate-400 uppercase tracking-wide">Metric</div>
        <div className="w-20 text-right text-xs text-slate-400 uppercase tracking-wide">Current</div>
        <div className="w-28 text-right text-xs text-slate-400 uppercase tracking-wide">Target</div>
        <div className="w-16 text-right text-xs text-slate-400 uppercase tracking-wide">Delta</div>
        <div className="ml-auto text-xs text-slate-400 uppercase tracking-wide">Status</div>
      </div>

      {/* Rows */}
      <div className="px-5">
        {results.map((r) => (
          <BenchmarkRow key={r.metric} result={r} />
        ))}
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Growth targets prorated from monthly benchmarks (Traffic 10%, Visitors 40–50%).
          CTR target [2%–4%] applies directly to any window.
        </p>
      </div>
    </div>
  )
}
