import { useEffect, useRef } from 'react'
import {
  clamp,
  sortedProbabilities,
  X_MAX,
  X_MIN,
  Y_MAX,
} from './math'
import type { DistributionPoint } from './types'

type KellyChartProps = {
  points: DistributionPoint[]
  selectedIndex: number
  onPointsChange: (points: DistributionPoint[]) => void
  onSelectedIndexChange: (index: number) => void
}

const margin = { left: 58, right: 18, top: 22, bottom: 46 }

export function KellyChart({
  points,
  selectedIndex,
  onPointsChange,
  onSelectedIndexChange,
}: KellyChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const draggingIndexRef = useRef(-1)
  const pointsRef = useRef(points)
  const selectedIndexRef = useRef(selectedIndex)
  const hoveredIndexRef = useRef(-1)

  useEffect(() => {
    pointsRef.current = points
  }, [points])

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    const innerRect = () => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: margin.left,
        y: margin.top,
        w: rect.width - margin.left - margin.right,
        h: rect.height - margin.top - margin.bottom,
      }
    }

    const xScale = (r: number) => {
      const box = innerRect()
      return box.x + ((r - X_MIN) / (X_MAX - X_MIN)) * box.w
    }

    const yScale = (w: number) => {
      const box = innerRect()
      return box.y + (1 - w / Y_MAX) * box.h
    }

    const xInvert = (px: number) => {
      const box = innerRect()
      return X_MIN + ((px - box.x) / box.w) * (X_MAX - X_MIN)
    }

    const yInvert = (py: number) => {
      const box = innerRect()
      return (1 - (py - box.y) / box.h) * Y_MAX
    }

    const drawGrid = () => {
      const box = innerRect()
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      ctx.fillStyle = '#fbfcfe'
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr)

      ctx.strokeStyle = '#e5e9f1'
      ctx.lineWidth = 1
      ctx.fillStyle = '#667085'
      ctx.font = '12px Inter, Segoe UI, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      for (let x = -1; x <= 2.001; x += 0.5) {
        const px = xScale(x)
        ctx.beginPath()
        ctx.moveTo(px, box.y)
        ctx.lineTo(px, box.y + box.h)
        ctx.stroke()
        ctx.fillText(`${Math.round(x * 100)}%`, px, box.y + box.h + 12)
      }

      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (let y = 0; y <= 1.001; y += 0.2) {
        const py = yScale(y)
        ctx.beginPath()
        ctx.moveTo(box.x, py)
        ctx.lineTo(box.x + box.w, py)
        ctx.stroke()
        ctx.fillText(`${Math.round(y * 100)}%`, box.x - 9, py)
      }

      ctx.strokeStyle = '#98a2b3'
      ctx.lineWidth = 1.4
      ctx.strokeRect(box.x, box.y, box.w, box.h)

      const zeroX = xScale(0)
      ctx.strokeStyle = '#d64545'
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(zeroX, box.y)
      ctx.lineTo(zeroX, box.y + box.h)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#344054'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('收益率 R', box.x + box.w - 62, box.y + box.h + 30)
      ctx.save()
      ctx.translate(14, box.y + 82)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText('概率权重 p', 0, 0)
      ctx.restore()
    }

    const drawDistribution = () => {
      const dist = sortedProbabilities(pointsRef.current)
      if (!dist.length) return

      ctx.lineWidth = 2
      ctx.strokeStyle = '#2563eb'
      ctx.fillStyle = 'rgba(37, 99, 235, 0.12)'

      ctx.beginPath()
      ctx.moveTo(xScale(dist[0].r), yScale(0))
      for (const point of dist) {
        ctx.lineTo(xScale(point.r), yScale(point.w))
      }
      ctx.lineTo(xScale(dist[dist.length - 1].r), yScale(0))
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      dist.forEach((point, index) => {
        const px = xScale(point.r)
        const py = yScale(point.w)
        if (index === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.stroke()

      pointsRef.current.forEach((point, index) => {
        const px = xScale(point.r)
        const py = yScale(point.w)
        const isSelected = index === selectedIndexRef.current
        const isHovered = index === hoveredIndexRef.current
        ctx.beginPath()
        ctx.arc(px, py, isSelected ? 8 : isHovered ? 7 : 6, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? '#17202a' : isHovered ? '#1d4ed8' : '#2563eb'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()

        if (isSelected) {
          ctx.beginPath()
          ctx.arc(px, py, 13, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(37, 99, 235, 0.28)'
          ctx.lineWidth = 3
          ctx.stroke()
        }
      })
    }

    const render = () => {
      drawGrid()
      drawDistribution()
    }

    const resizeCanvas = () => {
      const rect = wrap.getBoundingClientRect()
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      render()
    }

    const eventPoint = (event: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const nearestPoint = (pos: { x: number; y: number }) => {
      let best = -1
      let bestDistance = Infinity

      pointsRef.current.forEach((point, index) => {
        const dx = xScale(point.r) - pos.x
        const dy = yScale(point.w) - pos.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < bestDistance) {
          bestDistance = distance
          best = index
        }
      })

      return bestDistance <= 18 ? best : -1
    }

    const addPointAt = (pos: { x: number; y: number }) => {
      const next = [
        ...pointsRef.current,
        {
          r: clamp(xInvert(pos.x), X_MIN, X_MAX),
          w: clamp(yInvert(pos.y), 0.005, 0.8),
        },
      ]
      onPointsChange(next)
      onSelectedIndexChange(next.length - 1)
      return next.length - 1
    }

    const handlePointerDown = (event: PointerEvent) => {
      canvas.focus()
      canvas.setPointerCapture(event.pointerId)
      const pos = eventPoint(event)
      const index = nearestPoint(pos)

      if (index >= 0) {
        onSelectedIndexChange(index)
        draggingIndexRef.current = index
      } else {
        draggingIndexRef.current = addPointAt(pos)
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      const index = draggingIndexRef.current
      const pos = eventPoint(event)

      if (index < 0) {
        const hoverIndex = nearestPoint(pos)
        if (hoverIndex !== hoveredIndexRef.current) {
          hoveredIndexRef.current = hoverIndex
          canvas.style.cursor = hoverIndex >= 0 ? 'grab' : 'crosshair'
          render()
        }
        return
      }

      canvas.style.cursor = 'grabbing'
      onPointsChange(
        pointsRef.current.map((point, pointIndex) =>
          pointIndex === index
            ? {
                r: clamp(xInvert(pos.x), X_MIN, X_MAX),
                w: clamp(yInvert(pos.y), 0.001, Y_MAX),
              }
            : point,
        ),
      )
    }

    const handlePointerUp = (event: PointerEvent) => {
      canvas.releasePointerCapture(event.pointerId)
      draggingIndexRef.current = -1
      canvas.style.cursor = hoveredIndexRef.current >= 0 ? 'grab' : 'crosshair'
    }

    const handlePointerLeave = () => {
      if (draggingIndexRef.current >= 0) return
      hoveredIndexRef.current = -1
      canvas.style.cursor = 'crosshair'
      render()
    }

    const handleDoubleClick = (event: MouseEvent) => {
      addPointAt(eventPoint(event))
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const selected = selectedIndexRef.current
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selected >= 0 &&
        pointsRef.current.length > 3
      ) {
        onPointsChange(pointsRef.current.filter((_, index) => index !== selected))
        onSelectedIndexChange(-1)
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    canvas.addEventListener('dblclick', handleDoubleClick)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', resizeCanvas)

    resizeCanvas()

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      canvas.removeEventListener('dblclick', handleDoubleClick)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [onPointsChange, onSelectedIndexChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    window.dispatchEvent(new Event('resize'))
  }, [points, selectedIndex])

  return (
    <div ref={wrapRef} className="chart-wrap">
      <canvas
        ref={canvasRef}
        role="img"
        tabIndex={0}
        aria-label="收益概率分布图。拖动蓝色点调整收益率和概率权重，按 Delete 删除选中点。"
      />
    </div>
  )
}
