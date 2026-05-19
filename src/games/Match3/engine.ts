/**
 * 消消乐 (Match-3) 游戏引擎
 *
 * 8×8 棋盘，6 种糖果类型，三消玩法
 */

export const ROWS = 8
export const COLS = 8
export const CANDY_TYPES = 6

/** 糖果 emoji（类型索引 → 图标） */
export const CANDY_EMOJIS = ['🍬', '🍭', '🍫', '🍩', '🍪', '🧁']

export type Cell = number // 0..5 糖果类型，-1 = 空
export type Grid = Cell[][]
export type Position = { r: number; c: number }

export type GameStatus = 'idle' | 'playing' | 'animating' | 'won' | 'lost'

export interface Match3State {
  grid: Grid
  score: number
  bestScore: number
  moves: number        // 剩余步数
  target: number       // 目标分数
  status: GameStatus
  selected: Position | null
  matchedCells: Set<string> // 本轮被消除的格子 "r,c"
  chainCount: number   // 连锁次数
}

// ─── 常量 ───

const MAX_MOVES = 30
const TARGET_SCORE = 2000
const BEST_KEY = 'match3_best_score'

// ─── 工具函数 ───

function posKey(r: number, c: number): string {
  return `${r},${c}`
}

function getBestScore(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}

function randomCandy(): Cell {
  return Math.floor(Math.random() * CANDY_TYPES)
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row])
}

// ─── 初始化（保证无预匹配） ───

export function createCleanGrid(): Grid {
  const grid: Grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let type: Cell
      let attempts = 0
      do {
        type = randomCandy()
        attempts++
      } while (attempts < 50 && wouldMatch(grid, r, c, type))
      grid[r][c] = type
    }
  }
  return grid
}

/** 判断在 (r,c) 放入 type 是否会导致横向或纵向 3 连 */
function wouldMatch(grid: Grid, r: number, c: number, type: Cell): boolean {
  // 横向：检查左边两个
  if (c >= 2 && grid[r][c - 1] === type && grid[r][c - 2] === type) return true
  // 纵向：检查上面两个
  if (r >= 2 && grid[r - 1][c] === type && grid[r - 2][c] === type) return true
  return false
}

// ─── 创建初始状态 ───

export function createInitialState(): Match3State {
  return {
    grid: createCleanGrid(),
    score: 0,
    bestScore: getBestScore(),
    moves: MAX_MOVES,
    target: TARGET_SCORE,
    status: 'playing',
    selected: null,
    matchedCells: new Set(),
    chainCount: 0,
  }
}

// ─── 交换 ───

export function swapCells(grid: Grid, a: Position, b: Position): Grid {
  const newGrid = cloneGrid(grid)
  const tmp = newGrid[a.r][a.c]
  newGrid[a.r][a.c] = newGrid[b.r][b.c]
  newGrid[b.r][b.c] = tmp
  return newGrid
}

/** 判断两个格子是否相邻（上下左右） */
export function isAdjacent(a: Position, b: Position): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1
}

// ─── 查找所有匹配 ───

export function findMatches(grid: Grid): Set<string> {
  const matched = new Set<string>()

  // 横向扫描
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 2; c++) {
      const v = grid[r][c]
      if (v < 0) continue
      if (grid[r][c + 1] === v && grid[r][c + 2] === v) {
        // 找到延伸长度
        let end = c + 2
        while (end + 1 < COLS && grid[r][end + 1] === v) end++
        for (let k = c; k <= end; k++) matched.add(posKey(r, k))
        c = end
      }
    }
  }

  // 纵向扫描
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 2; r++) {
      const v = grid[r][c]
      if (v < 0) continue
      if (grid[r + 1][c] === v && grid[r + 2][c] === v) {
        let end = r + 2
        while (end + 1 < ROWS && grid[end + 1][c] === v) end++
        for (let k = r; k <= end; k++) matched.add(posKey(k, c))
        r = end
      }
    }
  }

  return matched
}

// ─── 消除匹配 ───

export function removeMatches(grid: Grid, matched: Set<string>): Grid {
  const newGrid = cloneGrid(grid)
  for (const key of matched) {
    const [r, c] = key.split(',').map(Number)
    newGrid[r][c] = -1
  }
  return newGrid
}

// ─── 重力下落 ───

export function applyGravity(grid: Grid): Grid {
  const newGrid = cloneGrid(grid)
  for (let c = 0; c < COLS; c++) {
    // 从底部向上收集非空格子
    const nonEmpty: Cell[] = []
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newGrid[r][c] >= 0) nonEmpty.push(newGrid[r][c])
    }
    // 从底部填充
    for (let r = ROWS - 1; r >= 0; r--) {
      const idx = ROWS - 1 - r
      newGrid[r][c] = idx < nonEmpty.length ? nonEmpty[idx] : -1
    }
  }
  return newGrid
}

// ─── 填充新糖果 ───

export function fillEmpty(grid: Grid): Grid {
  const newGrid = cloneGrid(grid)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (newGrid[r][c] < 0) {
        newGrid[r][c] = randomCandy()
      }
    }
  }
  return newGrid
}

// ─── 检查是否有可用移动 ───

export function hasValidMoves(grid: Grid): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // 尝试向右交换
      if (c + 1 < COLS) {
        const testGrid = swapCells(grid, { r, c }, { r, c: c + 1 })
        if (findMatches(testGrid).size > 0) return true
      }
      // 尝试向下交换
      if (r + 1 < ROWS) {
        const testGrid = swapCells(grid, { r, c }, { r: r + 1, c })
        if (findMatches(testGrid).size > 0) return true
      }
    }
  }
  return false
}

// ─── 计算消除得分 ───

export function calcMatchScore(matchCount: number, chainCount: number): number {
  // 基础分：每颗 10 分
  const base = matchCount * 10
  // 连锁加成：每级 1.5 倍
  const multiplier = Math.pow(1.5, chainCount)
  return Math.round(base * multiplier)
}

// ─── 处理一轮交换 ───

export interface SwapResult {
  grid: Grid
  matched: Set<string>
  scoreGain: number
  valid: boolean // 交换是否有效（产生了匹配）
}

export function trySwap(state: Match3State, a: Position, b: Position): SwapResult {
  const swapped = swapCells(state.grid, a, b)
  const matched = findMatches(swapped)

  if (matched.size === 0) {
    return { grid: state.grid, matched: new Set(), scoreGain: 0, valid: false }
  }

  return { grid: swapped, matched, scoreGain: 0, valid: true }
}

/** 消除 → 下落 → 填充 → 再消除的完整连锁处理（同步一步） */
export function processMatchesStep(grid: Grid): { grid: Grid; matched: Set<string> } {
  const matched = findMatches(grid)
  if (matched.size === 0) return { grid, matched }
  const cleared = removeMatches(grid, matched)
  const dropped = applyGravity(cleared)
  const filled = fillEmpty(dropped)
  return { grid: filled, matched }
}
