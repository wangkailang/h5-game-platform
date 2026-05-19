import { useState, useCallback, useEffect, useRef } from 'react'
import {
  createInitialState,
  tick,
  isOpposite,
  render,
  speedToInterval,
  type SnakeState,
  type Direction,
} from './engine'

export function useSnake() {
  const [state, setState] = useState<SnakeState>(createInitialState)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // 主循环
  useEffect(() => {
    if (state.status === 'playing') {
      timerRef.current = setInterval(() => {
        setState((prev) => tick(prev))
      }, speedToInterval(state.speed))
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state.status, state.speed])

  // Canvas 渲染
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    render(ctx, state)
  }, [state])

  // 改变方向
  const changeDirection = useCallback(
    (dir: Direction) => {
      setState((prev) => {
        if (prev.status === 'idle') {
          return { ...prev, direction: dir, nextDirection: dir, status: 'playing' }
        }
        if (prev.status !== 'playing') return prev
        if (isOpposite(prev.direction, dir)) return prev
        return { ...prev, nextDirection: dir }
      })
    },
    [],
  )

  // 开始 / 暂停 / 继续
  const start = useCallback(() => {
    setState((prev) => {
      if (prev.status === 'idle') return { ...prev, status: 'playing' }
      return prev
    })
  }, [])

  const togglePause = useCallback(() => {
    setState((prev) => {
      if (prev.status === 'playing') return { ...prev, status: 'paused' }
      if (prev.status === 'paused') return { ...prev, status: 'playing' }
      return prev
    })
  }, [])

  const restart = useCallback(() => {
    setState(createInitialState())
  }, [])

  // 键盘事件
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
        W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
      }
      const dir = keyMap[e.key]
      if (dir) {
        e.preventDefault()
        changeDirection(dir)
        return
      }
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        if (state.status === 'idle') start()
        else togglePause()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [changeDirection, start, togglePause, state.status])

  // 触摸事件（滑动识别）
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return
      const t = e.changedTouches[0]
      const dx = t.clientX - touchStart.current.x
      const dy = t.clientY - touchStart.current.y
      const minSwipe = 30

      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
        if (state.status === 'idle') start()
        touchStart.current = null
        return
      }

      let dir: Direction
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? 'RIGHT' : 'LEFT'
      } else {
        dir = dy > 0 ? 'DOWN' : 'UP'
      }
      changeDirection(dir)
      touchStart.current = null
    },
    [changeDirection, start, state.status],
  )

  return {
    ...state,
    canvasRef,
    changeDirection,
    start,
    togglePause,
    restart,
    handleTouchStart,
    handleTouchEnd,
  }
}
