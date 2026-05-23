import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Sudoku } from '@/games/Sudoku'
import { Snake } from '@/games/Snake'
import { Game2048 } from '@/games/Game2048'
import { Match3 } from '@/games/Match3'
import { Jump } from '@/games/Jump'
import { Gomoku } from '@/games/Gomoku'
import { Tetris } from '@/games/Tetris'
import { getGameById } from '@/data/games'
import styles from './GamePlay.module.css'

/** 内置游戏映射表 */
const BUILTIN_GAMES: Record<string, React.ComponentType> = {
  '1': Game2048, // 2048 经典版
  '2': Snake,    // 贪吃蛇大作战
  '3': Jump,     // 跳一跳
  '4': Gomoku,   // 五子棋大师
  '5': Match3,   // 消消乐
  '8': Sudoku,   // 数独挑战
  '9': Tetris,   // 俄罗斯方块
  // 后续可扩展更多内置游戏
}

/**
 * 游戏运行页面
 * 优先加载内置 React 游戏组件，否则通过 iframe 加载外部 H5 游戏
 */
function GamePlay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const BuiltinGame = id ? BUILTIN_GAMES[id] : null
  const gameData = id ? getGameById(id) : undefined

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleExit = () => {
    navigate(-1)
  }

  return (
    <div className={styles.container}>
      {/* 游戏顶部工具栏 */}
      <div className={styles.toolbar}>
        <button className={styles.backBtn} onClick={handleExit}>
          ← 退出
        </button>
        <span className={styles.gameTitle}>
          {gameData ? gameData.name : '游戏中'}
        </span>
        <div style={{ width: 60 }} />
      </div>

      {/* 游戏内容区域 */}
      {BuiltinGame ? (
        <div className={styles.builtinGame}>
          <BuiltinGame />
        </div>
      ) : (
        <iframe
          src={`/games/${id}/index.html`}
          className={styles.gameFrame}
          title="H5 Game"
          allow="autoplay; fullscreen; microphone"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      )}
    </div>
  )
}

export default GamePlay
