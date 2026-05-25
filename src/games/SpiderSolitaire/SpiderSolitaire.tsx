import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSpiderSolitaire } from './useSpiderSolitaire'
import {
  COLUMN_COUNT,
  FOUNDATION_COUNT,
  DIFFICULTY_LABELS,
  getCardColor,
  type Card,
  type Difficulty,
  type SpiderState,
} from './engine'
import {
  computeLayout,
  CARD_W,
  CARD_H,
  BOARD_W,
  TABLEAU_TOP,
  FACE_UP_OFFSET,
  type CardPos,
} from './layout'
import styles from './SpiderSolitaire.module.css'

const MIN_SCALE = 0.32
const MAX_SCALE = 1.15
const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4]

function formatTime(sec: number): string {
  if (!isFinite(sec)) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function CardFace({ card }: { card: Card }) {
  const color = getCardColor(card)
  return (
    <div className={styles.cardFront} style={{ color }}>
      <div className={styles.cornerTop}>
        <span className={styles.cornerRank}>{card.rank}</span>
        <span className={styles.cornerSuit}>{card.suit}</span>
      </div>
      <div className={styles.centerSuit}>{card.suit}</div>
      <div className={styles.cornerBottom}>
        <span className={styles.cornerRank}>{card.rank}</span>
        <span className={styles.cornerSuit}>{card.suit}</span>
      </div>
    </div>
  )
}

function SpiderSolitaire() {
  const game = useSpiderSolitaire()
  const { setScale: setBoardScale } = game
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const layout = useMemo(
    () =>
      computeLayout({
        columns: game.columns,
        stock: game.stock,
        foundations: game.foundations,
      } as SpiderState),
    [game.columns, game.stock, game.foundations],
  )

  // 按容器宽度等比缩放整块棋盘
  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (w - 4) / BOARD_W))
      setScale(next)
      setBoardScale(next)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [setBoardScale])

  // 胜利彩带
  const confetti = useMemo(() => {
    if (!game.showWin) return []
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2.4 + Math.random() * 1.8,
      hue: Math.floor(Math.random() * 360),
      size: 6 + Math.random() * 8,
    }))
  }, [game.showWin])

  // ─── 派生：选中 / 提示集合 ───
  const selectedIds = new Set<string>()
  if (game.selectedCard) {
    const col = game.columns[game.selectedCard.colIndex]
    col?.slice(game.selectedCard.cardIndex).forEach((c) => selectedIds.add(c.id))
  }
  let hintFromId: string | null = null
  let hintToId: string | null = null
  if (game.hint) {
    const fromCol = game.columns[game.hint.from]
    const toCol = game.columns[game.hint.to]
    if (fromCol?.length) hintFromId = fromCol[fromCol.length - 1].id
    if (toCol?.length) hintToId = toCol[toCol.length - 1].id
  }

  const dragIdSet = new Set(game.dragState.cardIds)

  // 拖拽中：把指针位置换算到棋盘坐标
  let dragBase: { x: number; y: number } | null = null
  if (game.dragState.active) {
    const b = game.toBoard(game.dragState.pointerX, game.dragState.pointerY)
    dragBase = { x: b.x - game.dragState.grabOffsetX, y: b.y - game.dragState.grabOffsetY }
  }

  // 落点高亮位置
  const dropHint = useMemo(() => {
    const t = game.dragState.validTarget
    if (t === null || t === undefined) return null
    const col = game.columns[t]
    if (!col || col.length === 0) return { x: layout.columnX[t], y: TABLEAU_TOP }
    const last = col[col.length - 1]
    const pos = layout.positions.get(last.id)
    if (!pos) return null
    return { x: pos.x, y: pos.y + FACE_UP_OFFSET }
  }, [game.dragState.validTarget, game.columns, layout])

  // 所有牌的扁平列表（含 stock / foundations），用稳定 id 渲染
  const allCards: { card: Card; colIndex: number; cardIndex: number }[] = []
  game.columns.forEach((col, colIndex) =>
    col.forEach((card, cardIndex) => allCards.push({ card, colIndex, cardIndex })),
  )
  game.stock.forEach((card) => allCards.push({ card, colIndex: -1, cardIndex: -1 }))
  game.foundations.forEach((set) => set.forEach((card) => allCards.push({ card, colIndex: -2, cardIndex: -1 })))

  const transitionsOn = game.animations && !game.dragState.active

  const renderCard = ({ card, colIndex, cardIndex }: { card: Card; colIndex: number; cardIndex: number }) => {
    const isDragged = dragIdSet.has(card.id)
    const basePos: CardPos | undefined = layout.positions.get(card.id)
    if (!basePos && !isDragged) return null

    let x = basePos?.x ?? 0
    let y = basePos?.y ?? 0
    let z = basePos?.z ?? 0
    if (isDragged && dragBase) {
      const i = game.dragState.cardIds.indexOf(card.id)
      x = dragBase.x
      y = dragBase.y + i * FACE_UP_OFFSET
      z = 9000 + i
    }

    const faceUp = isDragged ? true : basePos?.faceUp ?? card.faceUp
    const region = basePos?.region
    const dealDelay =
      game.dealAnimating && region === 'tableau' && basePos?.col !== undefined ? basePos.col * 28 : 0

    const cls = [
      styles.card,
      isDragged ? styles.dragging : '',
      selectedIds.has(card.id) ? styles.selected : '',
      card.id === hintFromId || card.id === hintToId ? styles.hint : '',
      transitionsOn ? styles.animated : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        key={card.id}
        className={cls}
        style={{
          width: CARD_W,
          height: CARD_H,
          transform: `translate(${x}px, ${y}px)`,
          zIndex: z,
          transitionDelay: dealDelay ? `${dealDelay}ms` : undefined,
        }}
        onPointerDown={(e) => {
          if (region === 'stock' || region === 'foundation') return
          if (!faceUp) return
          e.preventDefault()
          game.startPointer(colIndex, cardIndex, e.clientX, e.clientY)
        }}
      >
        <div className={styles.cardInner} style={{ transform: `rotateY(${faceUp ? 0 : 180}deg)` }}>
          <CardFace card={card} />
          <div className={styles.cardBack} />
        </div>
      </div>
    )
  }

  // 胜利时锁定页面滚动
  useEffect(() => {
    if (game.showWin) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [game.showWin])

  const completed = game.foundations.length

  return (
    <div className={styles.container}>
      {/* 顶部工具栏 */}
      <div className={styles.topbar}>
        <div className={styles.stats}>
          <Stat label="分数" value={game.score} />
          <Stat label="时间" value={formatTime(game.elapsedSec)} />
          <Stat label="步数" value={game.moves} />
          <Stat label="完成" value={`${completed}/${FOUNDATION_COUNT}`} />
          <Stat label="最佳" value={game.bestStat ? game.bestStat.bestScore : '—'} />
        </div>
        <div className={styles.controls}>
          <button className={styles.btn} onClick={game.handleDeal} disabled={!game.canDeal} title="发牌 (D)">
            🃏 发牌
          </button>
          <button className={styles.btn} onClick={game.handleHint} title="提示 (H)">
            💡 提示
          </button>
          <button className={styles.btn} onClick={game.handleUndo} disabled={!game.canUndo} title="撤销 (Ctrl+Z)">
            ↩︎ 撤销
          </button>
          {game.canAutoComplete && (
            <button className={`${styles.btn} ${styles.accent}`} onClick={game.handleAutoComplete} title="自动完成 (Ctrl+A)">
              ✨ 自动
            </button>
          )}
          <button className={styles.btn} onClick={game.handleRestart} title="重新开始 (Ctrl+R)">
            ⟳ 新局
          </button>
          <button
            className={`${styles.btn} ${game.animations ? styles.on : ''}`}
            onClick={game.toggleAnimations}
            title="动画开关"
          >
            🎬
          </button>
        </div>
      </div>

      {/* 难度选择 */}
      <div className={styles.difficultyBar}>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            className={`${styles.diffBtn} ${game.difficulty === d ? styles.active : ''}`}
            onClick={() => game.handleDifficultyChange(d)}
          >
            {DIFFICULTY_LABELS[d]}
            <span className={styles.diffSub}>{d} 花色</span>
          </button>
        ))}
      </div>

      {/* 棋盘缩放容器 */}
      <div className={styles.boardScroll}>
        <div ref={wrapperRef} className={styles.boardWrapper} style={{ height: layout.height * scale }}>
          <div
            ref={game.boardRef}
            className={styles.board}
            style={{ width: BOARD_W, height: layout.height, transform: `scale(${scale})` }}
          >
            {/* 完成堆槽位 */}
            {layout.foundationSlots.map((slot, i) => (
              <div
                key={`f${i}`}
                className={styles.slot}
                style={{ transform: `translate(${slot.x}px, ${slot.y}px)`, width: CARD_W, height: CARD_H }}
              >
                {i < completed && <span className={styles.slotCheck}>✓</span>}
              </div>
            ))}

            {/* 发牌堆槽位 + 可点击发牌区 */}
            <div
              className={`${styles.stockSlot} ${game.canDeal ? styles.stockReady : styles.stockEmpty}`}
              style={{
                transform: `translate(${layout.stockSlot.x}px, ${layout.stockSlot.y}px)`,
                width: CARD_W,
                height: CARD_H,
              }}
              onClick={game.canDeal ? game.handleDeal : undefined}
            >
              <span className={styles.stockCount}>{game.stock.length}</span>
              {game.stock.length > 0 && (
                <span className={styles.stockRounds}>剩 {Math.ceil(game.stock.length / COLUMN_COUNT)} 发</span>
              )}
            </div>

            {/* 空列占位 */}
            {game.columns.map((col, i) =>
              col.length === 0 ? (
                <div
                  key={`empty${i}`}
                  className={styles.emptyColumn}
                  style={{ transform: `translate(${layout.columnX[i]}px, ${TABLEAU_TOP}px)`, width: CARD_W, height: CARD_H }}
                />
              ) : null,
            )}

            {/* 落点高亮 */}
            {dropHint && (
              <div
                className={styles.dropHint}
                style={{ transform: `translate(${dropHint.x}px, ${dropHint.y}px)`, width: CARD_W, height: CARD_H }}
              />
            )}

            {/* 所有牌 */}
            {allCards.map(renderCard)}
          </div>
        </div>
      </div>

      {/* 胜利庆祝 */}
      {game.showWin && (
        <div className={styles.overlay}>
          <div className={styles.confetti}>
            {confetti.map((c) => (
              <span
                key={c.id}
                className={styles.confettiPiece}
                style={{
                  left: `${c.left}%`,
                  width: c.size,
                  height: c.size * 1.4,
                  background: `hsl(${c.hue} 90% 60%)`,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.duration}s`,
                }}
              />
            ))}
          </div>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>🏆</div>
            <h2 className={styles.modalTitle}>恭喜通关！</h2>
            <div className={styles.modalStats}>
              <div><span>难度</span><strong>{DIFFICULTY_LABELS[game.difficulty]}</strong></div>
              <div><span>得分</span><strong>{game.score}</strong></div>
              <div><span>用时</span><strong>{formatTime(game.elapsedSec)}</strong></div>
              <div><span>步数</span><strong>{game.moves}</strong></div>
            </div>
            {game.bestStat && (
              <p className={styles.bestLine}>
                最佳：{game.bestStat.bestScore} 分 · {formatTime(game.bestStat.bestTimeSec)} · 已通关 {game.bestStat.wins} 次
              </p>
            )}
            <div className={styles.modalBtns}>
              <button className={`${styles.modalBtn} ${styles.primary}`} onClick={game.handleRestart}>
                再来一局
              </button>
              <button className={styles.modalBtn} onClick={() => game.setShowWin(false)}>
                查看牌面
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 失败 */}
      {game.status === 'lost' && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>😵</div>
            <h2 className={styles.modalTitle}>无路可走</h2>
            <p className={styles.bestLine}>没有可移动的牌，也无法继续发牌。</p>
            <div className={styles.modalBtns}>
              <button className={`${styles.modalBtn} ${styles.primary}`} onClick={game.handleRestart}>
                重新开始
              </button>
              <button className={styles.modalBtn} onClick={game.handleUndo} disabled={!game.canUndo}>
                撤销上一步
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}

export default SpiderSolitaire
