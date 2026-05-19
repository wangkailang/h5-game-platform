/**
 * 贪吃蛇引擎 — 状态管理、碰撞检测、渲染
 */

export interface Position {
  x: number
  y: number
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export interface SnakeState {
  snake: Position[]
  food: Position
  direction: Direction
  nextDirection: Direction
  score: number
  highScore: number
  status: 'idle' | 'playing' | 'paused' | 'gameover'
  speed: number
  foodEaten: number
}

// ─── 常量 ───
export const GRID_COUNT = 20
export const CELL_SIZE = 16
export const CANVAS_SIZE = GRID_COUNT * CELL_SIZE
export const INITIAL_SPEED = 5
export const MAX_SPEED = 15
export const SPEED_UP_EVERY = 5

const HIGH_SCORE_KEY = 'snake_high_score'

// ─── 工具函数 ───

function getHighScore(): number {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0
  } catch {
    return 0
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score))
  } catch { /* ignore */ }
}

function randomFood(snake: Position[]): Position {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`))
  let pos: Position
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_COUNT),
      y: Math.floor(Math.random() * GRID_COUNT),
    }
  } while (occupied.has(`${pos.x},${pos.y}`))
  return pos
}

// ─── 初始化 ───

export function createInitialState(): SnakeState {
  const mid = Math.floor(GRID_COUNT / 2)
  const snake: Position[] = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ]
  return {
    snake,
    food: randomFood(snake),
    direction: 'RIGHT',
    nextDirection: 'RIGHT',
    score: 0,
    highScore: getHighScore(),
    status: 'idle',
    speed: INITIAL_SPEED,
    foodEaten: 0,
  }
}

// ─── 方向辅助 ───

const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b
}

// ─── 游戏逻辑 ───

export function tick(state: SnakeState): SnakeState {
  if (state.status !== 'playing') return state

  const head = state.snake[0]
  const dir = state.nextDirection
  const delta: Record<Direction, Position> = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
  }
  const newHead: Position = {
    x: head.x + delta[dir].x,
    y: head.y + delta[dir].y,
  }

  // 撞墙
  if (newHead.x < 0 || newHead.x >= GRID_COUNT || newHead.y < 0 || newHead.y >= GRID_COUNT) {
    return gameOver(state)
  }

  // 撞自身
  if (state.snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
    return gameOver(state)
  }

  const newSnake = [newHead, ...state.snake]
  let newFood = state.food
  let newScore = state.score
  let newFoodEaten = state.foodEaten
  let newSpeed = state.speed

  // 吃到食物
  if (newHead.x === state.food.x && newHead.y === state.food.y) {
    newFoodEaten++
    newScore += 10 + state.speed * 2
    newFood = randomFood(newSnake)
    if (newFoodEaten % SPEED_UP_EVERY === 0 && newSpeed < MAX_SPEED) {
      newSpeed++
    }
  } else {
    newSnake.pop()
  }

  return {
    ...state,
    snake: newSnake,
    food: newFood,
    direction: dir,
    score: newScore,
    foodEaten: newFoodEaten,
    speed: newSpeed,
  }
}

function gameOver(state: SnakeState): SnakeState {
  const newHighScore = Math.max(state.score, state.highScore)
  saveHighScore(newHighScore)
  return { ...state, status: 'gameover', highScore: newHighScore }
}

// ─── 渲染 ───

const COLORS = {
  bg: '#f0f0f0',
  grid: '#e8e8e8',
  snakeHead: '#6c5ce7',
  snakeBody: '#a29bfe',
  snakeTail: '#ddd6ff',
  food: '#ff6b6b',
  foodGlow: 'rgba(255, 107, 107, 0.25)',
  eye: '#fff',
}

export function render(ctx: CanvasRenderingContext2D, state: SnakeState): void {
  const size = CANVAS_SIZE

  // 背景
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, size, size)

  // 网格
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 0.5
  for (let i = 0; i <= GRID_COUNT; i++) {
    const pos = i * CELL_SIZE
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(size, pos); ctx.stroke()
  }

  // 食物光晕
  const fx = state.food.x * CELL_SIZE + CELL_SIZE / 2
  const fy = state.food.y * CELL_SIZE + CELL_SIZE / 2
  const grad = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL_SIZE)
  grad.addColorStop(0, COLORS.foodGlow)
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(
    state.food.x * CELL_SIZE - CELL_SIZE / 2,
    state.food.y * CELL_SIZE - CELL_SIZE / 2,
    CELL_SIZE * 2,
    CELL_SIZE * 2,
  )
  // 食物本体
  ctx.fillStyle = COLORS.food
  ctx.beginPath()
  ctx.arc(fx, fy, CELL_SIZE / 2 - 1, 0, Math.PI * 2)
  ctx.fill()

  // 蛇
  state.snake.forEach((seg, i) => {
    const x = seg.x * CELL_SIZE
    const y = seg.y * CELL_SIZE
    const ratio = i / Math.max(state.snake.length, 1)

    ctx.fillStyle =
      i === 0 ? COLORS.snakeHead
      : ratio < 0.5 ? COLORS.snakeBody
      : COLORS.snakeTail

    const pad = i === 0 ? 0.5 : 1
    const r = i === 0 ? 4 : 3

    roundRect(ctx, x + pad, y + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, r)
    ctx.fill()

    // 蛇眼睛
    if (i === 0) {
      ctx.fillStyle = COLORS.eye
      const cx = x + CELL_SIZE / 2
      const cy = y + CELL_SIZE / 2
      let ex1: number, ey1: number, ex2: number, ey2: number
      switch (state.direction) {
        case 'UP':    ex1 = cx - 3; ey1 = cy - 3; ex2 = cx + 3; ey2 = cy - 3; break
        case 'DOWN':  ex1 = cx - 3; ey1 = cy + 3; ex2 = cx + 3; ey2 = cy + 3; break
        case 'LEFT':  ex1 = cx - 3; ey1 = cy - 3; ex2 = cx - 3; ey2 = cy + 3; break
        case 'RIGHT': ex1 = cx + 3; ey1 = cy - 3; ex2 = cx + 3; ey2 = cy + 3; break
      }
      ctx.beginPath(); ctx.arc(ex1, ey1, 2.5, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(ex2, ey2, 2.5, 0, Math.PI * 2); ctx.fill()
    }
  })

  // 覆盖提示
  if (state.status === 'idle') {
    drawOverlay(ctx, size, '🐍 贪吃蛇大作战', '点击屏幕或按方向键开始')
  } else if (state.status === 'paused') {
    drawOverlay(ctx, size, '⏸ 已暂停', '按空格键继续')
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawOverlay(ctx: CanvasRenderingContext2D, size: number, title: string, sub: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 20px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, size / 2, size / 2 - 12)
  ctx.font = '12px -apple-system, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(sub, size / 2, size / 2 + 14)
}

// ─── 速度 → 间隔(ms) ───
export function speedToInterval(speed: number): number {
  return Math.max(60, 200 - (speed - 1) * 10)
}
