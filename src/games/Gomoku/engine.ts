/**
 * 五子棋引擎 — 状态管理、胜负判断、AI 对弈
 */

export type Player = 'black' | 'white'
export type CellState = Player | null

export interface Position {
  row: number
  col: number
}

export interface GomokuState {
  board: CellState[][]
  currentPlayer: Player
  winner: Player | null
  winningLine: Position[] | null
  status: 'idle' | 'playing' | 'gameover'
  moveHistory: Position[]
  blackScore: number
  whiteScore: number
  mode: 'pvp' | 'pve'
  aiThinking: boolean
}

// ─── 常量 ───
export const BOARD_SIZE = 15
export const CELL_SIZE = 28
export const PADDING = 20
export const CANVAS_SIZE = BOARD_SIZE * CELL_SIZE + PADDING * 2
export const STONE_RADIUS = CELL_SIZE / 2 - 2

const SCORE_KEY = 'gomoku_scores'

// ─── 工具函数 ───

function getScores(): { black: number; white: number } {
  try {
    const saved = localStorage.getItem(SCORE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return { black: 0, white: 0 }
}

function saveScores(black: number, white: number): void {
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify({ black, white }))
  } catch { /* ignore */ }
}

function createEmptyBoard(): CellState[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  )
}

// ─── 初始化 ───

export function createInitialState(mode: 'pvp' | 'pve' = 'pvp'): GomokuState {
  const scores = getScores()
  return {
    board: createEmptyBoard(),
    currentPlayer: 'black',
    winner: null,
    winningLine: null,
    status: 'idle',
    moveHistory: [],
    blackScore: scores.black,
    whiteScore: scores.white,
    mode,
    aiThinking: false,
  }
}

// ─── 落子逻辑 ───

export function placeStone(state: GomokuState, pos: Position): GomokuState {
  if (state.status === 'gameover') return state
  if (state.board[pos.row][pos.col] !== null) return state
  if (state.aiThinking) return state

  const newBoard = state.board.map(row => [...row])
  newBoard[pos.row][pos.col] = state.currentPlayer

  const newHistory = [...state.moveHistory, pos]

  // 检查胜负
  const winResult = checkWin(newBoard, pos, state.currentPlayer)

  let newStatus = state.status === 'idle' ? 'playing' : state.status
  let newWinner = state.winner
  let newWinLine = state.winningLine
  let newBlackScore = state.blackScore
  let newWhiteScore = state.whiteScore

  if (winResult) {
    newStatus = 'gameover'
    newWinner = state.currentPlayer
    newWinLine = winResult
    if (state.currentPlayer === 'black') {
      newBlackScore++
    } else {
      newWhiteScore++
    }
    saveScores(newBlackScore, newWhiteScore)
  } else if (newHistory.length === BOARD_SIZE * BOARD_SIZE) {
    // 平局
    newStatus = 'gameover'
  }

  const nextPlayer: Player = state.currentPlayer === 'black' ? 'white' : 'black'

  return {
    ...state,
    board: newBoard,
    currentPlayer: nextPlayer,
    winner: newWinner,
    winningLine: newWinLine,
    status: newStatus,
    moveHistory: newHistory,
    blackScore: newBlackScore,
    whiteScore: newWhiteScore,
  }
}

// ─── 胜负判断 ───

const DIRECTIONS: [number, number][] = [
  [0, 1],   // 水平
  [1, 0],   // 垂直
  [1, 1],   // 右下对角
  [1, -1],  // 左下对角
]

function checkWin(board: CellState[][], lastMove: Position, player: Player): Position[] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const line: Position[] = [lastMove]

    // 正方向
    for (let i = 1; i < 5; i++) {
      const r = lastMove.row + dr * i
      const c = lastMove.col + dc * i
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break
      if (board[r][c] !== player) break
      line.push({ row: r, col: c })
    }

    // 反方向
    for (let i = 1; i < 5; i++) {
      const r = lastMove.row - dr * i
      const c = lastMove.col - dc * i
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break
      if (board[r][c] !== player) break
      line.push({ row: r, col: c })
    }

    if (line.length >= 5) {
      return line
    }
  }

  return null
}

// ─── AI 逻辑 ───

/** 简单 AI：基于评分函数选择最佳位置 */
export function aiMove(state: GomokuState): Position {
  const board = state.board
  let bestScore = -Infinity
  let bestPos: Position = { row: 7, col: 7 }

  // 遍历所有空位
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) continue

      // 评估该位置的分数
      const score = evaluatePosition(board, r, c, 'white') +
                    evaluatePosition(board, r, c, 'black') * 0.9

      if (score > bestScore) {
        bestScore = score
        bestPos = { row: r, col: c }
      }
    }
  }

  return bestPos
}

function evaluatePosition(board: CellState[][], row: number, col: number, player: Player): number {
  let totalScore = 0

  for (const [dr, dc] of DIRECTIONS) {
    const lineInfo = getLineInfo(board, row, col, dr, dc, player)
    totalScore += scoreLine(lineInfo)
  }

  return totalScore
}

interface LineInfo {
  count: number      // 连续棋子数
  openEnds: number   // 开放端数 (0, 1, 2)
  totalSpace: number // 总可用空间
}

function getLineInfo(
  board: CellState[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: Player
): LineInfo {
  let count = 1
  let openEnds = 0
  let totalSpace = 1

  // 正方向
  let blocked = false
  for (let i = 1; i <= 4; i++) {
    const r = row + dr * i
    const c = col + dc * i
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
      blocked = true
      break
    }
    if (board[r][c] === player) {
      count++
      totalSpace++
    } else if (board[r][c] === null) {
      openEnds++
      totalSpace++
      break
    } else {
      blocked = true
      break
    }
  }

  // 反方向
  for (let i = 1; i <= 4; i++) {
    const r = row - dr * i
    const c = col - dc * i
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
      break
    }
    if (board[r][c] === player) {
      count++
      totalSpace++
    } else if (board[r][c] === null) {
      openEnds++
      break
    } else {
      break
    }
  }

  return { count, openEnds, totalSpace }
}

function scoreLine(info: LineInfo): number {
  const { count, openEnds } = info

  if (count >= 5) return 1000000 // 已赢
  if (openEnds === 0) return 0    // 两端都堵死

  const scores: Record<number, number[]> = {
    4: [0, 100000, 1000000],     // 4 子
    3: [0, 1000, 10000],         // 3 子
    2: [0, 100, 1000],           // 2 子
    1: [0, 10, 100],             // 1 子
  }

  if (count >= 4) {
    return openEnds === 2 ? scores[4][2] : scores[4][1]
  }
  if (count === 3) {
    return openEnds === 2 ? scores[3][2] : scores[3][1]
  }
  if (count === 2) {
    return openEnds === 2 ? scores[2][2] : scores[2][1]
  }
  if (count === 1) {
    return openEnds === 2 ? scores[1][2] : scores[1][1]
  }

  return 0
}

// ─── 渲染 ───

const COLORS = {
  board: '#DEB887',
  grid: '#8B7355',
  black: '#1a1a1a',
  white: '#f0f0f0',
  blackShadow: 'rgba(0,0,0,0.3)',
  whiteShadow: 'rgba(0,0,0,0.2)',
  highlight: 'rgba(255, 50, 50, 0.6)',
  winHighlight: 'rgba(255, 215, 0, 0.5)',
  lastMove: 'rgba(255, 0, 0, 0.6)',
}

export function render(ctx: CanvasRenderingContext2D, state: GomokuState): void {
  const size = CANVAS_SIZE

  // 棋盘背景
  ctx.fillStyle = COLORS.board
  ctx.fillRect(0, 0, size, size)

  // 棋盘纹理
  ctx.fillStyle = 'rgba(0,0,0,0.02)'
  for (let i = 0; i < size; i += 4) {
    ctx.fillRect(0, i, size, 1)
  }

  // 网格线
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1

  for (let i = 0; i < BOARD_SIZE; i++) {
    const pos = PADDING + i * CELL_SIZE

    // 横线
    ctx.beginPath()
    ctx.moveTo(PADDING, pos)
    ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, pos)
    ctx.stroke()

    // 竖线
    ctx.beginPath()
    ctx.moveTo(pos, PADDING)
    ctx.lineTo(pos, PADDING + (BOARD_SIZE - 1) * CELL_SIZE)
    ctx.stroke()
  }

  // 星位（天元和四星）
  const starPoints = [
    { row: 3, col: 3 }, { row: 3, col: 11 },
    { row: 7, col: 7 }, // 天元
    { row: 11, col: 3 }, { row: 11, col: 11 },
  ]

  ctx.fillStyle = COLORS.grid
  for (const sp of starPoints) {
    const x = PADDING + sp.col * CELL_SIZE
    const y = PADDING + sp.row * CELL_SIZE
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  // 绘制棋子
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = state.board[r][c]
      if (cell) {
        drawStone(ctx, r, c, cell, false)
      }
    }
  }

  // 高亮获胜线
  if (state.winningLine) {
    for (const pos of state.winningLine) {
      const x = PADDING + pos.col * CELL_SIZE
      const y = PADDING + pos.row * CELL_SIZE
      ctx.fillStyle = COLORS.winHighlight
      ctx.beginPath()
      ctx.arc(x, y, STONE_RADIUS + 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 最后一步标记
  if (state.moveHistory.length > 0) {
    const last = state.moveHistory[state.moveHistory.length - 1]
    const x = PADDING + last.col * CELL_SIZE
    const y = PADDING + last.row * CELL_SIZE
    ctx.fillStyle = COLORS.lastMove
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  // 状态提示
  if (state.status === 'idle') {
    drawOverlay(ctx, size, '⚫ 五子棋大师', '点击棋盘开始游戏')
  } else if (state.status === 'gameover') {
    if (state.winner) {
      const winnerText = state.winner === 'black' ? '⚫ 黑棋' : '⚪ 白棋'
      drawOverlay(ctx, size, `${winnerText} 获胜！`, '点击重新开始')
    } else {
      drawOverlay(ctx, size, '🤝 平局', '点击重新开始')
    }
  } else if (state.aiThinking) {
    drawOverlay(ctx, size, '🤔 AI 思考中...', '请稍候')
  }
}

function drawStone(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  player: Player,
  isLast: boolean
): void {
  const x = PADDING + col * CELL_SIZE
  const y = PADDING + row * CELL_SIZE

  // 阴影
  ctx.fillStyle = player === 'black' ? COLORS.blackShadow : COLORS.whiteShadow
  ctx.beginPath()
  ctx.arc(x + 1.5, y + 1.5, STONE_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  // 棋子主体
  const gradient = ctx.createRadialGradient(
    x - STONE_RADIUS * 0.3,
    y - STONE_RADIUS * 0.3,
    STONE_RADIUS * 0.1,
    x,
    y,
    STONE_RADIUS
  )

  if (player === 'black') {
    gradient.addColorStop(0, '#4a4a4a')
    gradient.addColorStop(1, COLORS.black)
  } else {
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(1, '#d0d0d0')
  }

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  // 边框
  ctx.strokeStyle = player === 'black' ? '#000' : '#999'
  ctx.lineWidth = 0.5
  ctx.stroke()
}

function drawOverlay(ctx: CanvasRenderingContext2D, size: number, title: string, sub: string): void {
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
