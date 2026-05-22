export type DistributionPoint = {
  r: number
  w: number
}

export type KellyConstraints = {
  maxPositionPercent: number
  lossBudgetPercent: number
  kellyFractionPercent: number
}

export type DistributionStats = {
  mean: number
  vol: number
  worst: number
}

export type KellyResult = {
  fullKelly: number
  expectedGrowth: number
  stats: DistributionStats
  stressCap: number
  finalPosition: number
  reason: 'max-position' | 'stress-cap' | 'kelly-fraction'
}

export type XAxisMode = 'log-wealth' | 'linear-return'
