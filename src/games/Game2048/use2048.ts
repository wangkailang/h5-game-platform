import { useState, useCallback, useEffect, useRef } from 'react'
import { createInitialState, move, continueGame, type GameState, type Direction } from './engine'

export function use2048() {
  const [state, setState] = useState<GameState>(createInitialState)
  const [prevGrid, setPrevGrid] = useState<GameState['grid'] | null>(null)
  const [prevScore, setPrevScore] = useState(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const doMove = useCallback((dir: Direction) => {
    setState((prev) => {
      if (prev.status === 'lost') return prev
      setPrevGrid(prev.grid.map((r) => [...r]))
      setPrevScore(prev.score)
      return move(prev, dir)
    })
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
        doMove(dir)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [doMove])

  // 触摸事件
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    const minSwipe = 30

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
      touchStart.current = null
      return
    }

    let dir: Direction
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'RIGHT' : 'LEFT'
    } else {
      dir = dy > 0 ? 'DOWN' : 'UP'
    }
    doMove(dir)
    touchStart.current = null
  }, [doMove])

  const restart = useCallback(() => {
    setPrevGrid(null)
    setPrevScore(0)
    setState(createInitialState())
  }, [])

  const handleContinue = useCallback(() => {
    setState((prev) => continueGame(prev))
  }, [])

  const undo = useCallback(() => {
    if (!prevGrid) return
    setState((prev) => ({
      ...prev,
      grid: prevGrid.map((r) => [...r]),
      score: prevScore,
      status: 'playing',
      moved: false,
    }))
    setPrevGrid(null)
  }, [prevGrid, prevScore])

  return {
    ...state,
    canUndo: prevGrid !== null,
    doMove,
    restart,
    undo,
    handleContinue,
    handleTouchStart,
    handleTouchEnd,
  }
}
