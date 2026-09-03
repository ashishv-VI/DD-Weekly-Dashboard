import { describe, it, expect } from "vitest"
import {
  calcTrafficGrowthBenchmark,
  calcVisitorGrowthBenchmark,
  calcCTRBenchmark,
  calcWeeklyBenchmarks,
  PRORATION_FACTOR,
  REPORTING_WINDOW_DAYS,
  MONTHLY_PERIOD_DAYS,
} from "./benchmarks"

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Round to 4 decimal places to avoid floating-point noise in assertions */
const r = (n: number) => Math.round(n * 10000) / 10000

// ─── Constants ────────────────────────────────────────────────────────────────

describe("Proration constants", () => {
  it("PRORATION_FACTOR equals REPORTING_WINDOW_DAYS / MONTHLY_PERIOD_DAYS", () => {
    expect(PRORATION_FACTOR).toBe(REPORTING_WINDOW_DAYS / MONTHLY_PERIOD_DAYS)
  })

  it("7-day proration factor is 7/30 ≈ 0.2333", () => {
    expect(r(PRORATION_FACTOR)).toBe(r(7 / 30))
  })

  it("Traffic 7-day target is 10 × (7/30) ≈ 2.33%", () => {
    const expected = 10 * (7 / 30)
    const result = calcTrafficGrowthBenchmark(1023, 1000)
    expect(r(result.benchmark.target!)).toBe(r(expected))
  })

  it("Visitor 7-day target range is [40×(7/30), 50×(7/30)] ≈ [9.33%, 11.67%]", () => {
    const result = calcVisitorGrowthBenchmark(1100, 1000)
    expect(r(result.benchmark.min!)).toBe(r(40 * (7 / 30)))
    expect(r(result.benchmark.max!)).toBe(r(50 * (7 / 30)))
  })

  it("CTR benchmarks are NOT prorated — always [2%, 4%]", () => {
    const result = calcCTRBenchmark(300, 10000)
    expect(result.benchmark.min).toBe(2)
    expect(result.benchmark.max).toBe(4)
  })
})

// ─── Traffic Growth ───────────────────────────────────────────────────────────

describe("calcTrafficGrowthBenchmark", () => {
  // Target = 10% × (7/30) ≈ 2.333%

  it("on-target: growth exactly at 2.333% → achieved", () => {
    // 1000 × 1.02333... ≈ 1023.33 → use 1023
    const result = calcTrafficGrowthBenchmark(1023, 1000)
    const growth = r(result.currentValue)
    const target = r(result.benchmark.target!)
    // growth is just below target due to integer sessions — verify status
    expect(result.status).toBe("below_target")
    // use exact threshold: 1000 × (1 + 10/30 × 7/30) — simpler: prev × (1 + factor×target)
    // 1000 * (1 + 10*(7/30)/100) = 1000 * 1.023333 = 1023.333 → need 1024 to pass
    const result2 = calcTrafficGrowthBenchmark(1024, 1000)
    expect(result2.achieved).toBe(true)
    expect(result2.status).toBe("achieved")
  })

  it("above-target: 5% growth far exceeds 2.33% target → achieved", () => {
    const result = calcTrafficGrowthBenchmark(1050, 1000)
    expect(r(result.currentValue)).toBe(5)
    expect(result.achieved).toBe(true)
    expect(result.status).toBe("achieved")
    expect(result.delta).toBeGreaterThan(0)
  })

  it("below-target: 1% growth is under 2.33% → not achieved", () => {
    const result = calcTrafficGrowthBenchmark(1010, 1000)
    expect(r(result.currentValue)).toBe(1)
    expect(result.achieved).toBe(false)
    expect(result.status).toBe("below_target")
    expect(result.delta).toBeLessThan(0)
  })

  it("negative growth (traffic declined) → not achieved", () => {
    const result = calcTrafficGrowthBenchmark(900, 1000)
    expect(result.currentValue).toBe(-10)
    expect(result.achieved).toBe(false)
    expect(result.status).toBe("below_target")
    expect(result.delta).toBeLessThan(0)
  })

  it("zero previous period → no_data, achieved: false", () => {
    const result = calcTrafficGrowthBenchmark(500, 0)
    expect(result.achieved).toBe(false)
    expect(result.status).toBe("no_data")
    expect(result.currentValue).toBe(0)
    expect(result.delta).toBe(0)
  })

  it("no change (0% growth) → below target", () => {
    const result = calcTrafficGrowthBenchmark(1000, 1000)
    expect(result.currentValue).toBe(0)
    expect(result.achieved).toBe(false)
    expect(result.status).toBe("below_target")
  })
})

// ─── Visitor Growth ───────────────────────────────────────────────────────────

describe("calcVisitorGrowthBenchmark", () => {
  // Target range = [40×(7/30), 50×(7/30)] ≈ [9.333%, 11.667%]
  // Pass condition: growth >= 9.333% (within OR above range)

  it("within range: 10.5% growth → achieved, status achieved", () => {
    // 1000 → 1105 = 10.5% growth
    const result = calcVisitorGrowthBenchmark(1105, 1000)
    expect(r(result.currentValue)).toBe(10.5)
    expect(result.achieved).toBe(true)
    expect(result.status).toBe("achieved")
    expect(result.delta).toBeGreaterThan(0)
  })

  it("above range: 15% growth → achieved:true, status above_range", () => {
    const result = calcVisitorGrowthBenchmark(1150, 1000)
    expect(r(result.currentValue)).toBe(15)
    expect(result.achieved).toBe(true)        // still a pass — growth is good
    expect(result.status).toBe("above_range")
    expect(result.delta).toBeGreaterThan(0)
  })

  it("below target: 5% growth is under 9.33% → not achieved", () => {
    const result = calcVisitorGrowthBenchmark(1050, 1000)
    expect(r(result.currentValue)).toBe(5)
    expect(result.achieved).toBe(false)
    expect(result.status).toBe("below_target")
    expect(result.delta).toBeLessThan(0)
  })

  it("exactly at lower bound (9.333...%) → achieved", () => {
    // Use the formula in reverse to derive a current value that lands exactly on targetMin.
    // Floating-point arithmetic means the computed growth may differ from targetMin by
    // a sub-epsilon amount — assert near-zero delta (< 0.0001) rather than strict equality.
    const targetMin = 40 * (7 / 30) // 9.3333...%
    const previous = 3000            // larger base reduces relative float error
    const current = previous * (1 + targetMin / 100)
    const result = calcVisitorGrowthBenchmark(current, previous)
    expect(result.achieved).toBe(true)
    expect(result.status).toBe("achieved")
    expect(Math.abs(result.delta)).toBeLessThan(0.0001) // approximately 0
  })

  it("zero previous period → no_data, achieved: false", () => {
    const result = calcVisitorGrowthBenchmark(800, 0)
    expect(result.achieved).toBe(false)
    expect(result.status).toBe("no_data")
    expect(result.currentValue).toBe(0)
  })

  it("negative visitor growth → not achieved", () => {
    const result = calcVisitorGrowthBenchmark(850, 1000)
    expect(result.currentValue).toBe(-15)
    expect(result.achieved).toBe(false)
    expect(result.status).toBe("below_target")
  })
})

// ─── CTR ─────────────────────────────────────────────────────────────────────

describe("calcCTRBenchmark", () => {
  // Range [2%, 4%] — no proration
  // Pass: strictly within [2%, 4%]
  // Above 4% → above_range, achieved:false (per spec: the band is the target)

  it("on-target: CTR exactly 2% (lower bound) → achieved", () => {
    const result = calcCTRBenchmark(200, 10000)  // 200/10000 = 2%
    expect(r(result.currentValue)).toBe(2)
    expect(result.achieved).toBe(true)
    expect(result.status).toBe("achieved")
  })

  it("on-target: CTR exactly 4% (upper bound) → achieved", () => {
    const result = calcCTRBenchmark(400, 10000)  // 400/10000 = 4%
    expect(r(result.currentValue)).toBe(4)
    expect(result.achieved).toBe(true)
    expect(result.status).toBe("achieved")
  })

  it("within range: CTR 3% → achieved", () => {
    const result = calcCTRBenchmark(300, 10000)
    expect(r(result.currentValue)).toBe(3)
    expect(result.achieved).toBe(true)
    expect(result.status).toBe("achieved")
    expect(result.delta).toBeGreaterThan(0)  // headroom above min
  })

  it("above range: CTR 5% → above_range, achieved:false", () => {
    const result = calcCTRBenchmark(500, 10000)
    expect(r(result.currentValue)).toBe(5)
    expect(result.achieved).toBe(false)
    expect(result.status).toBe("above_range")
    expect(result.delta).toBeGreaterThan(0)  // overshoot above max
  })

  it("below target: CTR 1% → below_target, achieved:false", () => {
    const result = calcCTRBenchmark(100, 10000)
    expect(r(result.currentValue)).toBe(1)
    expect(result.achieved).toBe(false)
    expect(result.status).toBe("below_target")
    expect(result.delta).toBeLessThan(0)     // deficit below min
  })

  it("zero impressions → no_data, achieved:false", () => {
    const result = calcCTRBenchmark(0, 0)
    expect(result.achieved).toBe(false)
    expect(result.status).toBe("no_data")
    expect(result.currentValue).toBe(0)
  })

  it("CTR is not prorated — benchmark stays [2%, 4%] regardless of window", () => {
    // The benchmark values must not change with PRORATION_FACTOR
    const result = calcCTRBenchmark(300, 10000)
    expect(result.benchmark.min).toBe(2)
    expect(result.benchmark.max).toBe(4)
  })
})

// ─── Composite ────────────────────────────────────────────────────────────────

describe("calcWeeklyBenchmarks (composite)", () => {
  it("all metrics pass", () => {
    const out = calcWeeklyBenchmarks({
      traffic:  { current: 1050, previous: 1000 },  // 5% > 2.33%
      visitors: { current: 1105, previous: 1000 },  // 10.5% within [9.33%, 11.67%]
      ctr:      { clicks: 300,   impressions: 10000 }, // 3% within [2%, 4%]
    })
    expect(out.trafficGrowth.achieved).toBe(true)
    expect(out.visitorGrowth.achieved).toBe(true)
    expect(out.ctr.achieved).toBe(true)
    expect(out.windowDays).toBe(REPORTING_WINDOW_DAYS)
    expect(out.prorationFactor).toBe(PRORATION_FACTOR)
  })

  it("all metrics fail", () => {
    const out = calcWeeklyBenchmarks({
      traffic:  { current: 1001, previous: 1000 },  // 0.1% < 2.33%
      visitors: { current: 1050, previous: 1000 },  // 5% < 9.33%
      ctr:      { clicks: 100,   impressions: 10000 }, // 1% < 2%
    })
    expect(out.trafficGrowth.achieved).toBe(false)
    expect(out.visitorGrowth.achieved).toBe(false)
    expect(out.ctr.achieved).toBe(false)
  })

  it("all previous periods are zero → all no_data", () => {
    const out = calcWeeklyBenchmarks({
      traffic:  { current: 1000, previous: 0 },
      visitors: { current: 1000, previous: 0 },
      ctr:      { clicks: 0,     impressions: 0 },
    })
    expect(out.trafficGrowth.status).toBe("no_data")
    expect(out.visitorGrowth.status).toBe("no_data")
    expect(out.ctr.status).toBe("no_data")
  })

  it("returns correct windowDays and prorationFactor in output", () => {
    const out = calcWeeklyBenchmarks({
      traffic:  { current: 1050, previous: 1000 },
      visitors: { current: 1100, previous: 1000 },
      ctr:      { clicks: 300,   impressions: 10000 },
    })
    expect(out.windowDays).toBe(7)
    expect(r(out.prorationFactor)).toBe(r(7 / 30))
  })
})
