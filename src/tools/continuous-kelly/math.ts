import type {
  DistributionPoint,
  DistributionStats,
  KellyConstraints,
  KellyResult,
} from './types'

export const X_MIN = -1
export const X_MAX = 2
export const Y_MAX = 1

export const initialPoints: DistributionPoint[] = [
  { r: -0.8, w: 0.05 },
  { r: -0.35, w: 0.18 },
  { r: -0.1, w: 0.25 },
  { r: 0.18, w: 0.34 },
  { r: 0.55, w: 0.14 },
  { r: 1.4, w: 0.04 },
]

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizePoints(points: DistributionPoint[]) {
  const total = points.reduce((sum, point) => sum + Math.max(0.001, point.w), 0)

  return points.map((point) => ({
    r: clamp(point.r, X_MIN, X_MAX),
    w: Math.max(0.001, point.w) / total,
  }))
}

export function sortedProbabilities(points: DistributionPoint[]) {
  return normalizePoints(points).sort((a, b) => a.r - b.r)
}

export function expectedLogGrowth(f: number, dist: DistributionPoint[]) {
  let sum = 0

  for (const point of dist) {
    const wealth = 1 + f * point.r
    if (wealth <= 0) return -Infinity
    sum += point.w * Math.log(wealth)
  }

  return sum
}

export function solveKelly(dist: DistributionPoint[]) {
  const worst = Math.min(...dist.map((point) => point.r))
  const upperByRuin = worst < 0 ? Math.min(3, 1 / Math.abs(worst) - 0.0001) : 3
  const upper = Math.max(0, upperByRuin)
  const steps = 3000
  let bestF = 0
  let bestG = expectedLogGrowth(0, dist)

  for (let i = 1; i <= steps; i += 1) {
    const f = (upper * i) / steps
    const g = expectedLogGrowth(f, dist)
    if (g > bestG) {
      bestG = g
      bestF = f
    }
  }

  const left = Math.max(0, bestF - upper / steps)
  const right = Math.min(upper, bestF + upper / steps)

  for (let i = 0; i <= 500; i += 1) {
    const f = left + ((right - left) * i) / 500
    const g = expectedLogGrowth(f, dist)
    if (g > bestG) {
      bestG = g
      bestF = f
    }
  }

  return { f: bestF, growth: Math.exp(bestG) - 1 }
}

export function getDistributionStats(dist: DistributionPoint[]): DistributionStats {
  const mean = dist.reduce((sum, point) => sum + point.w * point.r, 0)
  const variance = dist.reduce(
    (sum, point) => sum + point.w * Math.pow(point.r - mean, 2),
    0,
  )
  const worst = Math.min(...dist.map((point) => point.r))

  return { mean, vol: Math.sqrt(variance), worst }
}

export function calculateKelly(
  dist: DistributionPoint[],
  constraints: KellyConstraints,
): KellyResult {
  const { f, growth } = solveKelly(dist)
  const stats = getDistributionStats(dist)
  const maxPosition = clamp(constraints.maxPositionPercent / 100 || 0, 0, 3)
  const lossBudget = clamp(constraints.lossBudgetPercent / 100 || 0, 0, 1)
  const fraction = clamp(constraints.kellyFractionPercent / 100 || 0.25, 0.05, 1)
  const stressCap = stats.worst < 0 ? lossBudget / Math.abs(stats.worst) : maxPosition
  const discounted = f * fraction
  const finalPosition = Math.min(discounted, stressCap, maxPosition)
  const reason =
    finalPosition === maxPosition
      ? 'max-position'
      : finalPosition === stressCap
        ? 'stress-cap'
        : 'kelly-fraction'

  return {
    fullKelly: f,
    expectedGrowth: growth,
    stats,
    stressCap,
    finalPosition,
    reason,
  }
}

export function formatPercent(value: number, digits = 1) {
  if (!Number.isFinite(value)) return '--'
  return `${(value * 100).toFixed(digits)}%`
}
