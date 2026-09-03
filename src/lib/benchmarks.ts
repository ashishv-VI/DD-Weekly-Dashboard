/**
 * Weekly Performance Benchmark Calculator
 *
 * Monthly targets are prorated to the reporting window using PRORATION_FACTOR.
 * Rate metrics (CTR) are never prorated — they apply equally to any window.
 *
 * To switch to a 14-day window: change REPORTING_WINDOW_DAYS to 14.
 * To update targets per client: edit MONTHLY_BENCHMARKS below.
 */

// ─── Window & Proration ───────────────────────────────────────────────────────

/** Days in the current reporting window (default: 7) */
export const REPORTING_WINDOW_DAYS = 7

/** Canonical number of days in a month, used as the proration denominator */
export const MONTHLY_PERIOD_DAYS = 30

/**
 * Converts a monthly percentage target into a reporting-window target.
 * Example (7-day): 10% monthly → 10 × (7/30) = 2.33%
 */
export const PRORATION_FACTOR = REPORTING_WINDOW_DAYS / MONTHLY_PERIOD_DAYS

// ─── Benchmark Config ─────────────────────────────────────────────────────────

/**
 * Monthly benchmark targets.
 *
 * type "growth"  → will be prorated to REPORTING_WINDOW_DAYS
 * type "rate"    → used as-is against any window (no proration)
 *
 * Values are percentages (e.g. 10 = 10%).
 */
export const MONTHLY_BENCHMARKS = {
  trafficGrowth: {
    type: "growth" as const,
    /** Minimum acceptable monthly session growth (%) */
    target: 10,
  },
  visitorGrowth: {
    type: "growth" as const,
    /** Lower bound of the acceptable monthly unique-visitor growth range (%) */
    targetMin: 40,
    /** Upper bound — exceeding this is "above range" but still a pass */
    targetMax: 50,
  },
  ctr: {
    type: "rate" as const,
    /** CTR below this value is under-performing */
    targetMin: 2,
    /** CTR above this value is over-shooting the expected band */
    targetMax: 4,
  },
} as const

// ─── Derived 7-day Targets (for reference / display) ──────────────────────────

export const DERIVED_TARGETS = {
  trafficGrowth: {
    target: MONTHLY_BENCHMARKS.trafficGrowth.target * PRORATION_FACTOR,
  },
  visitorGrowth: {
    targetMin: MONTHLY_BENCHMARKS.visitorGrowth.targetMin * PRORATION_FACTOR,
    targetMax: MONTHLY_BENCHMARKS.visitorGrowth.targetMax * PRORATION_FACTOR,
  },
  ctr: {
    targetMin: MONTHLY_BENCHMARKS.ctr.targetMin,
    targetMax: MONTHLY_BENCHMARKS.ctr.targetMax,
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Fine-grained result status — more expressive than a boolean alone */
export type BenchmarkStatus =
  | "achieved"      // at or above target (for growth) / within range (for rate)
  | "above_range"   // exceeded the upper bound of the target range
  | "below_target"  // below the minimum acceptable value
  | "no_data"       // previous period is zero — cannot compute growth

export interface BenchmarkResult {
  /** Human-readable metric name */
  metric: string
  /** Computed value for this reporting window (%) */
  currentValue: number
  /** The window-adjusted benchmark shown to users */
  benchmark: {
    /** Single-point target (growth metrics with one target) */
    target?: number
    /** Lower bound of an acceptable range */
    min?: number
    /** Upper bound of an acceptable range */
    max?: number
  }
  /** True when the metric meets or exceeds the minimum acceptable threshold */
  achieved: boolean
  /** Detailed status for UI rendering */
  status: BenchmarkStatus
  /**
   * Signed distance from the primary target:
   *   positive → above target / lower-bound of range
   *   negative → below target / lower-bound of range
   *   0        → when previous period was zero (no_data)
   */
  delta: number
}

// ─── Individual Calculators ───────────────────────────────────────────────────

/**
 * Traffic Growth: session count growth over the reporting window.
 * Benchmark is prorated from the monthly target using PRORATION_FACTOR.
 *
 * Pass condition: growth % >= prorated target
 */
export function calcTrafficGrowthBenchmark(
  currentSessions: number,
  previousSessions: number
): BenchmarkResult {
  const target = MONTHLY_BENCHMARKS.trafficGrowth.target * PRORATION_FACTOR

  if (previousSessions === 0) {
    return {
      metric: "Traffic Growth",
      currentValue: 0,
      benchmark: { target },
      achieved: false,
      status: "no_data",
      delta: 0,
    }
  }

  const currentValue = ((currentSessions - previousSessions) / previousSessions) * 100
  const achieved = currentValue >= target
  const delta = currentValue - target

  return {
    metric: "Traffic Growth",
    currentValue,
    benchmark: { target },
    achieved,
    status: achieved ? "achieved" : "below_target",
    delta,
  }
}

/**
 * Visitor Growth: unique-visitor count growth over the reporting window.
 * Benchmark range is prorated from the monthly range using PRORATION_FACTOR.
 *
 * Pass condition: growth % >= prorated targetMin (within OR above range)
 * — exceeding the upper bound is still a pass (growth is desirable).
 * Delta is measured against the lower bound.
 */
export function calcVisitorGrowthBenchmark(
  currentVisitors: number,
  previousVisitors: number
): BenchmarkResult {
  const targetMin = MONTHLY_BENCHMARKS.visitorGrowth.targetMin * PRORATION_FACTOR
  const targetMax = MONTHLY_BENCHMARKS.visitorGrowth.targetMax * PRORATION_FACTOR

  if (previousVisitors === 0) {
    return {
      metric: "Visitor Growth",
      currentValue: 0,
      benchmark: { min: targetMin, max: targetMax },
      achieved: false,
      status: "no_data",
      delta: 0,
    }
  }

  const currentValue = ((currentVisitors - previousVisitors) / previousVisitors) * 100
  const achieved = currentValue >= targetMin
  const delta = currentValue - targetMin

  let status: BenchmarkStatus
  if (currentValue < targetMin) status = "below_target"
  else if (currentValue > targetMax) status = "above_range"
  else status = "achieved"

  return {
    metric: "Visitor Growth",
    currentValue,
    benchmark: { min: targetMin, max: targetMax },
    achieved,
    status,
    delta,
  }
}

/**
 * CTR: clicks ÷ impressions — a rate metric, never prorated.
 * The same [2%, 4%] band applies to any reporting window.
 *
 * Pass condition: CTR is strictly within [targetMin, targetMax].
 * Above 4% is "above_range" (achieved: false per spec — the band is the goal).
 * Delta is:
 *   below min → distance to min (negative)
 *   in range  → distance above min (positive, showing headroom used)
 *   above max → distance above max (positive, showing overshoot)
 */
export function calcCTRBenchmark(
  totalClicks: number,
  totalImpressions: number
): BenchmarkResult {
  const { targetMin, targetMax } = MONTHLY_BENCHMARKS.ctr

  if (totalImpressions === 0) {
    return {
      metric: "CTR",
      currentValue: 0,
      benchmark: { min: targetMin, max: targetMax },
      achieved: false,
      status: "no_data",
      delta: 0,
    }
  }

  const currentValue = (totalClicks / totalImpressions) * 100
  const achieved = currentValue >= targetMin && currentValue <= targetMax

  let status: BenchmarkStatus
  let delta: number
  if (currentValue < targetMin) {
    status = "below_target"
    delta = currentValue - targetMin           // negative
  } else if (currentValue > targetMax) {
    status = "above_range"
    delta = currentValue - targetMax           // positive (overshoot)
  } else {
    status = "achieved"
    delta = currentValue - targetMin           // positive (headroom above min)
  }

  return {
    metric: "CTR",
    currentValue,
    benchmark: { min: targetMin, max: targetMax },
    achieved,
    status,
    delta,
  }
}

// ─── Composite Entry Point ────────────────────────────────────────────────────

export interface WeeklyBenchmarkInput {
  /** 7-day session counts */
  traffic: { current: number; previous: number }
  /** 7-day unique visitor counts */
  visitors: { current: number; previous: number }
  /** 7-day click and impression totals */
  ctr: { clicks: number; impressions: number }
}

export interface WeeklyBenchmarkOutput {
  trafficGrowth: BenchmarkResult
  visitorGrowth: BenchmarkResult
  ctr: BenchmarkResult
  /** Reporting window used for proration */
  windowDays: number
  /** Proration factor applied to growth metrics */
  prorationFactor: number
}

/**
 * Calculates all three weekly benchmarks in one call.
 *
 * @example
 * const results = calcWeeklyBenchmarks({
 *   traffic:  { current: 1050, previous: 1000 },
 *   visitors: { current: 1120, previous: 1000 },
 *   ctr:      { clicks: 350,   impressions: 10000 },
 * })
 */
export function calcWeeklyBenchmarks(input: WeeklyBenchmarkInput): WeeklyBenchmarkOutput {
  return {
    trafficGrowth: calcTrafficGrowthBenchmark(input.traffic.current, input.traffic.previous),
    visitorGrowth: calcVisitorGrowthBenchmark(input.visitors.current, input.visitors.previous),
    ctr: calcCTRBenchmark(input.ctr.clicks, input.ctr.impressions),
    windowDays: REPORTING_WINDOW_DAYS,
    prorationFactor: PRORATION_FACTOR,
  }
}
