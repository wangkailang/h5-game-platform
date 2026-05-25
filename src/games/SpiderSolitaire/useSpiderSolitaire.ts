import { useState, useCallback, useEffect, useRef } from 'react'
import {
  createInitialState,
  selectCard,
  moveCards,
  dealFromStock,
  getHint,
  autoComplete,
  canMoveCards,
  canDeal,
  canAutoComplete,
  isMovableSequence,
  COLUMN_COUNT,
  type SpiderState,
  type Difficulty,
} from './engine'
import { computeLayout, CARD_W, COL_GAP, PAD, TABLEAU_TOP } from './layout'
import {
  loadStore,
  saveSettings,
  saveCurrentGame,
  clearCurrentGame,
  recordResult,
  type BestStat,
} from './storage'

const DRAG_THRESHOLD = 6 // 超过该位移(px)才判定为拖拽，否则视为点击
const HISTORY_LIMIT = 200
const HINT_DURATION = 2500
const DEAL_ANIM_MS = 550

export interface DragState {
  active: boolean
  fromCol: number
  fromCardIndex: number
  cardIds: string[]
  grabOffsetX: number // 抓取点相对牌左上角的偏移（棋盘坐标系）
  grabOffsetY: number
  pointerX: number // 客户端坐标
  pointerY: number
  validTarget: number | null
}

const EMPTY_DRAG: DragState = {
  active: false,
  fromCol: -1,
  fromCardIndex: -1,
  cardIds: [],
  grabOffsetX: 0,
  grabOffsetY: 0,
  pointerX: 0,
  pointerY: 0,
  validTarget: null,
}

export function useSpiderSolitaire() {
  const store = useRef(loadStore()).current

  const [state, setState] = useState<SpiderState>(() =>
    store.current ? store.current.state : createInitialState(store.settings.difficulty),
  )
  const [elapsedSec, setElapsedSec] = useState<number>(store.current?.elapsedSec ?? 0)
  const [paused, setPaused] = useState(false)
  const [forcedLandscape, setForcedLandscape] = useState<boolean>(store.settings.forcedLandscape ?? false)
  const [showWin, setShowWin] = useState(false)
  const [bestStat, setBestStat] = useState<BestStat | undefined>(store.bestStats[state.difficulty])
  const [dragState, setDragState] = useState<DragState>(EMPTY_DRAG)
  const [canUndo, setCanUndo] = useState(false)
  const [dealAnimating, setDealAnimating] = useState(false)

  const boardRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const historyRef = useRef<SpiderState[]>([])
  const elapsedRef = useRef(elapsedSec)
  const stateRef = useRef(state)
  const rotatedRef = useRef(forcedLandscape)
  const pausedRef = useRef(paused)
  const hintTimer = useRef<ReturnType<typeof setTimeout>>()
  const dealTimer = useRef<ReturnType<typeof setTimeout>>()
  const pending = useRef<{ col: number; cardIndex: number; startX: number; startY: number } | null>(null)

  elapsedRef.current = elapsedSec
  stateRef.current = state // 始终持有最新已提交状态，供事件回调读取
  rotatedRef.current = forcedLandscape
  pausedRef.current = paused

  const setScale = useCallback((s: number) => {
    scaleRef.current = s
  }, [])

  // ─── 坐标换算：客户端 → 棋盘设计坐标 ───
  // 横屏模式下棋盘整体顺时针旋转 90°，反推时交换坐标轴：
  // 屏幕纵向 → 棋盘 x，屏幕横向(自右往左) → 棋盘 y。
  const toBoard = useCallback((clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    const scale = scaleRef.current || 1
    if (!rect) return { x: clientX, y: clientY }
    if (rotatedRef.current) {
      return { x: (clientY - rect.top) / scale, y: (rect.right - clientX) / scale }
    }
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
  }, [])

  // ─── 历史 / 撤销 ───
  // 提交新状态：仅当「步数」变化（真实落子 / 发牌）时记入撤销历史，
  // 选中、提示等非落子变化不进历史。副作用绝不放进 setState updater，
  // 否则 StrictMode 下 updater 双调用会导致历史被重复压栈。
  const commit = useCallback((next: SpiderState) => {
    const prev = stateRef.current
    if (next === prev) return
    if (next.moves !== prev.moves) {
      historyRef.current.push(prev)
      if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift()
      setCanUndo(true)
    }
    stateRef.current = next
    setState(next)
  }, [])

  const resetHistory = useCallback(() => {
    historyRef.current = []
    setCanUndo(false)
  }, [])

  const apply = useCallback(
    (fn: (s: SpiderState) => SpiderState) => commit(fn(stateRef.current)),
    [commit],
  )

  // ─── 计时器 ───
  useEffect(() => {
    if (state.status !== 'playing' || paused) return
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [state.status, paused])

  // ─── 持久化：状态变化即存档 ───
  useEffect(() => {
    saveCurrentGame(state, elapsedRef.current)
  }, [state])

  // 卸载时存档最新计时
  useEffect(() => {
    return () => {
      if (state.status === 'playing') saveCurrentGame(state, elapsedRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── 胜利 / 失败处理 ───
  useEffect(() => {
    if (state.status === 'won') {
      const best = recordResult(state.difficulty, state.score, state.moves, elapsedRef.current)
      setBestStat(best)
      setShowWin(true)
    } else if (state.status === 'lost') {
      clearCurrentGame()
    }
  }, [state.status, state.difficulty, state.score, state.moves])

  // ─── 新游戏 / 难度 ───
  const newGame = useCallback(
    (difficulty: Difficulty) => {
      if (hintTimer.current) clearTimeout(hintTimer.current)
      resetHistory()
      const fresh = createInitialState(difficulty)
      stateRef.current = fresh
      setState(fresh)
      setElapsedSec(0)
      elapsedRef.current = 0
      setShowWin(false)
      setPaused(false)
      setBestStat(loadStore().bestStats[difficulty])
      saveSettings({ difficulty })
    },
    [resetHistory],
  )

  const handleRestart = useCallback(() => newGame(state.difficulty), [newGame, state.difficulty])
  const handleDifficultyChange = useCallback((d: Difficulty) => newGame(d), [newGame])

  // ─── 基础动作 ───
  const handleCardClick = useCallback(
    (colIndex: number, cardIndex: number) => apply((prev) => selectCard(prev, colIndex, cardIndex)),
    [apply],
  )

  const handleDeal = useCallback(() => {
    const prev = stateRef.current
    if (!canDeal(prev)) return
    commit(dealFromStock(prev))
    if (dealTimer.current) clearTimeout(dealTimer.current)
    setDealAnimating(true)
    dealTimer.current = setTimeout(() => setDealAnimating(false), DEAL_ANIM_MS)
  }, [commit])

  const handleHint = useCallback(() => {
    setState((prev) => getHint(prev))
    if (hintTimer.current) clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(
      () => setState((prev) => (prev.hint ? { ...prev, hint: null } : prev)),
      HINT_DURATION,
    )
  }, [])

  const handleUndo = useCallback(() => {
    const prev = historyRef.current.pop()
    if (!prev) return
    stateRef.current = prev
    setState(prev)
    setShowWin(false)
    setCanUndo(historyRef.current.length > 0)
  }, [])

  const handleAutoComplete = useCallback(() => apply((prev) => autoComplete(prev)), [apply])

  const togglePause = useCallback(() => setPaused((p) => !p), [])

  const toggleOrientation = useCallback(() => {
    setForcedLandscape((v) => {
      const next = !v
      saveSettings({ forcedLandscape: next })
      return next
    })
  }, [])

  // ─── 命中检测：棋盘坐标 → 目标列 ───
  const columnAt = useCallback((boardX: number, boardY: number): number | null => {
    if (boardY < TABLEAU_TOP - 40) return null // 落在顶部区域，不算牌桌
    const col = Math.round((boardX - PAD) / (CARD_W + COL_GAP))
    if (col < 0 || col >= COLUMN_COUNT) return null
    return col
  }, [])

  // ─── 拖拽 ───
  const startPointer = useCallback(
    (colIndex: number, cardIndex: number, clientX: number, clientY: number) => {
      if (pausedRef.current) return
      pending.current = { col: colIndex, cardIndex, startX: clientX, startY: clientY }
    },
    [],
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // 拖拽进行中
      if (dragState.active) {
        const b = toBoard(e.clientX, e.clientY)
        const col = columnAt(b.x, b.y)
        const valid =
          col !== null && canMoveCards(state, dragState.fromCol, dragState.fromCardIndex, col) ? col : null
        setDragState((d) => ({ ...d, pointerX: e.clientX, pointerY: e.clientY, validTarget: valid }))
        return
      }
      // 待定 → 判断是否升级为拖拽
      const p = pending.current
      if (!p) return
      const dist = Math.hypot(e.clientX - p.startX, e.clientY - p.startY)
      if (dist < DRAG_THRESHOLD) return
      const column = state.columns[p.col]
      if (!isMovableSequence(column, p.cardIndex)) {
        pending.current = null
        return
      }
      const layout = computeLayout(state)
      const pos = layout.positions.get(column[p.cardIndex].id)
      const b = toBoard(e.clientX, e.clientY)
      const grabOffsetX = pos ? b.x - pos.x : CARD_W / 2
      const grabOffsetY = pos ? b.y - pos.y : 20
      setState((prev) => (prev.selectedCard || prev.hint ? { ...prev, selectedCard: null, hint: null } : prev))
      setDragState({
        active: true,
        fromCol: p.col,
        fromCardIndex: p.cardIndex,
        cardIds: column.slice(p.cardIndex).map((c) => c.id),
        grabOffsetX,
        grabOffsetY,
        pointerX: e.clientX,
        pointerY: e.clientY,
        validTarget: null,
      })
    }

    const onUp = (e: PointerEvent) => {
      if (dragState.active) {
        const b = toBoard(e.clientX, e.clientY)
        const col = columnAt(b.x, b.y)
        const { fromCol, fromCardIndex } = dragState
        if (col !== null && canMoveCards(state, fromCol, fromCardIndex, col)) {
          apply((prev) => moveCards(prev, fromCol, fromCardIndex, col))
        }
        setDragState(EMPTY_DRAG)
      } else if (pending.current) {
        // 视为点击
        const { col, cardIndex } = pending.current
        handleCardClick(col, cardIndex)
      }
      pending.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragState, state, toBoard, columnAt, apply, handleCardClick])

  // ─── 键盘快捷键 ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pausedRef.current) return // 暂停时屏蔽所有快捷键
      const meta = e.ctrlKey || e.metaKey
      switch (e.key.toLowerCase()) {
        case 'd':
          if (!meta) { e.preventDefault(); handleDeal() }
          break
        case 'h':
          if (!meta) { e.preventDefault(); handleHint() }
          break
        case 'z':
          if (meta) { e.preventDefault(); handleUndo() }
          break
        case 'r':
          if (meta) { e.preventDefault(); handleRestart() }
          break
        case 'a':
          if (meta) { e.preventDefault(); handleAutoComplete() }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleDeal, handleHint, handleUndo, handleRestart, handleAutoComplete])

  return {
    ...state,
    elapsedSec,
    bestStat,
    paused,
    forcedLandscape,
    showWin,
    dragState,
    dealAnimating,
    canUndo,
    canDeal: canDeal(state),
    canAutoComplete: canAutoComplete(state),
    boardRef,
    setScale,
    toBoard,
    startPointer,
    handleCardClick,
    handleDeal,
    handleHint,
    handleUndo,
    handleRestart,
    handleDifficultyChange,
    handleAutoComplete,
    togglePause,
    toggleOrientation,
    setShowWin,
  }
}
