import { useState, useRef, useCallback, useEffect } from 'react'
import {
  createInitialState,
  placeStone,
  aiMove,
  render,
  CELL_SIZE,
  PADDING,
  BOARD_SIZE,
  type GomokuState,
  type Position,
} from './engine'

export function useGomoku(mode: 'pvp' | 'pve' = 'pve') {
  const [state, setState] = useState<GomokuState>(() => createInitialState(mode))
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 渲染
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    render(ctx, state)
  }, [state])

  useEffect(() => {
    draw()
  }, [draw])

  // AI 落子
  useEffect(() => {
    if (state.mode === 'pve' && state.currentPlayer === 'white' && state.status === 'playing' && !state.winner) {
      setState(prev => ({ ...prev, aiThinking: true }))

      const timer = setTimeout(() => {
        const aiPos = aiMove(state)
        setState(prev => {
          const newState = placeStone(prev, aiPos)
          return { ...newState, aiThinking: false }
        })
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [state.currentPlayer, state.status, state.mode, state.winner])

  // 点击棋盘落子
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // 游戏结束，点击重新开始
    if (state.status === 'gameover') {
      setState(createInitialState(state.mode))
      return
    }

    // 空闲状态，点击开始
    if (state.status === 'idle') {
      setState(prev => ({ ...prev, status: 'playing' }))
    }

    // AI 思考中不能落子
    if (state.aiThinking) return

    // 计算落子位置
    const col = Math.round((x - PADDING) / CELL_SIZE)
    const row = Math.round((y - PADDING) / CELL_SIZE)

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return

    const pos: Position = { row, col }

    // PvE 模式下只能黑棋落子
    if (state.mode === 'pve' && state.currentPlayer === 'white') return

    setState(prev => placeStone(prev, pos))
  }, [state.status, state.aiThinking, state.mode, state.currentPlayer])

  // 重新开始
  const restart = useCallback(() => {
    setState(createInitialState(state.mode))
  }, [state.mode])

  // 切换模式
  const toggleMode = useCallback(() => {
    const newMode = state.mode === 'pvp' ? 'pve' : 'pvp'
    setState(createInitialState(newMode))
  }, [state.mode])

  // 悔棋
  const undo = useCallback(() => {
    if (state.moveHistory.length < 2) return
    if (state.status === 'gameover') return

    setState(prev => {
      const newBoard = prev.board.map(row => [...row])

      // 撤销两步（玩家 + AI）
      const movesToUndo = prev.mode === 'pve' ? 2 : 1

      for (let i = 0; i < movesToUndo && prev.moveHistory.length > 0; i++) {
        const lastMove = prev.moveHistory[prev.moveHistory.length - 1]
        newBoard[lastMove.row][lastMove.col] = null
        prev = {
          ...prev,
          board: newBoard,
          moveHistory: prev.moveHistory.slice(0, -1),
          currentPlayer: prev.currentPlayer === 'black' ? 'white' : 'black',
        }
      }

      return prev
    })
  }, [state.moveHistory.length, state.status, state.mode])

  return {
    ...state,
    canvasRef,
    handleClick,
    restart,
    toggleMode,
    undo,
  }
}
