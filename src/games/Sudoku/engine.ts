/**
 * 数独引擎 - 生成、求解、验证
 */

export type Board = number[][] // 0 表示空格
export type Difficulty = 'easy' | 'medium' | 'hard'

const GRID_SIZE = 9
const BOX_SIZE = 3

/** 检查数字在指定位置是否合法 */
export function isValid(board: Board, row: number, col: number, num: number): boolean {
  // 检查行
  for (let c = 0; c < GRID_SIZE; c++) {
    if (board[row][c] === num) return false
  }
  // 检查列
  for (let r = 0; r < GRID_SIZE; r++) {
    if (board[r][col] === num) return false
  }
  // 检查 3x3 宫格
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if (board[r][c] === num) return false
    }
  }
  return true
}

/** 使用回溯法求解数独 */
export function solve(board: Board): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
        for (const num of nums) {
          if (isValid(board, r, c, num)) {
            board[r][c] = num
            if (solve(board)) return true
            board[r][c] = 0
          }
        }
        return false
      }
    }
  }
  return true
}

/** Fisher-Yates 洗牌 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 生成完整解答 */
export function generateSolvedBoard(): Board {
  const board: Board = Array.from({ length: 9 }, () => Array(9).fill(0))
  solve(board)
  return board
}

/** 难度对应的挖空数量 */
const DIFFICULTY_HOLES: Record<Difficulty, number> = {
  easy: 36,
  medium: 46,
  hard: 54,
}

/** 根据完整解答生成谜题 */
export function generatePuzzle(difficulty: Difficulty = 'medium'): { puzzle: Board; solution: Board } {
  const solution = generateSolvedBoard()
  const puzzle = solution.map((row) => [...row])
  const holes = DIFFICULTY_HOLES[difficulty]

  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number]),
  )

  let removed = 0
  for (const [r, c] of positions) {
    if (removed >= holes) break
    puzzle[r][c] = 0
    removed++
  }

  return { puzzle, solution }
}

/** 检查棋盘是否完成 */
export function isBoardComplete(board: Board): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === 0) return false
    }
  }
  // 验证所有数字是否合法
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const num = board[r][c]
      if (!isValidSafe(board, r, c, num)) return false
    }
  }
  return true
}

/** 检查数字在指定位置是否合法（排除自身） */
function isValidSafe(board: Board, row: number, col: number, num: number): boolean {
  for (let c = 0; c < GRID_SIZE; c++) {
    if (c !== col && board[row][c] === num) return false
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    if (r !== row && board[r][col] === num) return false
  }
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if ((r !== row || c !== col) && board[r][c] === num) return false
    }
  }
  return true
}

/** 获取某个位置的候选数字 */
export function getCandidates(board: Board, row: number, col: number): number[] {
  if (board[row][col] !== 0) return []
  const candidates: number[] = []
  for (let n = 1; n <= 9; n++) {
    if (isValid(board, row, col, n)) candidates.push(n)
  }
  return candidates
}
