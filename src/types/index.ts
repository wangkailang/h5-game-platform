/** 游戏信息 */
export interface Game {
  id: string
  name: string
  icon: string
  banner?: string
  description: string
  category: string
  tags: string[]
  rating: number
  playCount: number
  url: string // H5 游戏入口 URL
  developer: string
  createdAt: string
}

/** 用户信息 */
export interface User {
  id: string
  nickname: string
  avatar: string
  level: number
  achievements: Achievement[]
  favoriteGames: string[] // 游戏 ID 列表
  playHistory: PlayRecord[]
}

/** 游戏记录 */
export interface PlayRecord {
  gameId: string
  playedAt: string
  duration: number // 秒
  score?: number
}

/** 成就 */
export interface Achievement {
  id: string
  name: string
  icon: string
  description: string
  unlockedAt?: string
}

/** 分类 */
export interface Category {
  id: string
  name: string
  icon: string
}

/** API 通用响应 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
