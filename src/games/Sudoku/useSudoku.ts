import { useState, useCallback, useEffect, useRef } from 'react'
import {
  generatePuzzle,
  isBoardComplete,
  isValid,
  getCandidates,
  type Board,
  type Difficulty,
} from './engine'

export interface CellPosition {
  row: number
  col: number
}

export interface SudokuState {
  puzzle: Board // 初始谜题（不可修改）
  board: Board // 当前玩家棋盘
  solution: Board // 答案
  selectedCell: CellPosition | null
  notes: Map<string, Set<number>> // 笔记模式
  isNoteMode: boolean
  difficulty: Difficulty
  isComplete: boolean
  mistakes: number
  timer: number
  selectedNumber: number | null
  conflicts: Set<string> // 冲突位置
}

export function useSudoku(initialDifficulty: Difficulty = 'medium') {
  const [state, setState] = useState<SudokuState>(() => {
    const { puzzle, solution } = generatePuzzle(initialDifficulty)
    return {
      puzzle,
      board: puzzle.map((r) => [...r]),
      solution,
      selectedCell: null,
      notes: new Map(),
      isNoteMode: false,
      difficulty: initialDifficulty,
      isComplete: false,
      mistakes: 0,
      timer: 0,
      selectedNumber: null,
      conflicts: new Set(),
    }
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 计时器
  useEffect(() => {
    if (!state.isComplete) {
      timerRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, timer: prev.timer + 1 }))
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state.isComplete])

  /** 选择单元格 */
  const selectCell = useCallback((row: number, col: number) => {
    setState((prev) => {
      const newState = { ...prev, selectedCell: { row, col } }
      // 更新冲突
      if (prev.board[row][col] !== 0) {
        newState.conflicts = findConflicts(prev.board, row, col, prev.board[row][col])
      } else {
        newState.conflicts = new Set()
      }
      return newState
    })
  }, [])

  /** 填入数字 */
  const fillNumber = useCallback(
    (num: number) => {
      setState((prev) => {
        if (!prev.selectedCell) return prev
        const { row, col } = prev.selectedCell
        if (prev.puzzle[row][col] !== 0) return prev // 初始数字不可修改

        const newBoard = prev.board.map((r) => [...r])

        if (prev.isNoteMode) {
          // 笔记模式
          const key = `${row}-${col}`
          const newNotes = new Map(prev.notes)
          const cellNotes = newNotes.get(key) ? new Set(newNotes.get(key)) : new Set<number>()
          if (cellNotes.has(num)) {
            cellNotes.delete(num)
          } else {
            cellNotes.add(num)
          }
          newNotes.set(key, cellNotes)
          return { ...prev, notes: newNotes }
        }

        // 普通填入
        newBoard[row][col] = num

        // 检查冲突
        const conflicts = findConflicts(newBoard, row, col, num)
        const isCorrect = isValid(prev.solution, row, col, num) && prev.solution[row][col] === num
        const newMistakes = isCorrect ? prev.mistakes : prev.mistakes + 1

        // 清除该位置的笔记
        const newNotes = new Map(prev.notes)
        newNotes.delete(`${row}-${col}`)

        // 检查是否完成
        const complete = isBoardComplete(newBoard)

        return {
          ...prev,
          board: newBoard,
          conflicts,
          mistakes: newMistakes,
          notes: newNotes,
          isComplete: complete,
        }
      })
    },
    [],
  )

  /** 擦除当前格 */
  const erase = useCallback(() => {
    setState((prev) => {
      if (!prev.selectedCell) return prev
      const { row, col } = prev.selectedCell
      if (prev.puzzle[row][col] !== 0) return prev

      const newBoard = prev.board.map((r) => [...r])
      newBoard[row][col] = 0
      const newNotes = new Map(prev.notes)
      newNotes.delete(`${row}-${col}`)

      return { ...prev, board: newBoard, notes: newNotes, conflicts: new Set() }
    })
  }, [])

  /** 切换笔记模式 */
  const toggleNoteMode = useCallback(() => {
    setState((prev) => ({ ...prev, isNoteMode: !prev.isNoteMode }))
  }, [])

  /** 提示：填入选中格的正确答案 */
  const hint = useCallback(() => {
    setState((prev) => {
      if (!prev.selectedCell) return prev
      const { row, col } = prev.selectedCell
      if (prev.puzzle[row][col] !== 0) return prev

      const newBoard = prev.board.map((r) => [...r])
      newBoard[row][col] = prev.solution[row][col]

      const newNotes = new Map(prev.notes)
      newNotes.delete(`${row}-${col}`)

      const complete = isBoardComplete(newBoard)
      return { ...prev, board: newBoard, notes: newNotes, isComplete: complete, conflicts: new Set() }
    })
  }, [])

  /** 选择数字面板的数字 */
  const selectNumber = useCallback((num: number | null) => {
    setState((prev) => ({ ...prev, selectedNumber: num }))
  }, [])

  /** 重新开始 */
  const restart = useCallback(() => {
    const { puzzle, solution } = generatePuzzle(state.difficulty)
    setState({
      puzzle,
      board: puzzle.map((r) => [...r]),
      solution,
      selectedCell: null,
      notes: new Map(),
      isNoteMode: false,
      difficulty: state.difficulty,
      isComplete: false,
      mistakes: 0,
      timer: 0,
      selectedNumber: null,
      conflicts: new Set(),
    })
  }, [state.difficulty])

  /** 切换难度 */
  const changeDifficulty = useCallback((difficulty: Difficulty) => {
    const { puzzle, solution } = generatePuzzle(difficulty)
    setState({
      puzzle,
      board: puzzle.map((r) => [...r]),
      solution,
      selectedCell: null,
      notes: new Map(),
      isNoteMode: false,
      difficulty,
      isComplete: false,
      mistakes: 0,
      timer: 0,
      selectedNumber: null,
      conflicts: new Set(),
    })
  }, [])

  /** 获取选中单元格的候选数字 */
  const selectedCandidates =
    state.selectedCell && state.board[state.selectedCell.row][state.selectedCell.col] === 0
      ? getCandidates(state.board, state.selectedCell.row, state.selectedCell.col)
      : []

  /** 获取数字 1-9 每个数字的剩余数量 */
  const numberCounts = (() => {
    const counts = new Map<number, number>()
    for (let n = 1; n <= 9; n++) {
      let count = 0
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (state.board[r][c] === n) count++
        }
      }
      counts.set(n, 9 - count)
    }
    return counts
  })()

  return {
    ...state,
    selectedCandidates,
    numberCounts,
    selectCell,
    fillNumber,
    erase,
    toggleNoteMode,
    hint,
    selectNumber,
    restart,
    changeDifficulty,
  }
}

/** 查找冲突 */
function findConflicts(board: Board, row: number, col: number, num: number): Set<string> {
  const conflicts = new Set<string>()

  // 行冲突
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === num) {
      conflicts.add(`${row}-${c}`)
      conflicts.add(`${row}-${col}`)
    }
  }

  // 列冲突
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === num) {
      conflicts.add(`${r}-${col}`)
      conflicts.add(`${row}-${col}`)
    }
  }

  // 宫格冲突
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === num) {
        conflicts.add(`${r}-${c}`)
        conflicts.add(`${row}-${col}`)
      }
    }
  }

  return conflicts
}
