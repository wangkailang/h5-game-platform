import http from '@/utils/http'
import type { Game, Category, ApiResponse } from '@/types'

/** 获取游戏列表 */
export function fetchGames(params?: { category?: string; page?: number; pageSize?: number }) {
  return http.get<ApiResponse<{ list: Game[]; total: number }>>('/games', { params })
}

/** 获取游戏详情 */
export function fetchGameDetail(id: string) {
  return http.get<ApiResponse<Game>>(`/games/${id}`)
}

/** 获取推荐游戏 */
export function fetchRecommendGames() {
  return http.get<ApiResponse<Game[]>>('/games/recommend')
}

/** 获取热门游戏 */
export function fetchHotGames() {
  return http.get<ApiResponse<Game[]>>('/games/hot')
}

/** 获取游戏分类列表 */
export function fetchCategories() {
  return http.get<ApiResponse<Category[]>>('/categories')
}

/** 搜索游戏 */
export function searchGames(keyword: string) {
  return http.get<ApiResponse<Game[]>>('/games/search', { params: { keyword } })
}
