/**
 * 布局模型 — 将 SpiderState 映射为「每张牌的绝对坐标」。
 *
 * 渲染层把每张牌渲染成 position:absolute + transform:translate(x,y)，
 * 并对 transform 加 CSS 过渡。于是「移动 / 发牌 / 翻牌 / 入完成堆」
 * 全部由坐标变化驱动，过渡自动补间动画。坐标使用固定设计尺寸，
 * 整块棋盘再按容器宽度等比缩放（见组件中的 scale）。
 */

import { COLUMN_COUNT, FOUNDATION_COUNT, type SpiderState } from './engine'

export const CARD_W = 80
export const CARD_H = 112
export const COL_GAP = 11
export const PAD = 14
export const FACE_DOWN_OFFSET = 16 // 面朝下牌的纵向叠放间距
export const FACE_UP_OFFSET = 30 // 面朝上牌的纵向叠放间距
export const TOP_H = CARD_H + 26 // 顶部区域（发牌堆 + 完成堆）高度
export const FOUNDATION_FAN = 30 // 完成堆之间的横向间距

export const BOARD_W = PAD * 2 + COLUMN_COUNT * CARD_W + (COLUMN_COUNT - 1) * COL_GAP
export const TABLEAU_TOP = PAD + TOP_H

export type Region = 'stock' | 'tableau' | 'foundation'

export interface CardPos {
  x: number
  y: number
  z: number
  faceUp: boolean
  region: Region
  /** 牌桌中：所在列 / 在列中的深度（用于命中检测与动画分组） */
  col?: number
  depth?: number
}

export interface Slot {
  x: number
  y: number
}

export interface BoardLayout {
  positions: Map<string, CardPos>
  columnX: number[] // 每列左上角 x
  foundationSlots: Slot[] // 8 个完成堆槽位
  stockSlot: Slot // 发牌堆槽位
  width: number
  height: number
}

export function columnLeft(col: number): number {
  return PAD + col * (CARD_W + COL_GAP)
}

export function computeLayout(state: SpiderState): BoardLayout {
  const positions = new Map<string, CardPos>()

  const columnX: number[] = []
  for (let c = 0; c < COLUMN_COUNT; c++) columnX.push(columnLeft(c))

  const stockSlot: Slot = { x: BOARD_W - PAD - CARD_W, y: PAD }
  const foundationSlots: Slot[] = []
  for (let f = 0; f < FOUNDATION_COUNT; f++) {
    foundationSlots.push({ x: PAD + f * FOUNDATION_FAN, y: PAD })
  }

  // 牌桌
  let maxBottom = TABLEAU_TOP + CARD_H
  for (let c = 0; c < COLUMN_COUNT; c++) {
    const column = state.columns[c]
    let y = TABLEAU_TOP
    for (let d = 0; d < column.length; d++) {
      const card = column[d]
      positions.set(card.id, {
        x: columnX[c],
        y,
        z: d,
        faceUp: card.faceUp,
        region: 'tableau',
        col: c,
        depth: d,
      })
      y += card.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET
    }
    // 该列最后一张牌的顶部 y = y - 它自身的 offset；底部再加 CARD_H
    const lastOffset = column.length
      ? column[column.length - 1].faceUp
        ? FACE_UP_OFFSET
        : FACE_DOWN_OFFSET
      : 0
    maxBottom = Math.max(maxBottom, y - lastOffset + CARD_H)
  }

  // 发牌堆：全部面朝下叠放在右上角，越靠顶部越偏移一点点形成厚度感
  const stockCount = state.stock.length
  for (let i = 0; i < stockCount; i++) {
    const fromTop = stockCount - 1 - i
    const card = state.stock[i]
    positions.set(card.id, {
      x: stockSlot.x - fromTop * 0.6,
      y: stockSlot.y - fromTop * 0.5,
      z: i,
      faceUp: false,
      region: 'stock',
    })
  }

  // 完成堆：每组 13 张紧密叠放在对应槽位
  state.foundations.forEach((set, f) => {
    const slot = foundationSlots[f] ?? foundationSlots[FOUNDATION_COUNT - 1]
    set.forEach((card, k) => {
      positions.set(card.id, {
        x: slot.x + k * 0.4,
        y: slot.y + k * 0.4,
        z: f * 13 + k,
        faceUp: true,
        region: 'foundation',
      })
    })
  })

  const height = maxBottom + PAD

  return { positions, columnX, foundationSlots, stockSlot, width: BOARD_W, height }
}
