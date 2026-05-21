import { useGomoku } from './useGomoku'
import { CANVAS_SIZE } from './engine'
import styles from './Gomoku.module.css'

function Gomoku() {
  const game = useGomoku('pve')

  return (
    <div className={styles.container}>
      {/* 计分板 */}
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span className={styles.blackStone}>⚫</span>
          <span className={styles.scoreValue}>{game.blackScore}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.scoreLabel}>
            {game.mode === 'pve' ? '人机' : '双人'}
          </span>
          <span className={styles.currentTurn}>
            {game.status === 'playing'
              ? game.currentPlayer === 'black' ? '黑棋' : '白棋'
              : '准备'}
          </span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.whiteStone}>⚪</span>
          <span className={styles.scoreValue}>{game.whiteScore}</span>
        </div>
      </div>

      {/* 游戏画布 */}
      <div className={styles.canvasWrap}>
        <canvas
          ref={game.canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className={styles.canvas}
          onClick={game.handleClick}
        />
      </div>

      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <button className={styles.toolBtn} onClick={game.undo} disabled={game.moveHistory.length < 2}>
          ↩ 悔棋
        </button>
        <button className={styles.toolBtn} onClick={game.toggleMode}>
          {game.mode === 'pve' ? '👥 双人' : '🤖 人机'}
        </button>
        <button className={styles.toolBtn} onClick={game.restart}>
          🔄 重来
        </button>
      </div>
    </div>
  )
}

export default Gomoku
