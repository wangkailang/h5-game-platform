/**
 * 蜘蛛纸牌引擎 — 纯函数式游戏逻辑（不含任何 UI / 动画状态）
 */

// ─── 类型定义 ───

export type Suit = '♠' | '♥' | '♦' | '♣'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

/** 难度 = 花色数量。1=初级 2=中级 3=高级 4=大师 */
export type Difficulty = 1 | 2 | 3 | 4

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
  id: string // 唯一标识，用于 React key 与动画追踪
}

export type Column = Card[]

export interface SpiderState {
  columns: Column[] // 10 列牌
  stock: Card[] // 发牌堆
  foundations: Card[][] // 已完成的牌组（最多 8 组）
  moves: number // 移动次数
  score: number // 分数
  status: 'playing' | 'won' | 'lost'
  difficulty: Difficulty // 花色数量
  selectedCard: { colIndex: number; cardIndex: number } | null // 点击模式下选中的牌
  hint: { from: number; to: number } | null // 提示
}

// ─── 常量 ───

export const COLUMN_COUNT = 10
export const FOUNDATION_COUNT = 8
export const INITIAL_COLUMN_COUNTS = [6, 6, 6, 6, 5, 5, 5, 5, 5, 5] // 前 4 列 6 张，后 6 列 5 张

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export const RANK_VALUES: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '初级',
  2: '中级',
  3: '高级',
  4: '大师',
}

// ─── 随机数（可选种子，便于复现牌局） ───

/** mulberry32：确定性 PRNG，相同种子产生相同序列 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── 工具函数 ───

let cardCounter = 0
function createCard(suit: Suit, rank: Rank, faceUp = false): Card {
  return { suit, rank, faceUp, id: `${suit}${rank}-${cardCounter++}` }
}

function suitsFor(suitCount: number): Suit[] {
  switch (suitCount) {
    case 1: return ['♠']
    case 2: return ['♠', '♥']
    case 3: return ['♠', '♥', '♦']
    default: return SUITS
  }
}

function createDeck(suitCount: number): Card[] {
  const deck: Card[] = []
  const suits = suitsFor(suitCount)
  // 蜘蛛纸牌固定 104 张（两副），按所选花色循环填充
  const copiesPerSuit = 104 / (13 * suits.length)
  for (let c = 0; c < copiesPerSuit; c++) {
    for (const suit of suits) {
      for (const rank of RANKS) {
        deck.push(createCard(suit, rank))
      }
    }
  }
  return deck
}

function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getRankValue(rank: Rank): number {
  return RANK_VALUES[rank]
}

function isNextRank(current: Rank, next: Rank): boolean {
  return getRankValue(next) === getRankValue(current) + 1
}

function isSameSuit(a: Card, b: Card): boolean {
  return a.suit === b.suit
}

// ─── 初始化 ───

export function createInitialState(difficulty: Difficulty = 1, seed?: number): SpiderState {
  const rng = seed === undefined ? Math.random : mulberry32(seed)
  const deck = shuffleArray(createDeck(difficulty), rng)
  const columns: Column[] = []
  let cardIndex = 0

  for (let i = 0; i < COLUMN_COUNT; i++) {
    const column: Column = []
    const count = INITIAL_COLUMN_COUNTS[i]
    for (let j = 0; j < count; j++) {
      const card = deck[cardIndex++]
      card.faceUp = j === count - 1 // 仅最后一张面朝上
      column.push(card)
    }
    columns.push(column)
  }

  const stock = deck.slice(cardIndex)

  return {
    columns,
    stock,
    foundations: [],
    moves: 0,
    score: 500,
    status: 'playing',
    difficulty,
    selectedCard: null,
    hint: null,
  }
}

// ─── 移动合法性 ───

/** 从某列 cardIndex 起的牌是否构成「同花色、连续递减」的可整体移动序列 */
export function isMovableSequence(column: Column, cardIndex: number): boolean {
  if (cardIndex < 0 || cardIndex >= column.length) return false
  if (!column[cardIndex].faceUp) return false
  for (let i = cardIndex; i < column.length - 1; i++) {
    if (!column[i].faceUp || !column[i + 1].faceUp) return false
    if (!isSameSuit(column[i], column[i + 1])) return false
    if (!isNextRank(column[i + 1].rank, column[i].rank)) return false
  }
  return true
}

export function canMoveCards(state: SpiderState, fromCol: number, cardIndex: number, toCol: number): boolean {
  if (fromCol === toCol) return false
  const fromColumn = state.columns[fromCol]
  const toColumn = state.columns[toCol]
  if (!isMovableSequence(fromColumn, cardIndex)) return false

  const movingCard = fromColumn[cardIndex]
  if (toColumn.length === 0) return true // 空列可放任意可移动序列

  const targetCard = toColumn[toColumn.length - 1]
  // 蜘蛛纸牌可跨花色叠放（只需点数递减）；同花色才可成组移除
  return isNextRank(movingCard.rank, targetCard.rank)
}

// ─── 移动 ───

export function moveCards(state: SpiderState, fromCol: number, cardIndex: number, toCol: number): SpiderState {
  if (!canMoveCards(state, fromCol, cardIndex, toCol)) return state

  const newState: SpiderState = { ...state }
  const fromColumn = [...state.columns[fromCol]]
  const toColumn = [...state.columns[toCol]]
  const movingCards = fromColumn.splice(cardIndex)

  if (fromColumn.length > 0 && !fromColumn[fromColumn.length - 1].faceUp) {
    fromColumn[fromColumn.length - 1] = { ...fromColumn[fromColumn.length - 1], faceUp: true }
    newState.score += 5
  }

  toColumn.push(...movingCards)
  newState.columns = [...state.columns]
  newState.columns[fromCol] = fromColumn
  newState.columns[toCol] = toColumn
  newState.moves++
  newState.score = Math.max(0, newState.score - 1)

  checkAndRemoveCompleteSequence(newState, toCol)

  newState.selectedCard = null
  newState.hint = null

  if (newState.foundations.length === FOUNDATION_COUNT) {
    newState.status = 'won'
    newState.score += 1000
  }

  return newState
}

function checkAndRemoveCompleteSequence(state: SpiderState, colIndex: number): void {
  const column = state.columns[colIndex]
  if (column.length < 13) return

  const last13 = column.slice(-13)
  const suit = last13[0].suit
  if (!last13.every((c) => c.suit === suit && c.faceUp)) return
  for (let i = 0; i < 13; i++) {
    if (last13[i].rank !== RANKS[12 - i]) return // 必须 K→A
  }

  state.columns[colIndex] = column.slice(0, -13)
  state.foundations = [...state.foundations, last13]
  state.score += 100

  if (state.columns[colIndex].length > 0) {
    const top = state.columns[colIndex][state.columns[colIndex].length - 1]
    if (!top.faceUp) {
      state.columns[colIndex] = [...state.columns[colIndex]]
      state.columns[colIndex][state.columns[colIndex].length - 1] = { ...top, faceUp: true }
    }
  }
}

// ─── 发牌 ───

export function canDeal(state: SpiderState): boolean {
  return (
    state.status === 'playing' &&
    state.stock.length > 0 &&
    !state.columns.some((col) => col.length === 0)
  )
}

export function dealFromStock(state: SpiderState): SpiderState {
  if (!canDeal(state)) return state

  const newState: SpiderState = { ...state }
  const newStock = [...state.stock]
  const newColumns = [...state.columns]

  for (let i = 0; i < COLUMN_COUNT; i++) {
    if (newStock.length === 0) break
    const card = { ...newStock.pop()!, faceUp: true }
    newColumns[i] = [...newColumns[i], card]
  }

  newState.stock = newStock
  newState.columns = newColumns
  newState.moves++
  newState.score = Math.max(0, newState.score - 1)
  newState.selectedCard = null
  newState.hint = null

  for (let i = 0; i < COLUMN_COUNT; i++) {
    checkAndRemoveCompleteSequence(newState, i)
  }

  if (newState.foundations.length === FOUNDATION_COUNT) {
    newState.status = 'won'
    newState.score += 1000
  } else if (!hasValidMoves(newState)) {
    newState.status = 'lost'
  }

  return newState
}

function hasValidMoves(state: SpiderState): boolean {
  for (let fromCol = 0; fromCol < COLUMN_COUNT; fromCol++) {
    const column = state.columns[fromCol]
    if (column.length === 0) continue
    // 任一可移动序列的起点，尝试落到其他列
    for (let cardIndex = 0; cardIndex < column.length; cardIndex++) {
      if (!isMovableSequence(column, cardIndex)) continue
      for (let toCol = 0; toCol < COLUMN_COUNT; toCol++) {
        if (canMoveCards(state, fromCol, cardIndex, toCol)) return true
      }
      break // 同列只需检查最上方的可移动序列起点
    }
  }
  if (canDeal(state)) return true
  return false
}

// ─── 点击模式 ───

export function selectCard(state: SpiderState, colIndex: number, cardIndex: number): SpiderState {
  const column = state.columns[colIndex]
  if (cardIndex >= column.length || !column[cardIndex].faceUp) return state

  if (state.selectedCard) {
    const { colIndex: fromCol, cardIndex: fromCardIndex } = state.selectedCard
    if (fromCol === colIndex) {
      return { ...state, selectedCard: null, hint: null } // 再次点击取消
    }
    if (canMoveCards(state, fromCol, fromCardIndex, colIndex)) {
      return moveCards(state, fromCol, fromCardIndex, colIndex)
    }
    // 目标不合法 → 改为选中新点击的序列
    if (isMovableSequence(column, cardIndex)) {
      return { ...state, selectedCard: { colIndex, cardIndex }, hint: null }
    }
    return { ...state, selectedCard: null, hint: null }
  }

  if (!isMovableSequence(column, cardIndex)) return state
  return { ...state, selectedCard: { colIndex, cardIndex }, hint: null }
}

// ─── 提示 ───

export function getHint(state: SpiderState): SpiderState {
  for (let fromCol = 0; fromCol < COLUMN_COUNT; fromCol++) {
    const column = state.columns[fromCol]
    if (column.length === 0) continue
    for (let cardIndex = 0; cardIndex < column.length; cardIndex++) {
      if (!isMovableSequence(column, cardIndex)) continue
      for (let toCol = 0; toCol < COLUMN_COUNT; toCol++) {
        if (canMoveCards(state, fromCol, cardIndex, toCol)) {
          return { ...state, hint: { from: fromCol, to: toCol } }
        }
      }
      break
    }
  }
  return { ...state, hint: null }
}

// ─── 自动完成 ───

export function canAutoComplete(state: SpiderState): boolean {
  if (state.status !== 'playing') return false
  return state.columns.every((col) => col.every((c) => c.faceUp)) && state.stock.length === 0
}

export function autoComplete(state: SpiderState): SpiderState {
  const newState: SpiderState = {
    ...state,
    columns: state.columns.map((c) => [...c]),
    foundations: [...state.foundations],
  }
  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < COLUMN_COUNT; i++) {
      const before = newState.foundations.length
      checkAndRemoveCompleteSequence(newState, i)
      if (newState.foundations.length !== before) changed = true
    }
  }
  if (newState.foundations.length === FOUNDATION_COUNT) {
    newState.status = 'won'
    newState.score += 1000
  }
  return newState
}

// ─── 渲染辅助 ───

export function getCardColor(card: Card): string {
  return card.suit === '♥' || card.suit === '♦' ? '#d83a3a' : '#1f2d3d'
}
