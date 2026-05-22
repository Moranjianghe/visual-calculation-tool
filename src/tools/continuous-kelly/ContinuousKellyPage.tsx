import { useMemo, useState } from 'react'
import { KellyChart } from './KellyChart'
import {
  calculateKelly,
  formatPercent,
  initialPoints,
  sortedProbabilities,
} from './math'
import type { DistributionPoint, KellyConstraints } from './types'

const defaultConstraints: KellyConstraints = {
  maxPositionPercent: 20,
  lossBudgetPercent: 3,
  kellyFractionPercent: 25,
}

const reasonText = {
  'max-position': '当前建议被单票上限限制。',
  'stress-cap': '当前建议被压力亏损预算限制。',
  'kelly-fraction': '当前建议来自折扣后的凯利仓位。',
}

export function ContinuousKellyPage() {
  const [points, setPoints] = useState<DistributionPoint[]>(initialPoints)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [constraints, setConstraints] = useState<KellyConstraints>(defaultConstraints)

  const dist = useMemo(() => sortedProbabilities(points), [points])
  const result = useMemo(() => calculateKelly(dist, constraints), [dist, constraints])

  const updateConstraint = (key: keyof KellyConstraints, value: number) => {
    setConstraints((current) => ({ ...current, [key]: value }))
  }

  return (
    <main className="product-shell">
      <aside className="tool-nav" aria-label="工具导航">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            VC
          </div>
          <div>
            <div className="brand-title">Visual Calc</div>
            <div className="brand-subtitle">图形计算工具集</div>
          </div>
        </div>
        <nav className="tool-list">
          <button className="tool-item active" type="button" aria-current="page">
            <span className="tool-item-title">连续凯利</span>
            <span className="tool-item-meta">仓位 / 分布</span>
          </button>
          <button className="tool-item" type="button" disabled>
            <span className="tool-item-title">几何工具</span>
            <span className="tool-item-meta">待添加</span>
          </button>
          <button className="tool-item" type="button" disabled>
            <span className="tool-item-title">概率模拟</span>
            <span className="tool-item-meta">待添加</span>
          </button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="title-block">
            <p className="eyebrow">投资 / 概率分布</p>
            <h1>连续凯利仓位计算器</h1>
            <p className="subtitle">
              拖动收益分布点，计算最大化 E[ln(1 + fR)] 的仓位，并叠加亏损预算和单票上限。
            </p>
          </div>
          <div className="actions" aria-label="图表操作">
            <button
              className="btn"
              type="button"
              onClick={() => {
                setPoints(initialPoints)
                setSelectedIndex(-1)
              }}
            >
              重置
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setPoints((current) => [...current, { r: 0.25, w: 0.1 }])
                setSelectedIndex(points.length)
              }}
            >
              加点
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                setPoints(dist)
                setSelectedIndex(-1)
              }}
            >
              排序并归一化
            </button>
          </div>
        </header>

        <section className="summary-strip" aria-label="关键结果">
          <Metric
            tone="good"
            label="最终建议"
            value={formatPercent(result.finalPosition)}
            sub={reasonText[result.reason]}
          />
          <Metric
            label="满凯利"
            value={formatPercent(result.fullKelly)}
            sub={`几何收益 ${formatPercent(result.expectedGrowth, 2)}`}
          />
          <Metric
            tone="bad"
            label="压力跌幅"
            value={formatPercent(result.stats.worst)}
            sub="当前最差情景"
          />
          <Metric
            label="期望收益"
            value={formatPercent(result.stats.mean)}
            sub={`波动率 ${formatPercent(result.stats.vol)}`}
          />
        </section>

        <div className="layout">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>收益概率分布</h2>
              <p>横轴为单期收益率 R，纵轴为归一化后的概率权重。</p>
            </div>
            <div className="selected-chip" aria-live="polite">
              {selectedIndex >= 0 ? `已选中点 ${selectedIndex + 1}` : '未选中点'}
            </div>
          </div>
          <KellyChart
            points={points}
            selectedIndex={selectedIndex}
            onPointsChange={setPoints}
            onSelectedIndexChange={setSelectedIndex}
          />
          <div className="hint">
            <span>横轴：单期收益率 R。纵轴：概率权重，自动归一化。</span>
            <span>操作：拖动点；双击图表新增点；选中点后按 Delete 删除。</span>
          </div>
        </section>

        <aside className="side">
          <section className="panel section">
            <h2>结论</h2>
            <div className="result-grid">
              <Metric
                tone="good"
                label="满凯利"
                value={formatPercent(result.fullKelly)}
                sub={`满凯利期望几何收益 ${formatPercent(result.expectedGrowth, 2)}`}
              />
              <Metric
                label="半凯利"
                value={formatPercent(result.fullKelly * 0.5)}
                sub="更常用的进取折扣"
              />
              <Metric
                label="四分之一凯利"
                value={formatPercent(result.fullKelly * 0.25)}
                sub="更保守的估计误差折扣"
              />
              <Metric
                tone="warn"
                label="压力约束仓位"
                value={formatPercent(result.stressCap)}
                sub={`亏损预算 ${formatPercent(constraints.lossBudgetPercent / 100, 1)} / 压力跌幅 ${formatPercent(Math.abs(result.stats.worst), 1)}`}
              />
            </div>
            <p className="note">
              按当前假设，实际参考仓位约 {formatPercent(result.finalPosition)}。
              {reasonText[result.reason]} 这不是买卖建议，重点是检查情景概率和灾难跌幅是否保守。
            </p>
          </section>

          <section className="panel section">
            <h2>约束</h2>
            <div className="inline-fields">
              <NumberField
                id="max-position"
                label="单票上限"
                min={0}
                max={300}
                step={1}
                value={constraints.maxPositionPercent}
                onChange={(value) => updateConstraint('maxPositionPercent', value)}
              />
              <NumberField
                id="loss-budget"
                label="可承受单票亏损"
                min={0}
                max={100}
                step={0.5}
                value={constraints.lossBudgetPercent}
                onChange={(value) => updateConstraint('lossBudgetPercent', value)}
              />
            </div>
            <div className="field">
              <label htmlFor="kelly-fraction">
                实际使用凯利折扣：{formatPercent(constraints.kellyFractionPercent / 100, 0)}
              </label>
              <input
                id="kelly-fraction"
                type="range"
                min={5}
                max={100}
                step={5}
                value={constraints.kellyFractionPercent}
                onChange={(event) =>
                  updateConstraint('kellyFractionPercent', Number(event.target.value))
                }
              />
            </div>
            <div className="formula">
              最终仓位 = min(满凯利 × 折扣, 可承受亏损 / 压力跌幅, 单票上限)
            </div>
          </section>

          <section className="panel section">
            <h2>分布统计</h2>
            <div className="result-grid">
              <Metric label="期望收益" value={formatPercent(result.stats.mean)} sub="Σ pR" />
              <Metric label="波动率" value={formatPercent(result.stats.vol)} sub="离散分布标准差" />
              <Metric
                tone="bad"
                label="压力跌幅"
                value={formatPercent(result.stats.worst)}
                sub="当前最差情景"
              />
              <Metric label="最终建议" value={formatPercent(result.finalPosition)} sub="按当前约束取最小值" />
            </div>
          </section>

          <section className="panel section">
            <h2>情景点</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>点</th>
                    <th>收益 R</th>
                    <th>概率 p</th>
                    <th>权重</th>
                  </tr>
                </thead>
                <tbody>
                  {dist.map((point, index) => (
                    <tr key={`${point.r}-${point.w}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{formatPercent(point.r, 1)}</td>
                      <td>{formatPercent(point.w, 1)}</td>
                      <td>{point.w.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </aside>
        </div>
      </section>
    </main>
  )
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone?: 'good' | 'warn' | 'bad'
}) {
  return (
    <div className={`metric ${tone ?? ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="sub">{sub}</div>
    </div>
  )
}

function NumberField({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
