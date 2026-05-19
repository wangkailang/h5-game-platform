import { useState, useCallback, useRef } from 'react'
import {
  createInitialState,
  isAdjacent,
  trySwap,
  processMatchesStep,
  calcMatchScore,
  hasValidMoves,
  findMatches,
  createCleanGrid,
  type Match3State,
  type Position,
  type Grid,
} from './engine'

const ANIM_DELAY = 300 // 消除/下落动画间隔 (ms)

export function useMatch3() {
  const [state, setState] = useState<Match3State>(createInitialState)
  const animating = useRef(false)

  /** 异步连锁处理 */
  const processChainAsync = useCallback((
    grid: Grid,
    matchCount: number,
    chainCount: number,
    movesLeft: number,
    currentScore: number,
    currentBest: number,
  ) => {
    animating.current = true

    const scoreGain = calcMatchScore(matchCount, chainCount)
    const newScore = currentScore + scoreGain
    const newBest = Math.max(newScore, currentBest)

    setTimeout(() => {
      const step = processMatchesStep(grid)

      if (step.matched.size > 0) {
        // 还有新的匹配 → 继续连锁
        processChainAsync(step.grid, step.matched.size, chainCount + 1, movesLeft, newScore, newBest)
      } else {
        // 连锁结束
        animating.current = false

        // 检查是否还有可用移动，没有则重洗
        let finalGrid = step.grid
        if (!hasValidMoves(finalGrid)) {
          finalGrid = createCleanGrid()
          while (findMatches(finalGrid).size > 0) {
            finalGrid = createCleanGrid()
          }
        }

        const TARGET_SCORE = 2000
        const isWin = newScore >= TARGET_SCORE
        const isLose = movesLeft <= 0 && !isWin

        setState((prev) => ({
          ...prev,
          grid: finalGrid,
          score: newScore,
          bestScore: newBest,
          matchedCells: new Set(),
          chainCount: chainCount,
          status: isWin ? 'won' : isLose ? 'lost' : 'playing',
        }))

        // 保存最高分
        try { localStorage.setItem('match3_best_score', String(newBest)) } catch { /* ignore */ }
      }
    }, ANIM_DELAY)
  }, [])

  /** 点击格子 */
  const handleCellClick = useCallback((r: number, c: number) => {
    if (animating.current) return
    if (state.status !== 'playing') return

    setState((prev) => {
      const pos: Position = { r, c }

      // 没有已选中 → 选中当前格
      if (!prev.selected) {
        return { ...prev, selected: pos }
      }

      // 点击同一个格子 → 取消选中
      if (prev.selected.r === r && prev.selected.c === c) {
        return { ...prev, selected: null }
      }

      // 点击不相邻 → 切换选中
      if (!isAdjacent(prev.selected, pos)) {
        return { ...prev, selected: pos }
      }

      // 尝试交换
      const result = trySwap(prev, prev.selected, pos)
      if (!result.valid) {
        return { ...prev, selected: null }
      }

      // 有效交换 → 开始连锁消除
      const newMoves = prev.moves - 1
      processChainAsync(result.grid, result.matched.size, 0, newMoves, prev.score, prev.bestScore)

      return {
        ...prev,
        grid: result.grid,
        selected: null,
        matchedCells: result.matched,
        status: 'animating',
        moves: newMoves,
      }
    })
  }, [state.status, processChainAsync])

  /** 重新开始 */
  const restart = useCallback(() => {
    animating.current = false
    setState(createInitialState())
  }, [])

  return {
    ...state,
    handleCellClick,
    restart,
  }
}
