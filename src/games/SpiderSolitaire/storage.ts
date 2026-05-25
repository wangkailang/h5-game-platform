/**
 * 持久化 — localStorage 存档：各难度最佳成绩、可恢复的当前牌局、设置项。
 * 全部读写都做安全解析，损坏数据直接回退到默认值，绝不抛出。
 */

import type { Difficulty, SpiderState } from './engine'

const STORAGE_KEY = 'spider-solitaire:v1'
const VERSION = 1

export interface BestStat {
  bestScore: number
  fewestMoves: number
  bestTimeSec: number
  wins: number
}

export interface Settings {
  difficulty: Difficulty
  animations: boolean
}

export interface CurrentGame {
  state: SpiderState
  elapsedSec: number
}

export interface SpiderStore {
  version: number
  bestStats: Partial<Record<Difficulty, BestStat>>
  current: CurrentGame | null
  settings: Settings
}

const DEFAULT_STORE: SpiderStore = {
  version: VERSION,
  bestStats: {},
  current: null,
  settings: { difficulty: 1, animations: true },
}

function safeRead(): SpiderStore {
  if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_STORE }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STORE }
    const parsed = JSON.parse(raw) as SpiderStore
    if (!parsed || parsed.version !== VERSION) return { ...DEFAULT_STORE }
    return {
      version: VERSION,
      bestStats: parsed.bestStats ?? {},
      current: parsed.current ?? null,
      settings: { ...DEFAULT_STORE.settings, ...(parsed.settings ?? {}) },
    }
  } catch {
    return { ...DEFAULT_STORE }
  }
}

function safeWrite(store: SpiderStore): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* 配额满 / 隐私模式：静默忽略 */
  }
}

export function loadStore(): SpiderStore {
  return safeRead()
}

export function saveSettings(settings: Partial<Settings>): void {
  const store = safeRead()
  store.settings = { ...store.settings, ...settings }
  safeWrite(store)
}

export function saveCurrentGame(state: SpiderState, elapsedSec: number): void {
  const store = safeRead()
  // 仅保存进行中的牌局；结束局清空
  store.current = state.status === 'playing' ? { state, elapsedSec } : null
  safeWrite(store)
}

export function clearCurrentGame(): void {
  const store = safeRead()
  store.current = null
  safeWrite(store)
}

/** 记录一局胜利成绩，仅当优于历史时更新最佳值 */
export function recordResult(
  difficulty: Difficulty,
  score: number,
  moves: number,
  timeSec: number,
): BestStat {
  const store = safeRead()
  const prev = store.bestStats[difficulty]
  const next: BestStat = {
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    fewestMoves: Math.min(prev?.fewestMoves ?? Infinity, moves),
    bestTimeSec: Math.min(prev?.bestTimeSec ?? Infinity, timeSec),
    wins: (prev?.wins ?? 0) + 1,
  }
  store.bestStats[difficulty] = next
  store.current = null
  safeWrite(store)
  return next
}
