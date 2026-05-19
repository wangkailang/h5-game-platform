/**
 * 2048 游戏引擎 — 网格操作、滑动合并、胜负检测
 */

export type Grid = number[][] // 0 表示空格
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export interface GameState {
  grid: Grid
  score: number
  bestScore: number
  status: 'playing' | 'won' | 'lost'
  won: boolean // 是否已达成 2048（达成后可继续玩）
  moved: boolean // 上一步是否有效移动
}

const SIZE = 4
const WIN_TILE = 2048
const BEST_SCORE_KEY = '2048_best_score'

// ─── 工具 ───

function getBestScore(): number {
  try { return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0 } catch { return 0 }
}

function saveBestScore(score: number): void {
  try { localStorage.setItem(BEST_SCORE_KEY, String(score)) } catch { /* ignore */ }
}

/** 创建空网格 */
function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

/** 克隆网格 */
function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row])
}

/** 获取所有空格坐标 */
function getEmptyCells(grid: Grid): [number, number][] {
  const cells: [number, number][] = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) cells.push([r, c])
    }
  }
  return cells
}

/** 在随机空格生成新数字（90% 概率 2，10% 概率 4） */
function spawnTile(grid: Grid): Grid {
  const empty = getEmptyCells(grid)
  if (empty.length === 0) return grid
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  const newGrid = cloneGrid(grid)
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4
  return newGrid
}

// ─── 初始化 ───

export function createInitialState(): GameState {
  let grid = emptyGrid()
  grid = spawnTile(grid)
  grid = spawnTile(grid)
  return {
    grid,
    score: 0,
    bestScore: getBestScore(),
    status: 'playing',
    won: false,
    moved: false,
  }
}

// ─── 核心逻辑：滑动一行 ───

function slideRow(row: number[]): { row: number[]; score: number; moved: boolean } {
  // 1. 去除零
  let filtered = row.filter((v) => v !== 0)
  let score = 0

  // 2. 合并相邻相同数字
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2
      score += filtered[i]
      filtered.splice(i + 1, 1)
    }
  }

  // 3. 补零
  while (filtered.length < SIZE) filtered.push(0)

  const moved = filtered.some((v, i) => v !== row[i])
  return { row: filtered, score, moved }
}

// ─── 核心逻辑：整个网格滑动 ───

export function move(state: GameState, direction: Direction): GameState {
  if (state.status === 'lost') return state

  let grid = cloneGrid(state.grid)
  let totalScore = 0
  let anyMoved = false

  const process = (row: number[]) => {
    const result = slideRow(row)
    totalScore += result.score
    if (result.moved) anyMoved = true
    return result.row
  }

  switch (direction) {
    case 'LEFT':
      for (let r = 0; r < SIZE; r++) grid[r] = process(grid[r])
      break
    case 'RIGHT':
      for (let r = 0; r < SIZE; r++) grid[r] = process(grid[r].reverse()).reverse()
      break
    case 'UP':
      for (let c = 0; c < SIZE; c++) {
        const col = grid.map((row) => row[c])
        const result = process(col)
        for (let r = 0; r < SIZE; r++) grid[r][c] = result[r]
      }
      break
    case 'DOWN':
      for (let c = 0; c < SIZE; c++) {
        const col = grid.map((row) => row[c]).reverse()
        const result = process(col).reverse()
        for (let r = 0; r < SIZE; r++) grid[r][c] = result[r]
      }
      break
  }

  if (!anyMoved) return { ...state, moved: false }

  // 生成新方块
  grid = spawnTile(grid)

  const newScore = state.score + totalScore
  const newBest = Math.max(newScore, state.bestScore)
  saveBestScore(newBest)

  // 检查是否达成 2048
  let won = state.won
  if (!won) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] >= WIN_TILE) won = true
      }
    }
  }

  // 检查是否游戏结束
  const lost = !canMove(grid)

  return {
    grid,
    score: newScore,
    bestScore: newBest,
    status: lost ? 'lost' : won && !state.won ? 'won' : 'playing',
    won,
    moved: true,
  }
}

/** 检查是否还有可用移动 */
function canMove(grid: Grid): boolean {
  // 有空格就能继续
  if (getEmptyCells(grid).length > 0) return true
  // 检查是否有相邻相同数字
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c]
      if (c < SIZE - 1 && grid[r][c + 1] === v) return true
      if (r < SIZE - 1 && grid[r + 1][c] === v) return true
    }
  }
  return false
}

/** 继续游戏（达成 2048 后） */
export function continueGame(state: GameState): GameState {
  return { ...state, status: 'playing' }
}
