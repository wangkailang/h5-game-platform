import { create } from 'zustand'
import type { Game } from '@/types'

interface GameState {
  recommendGames: Game[]
  hotGames: Game[]
  currentGame: Game | null
  loading: boolean
  setRecommendGames: (games: Game[]) => void
  setHotGames: (games: Game[]) => void
  setCurrentGame: (game: Game | null) => void
  setLoading: (loading: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
  recommendGames: [],
  hotGames: [],
  currentGame: null,
  loading: false,

  setRecommendGames: (games) => set({ recommendGames: games }),
  setHotGames: (games) => set({ hotGames: games }),
  setCurrentGame: (game) => set({ currentGame: game }),
  setLoading: (loading) => set({ loading }),
}))
