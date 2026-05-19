import { useSnake } from './useSnake'
import { CANVAS_SIZE } from './engine'
import styles from './Snake.module.css'
import type { Direction } from './engine'

function Snake() {
  const game = useSnake()

  return (
    <div className={styles.container}>
      {/* 计分板 */}
      <div className={styles.scoreboard}>
        <div className={styles.scoreItem}>
          <span className={styles.scoreLabel}>分数</span>
          <span className={styles.scoreValue}>{game.score}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.scoreLabel}>最高</span>
          <span className={styles.scoreValue}>{game.highScore}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.scoreLabel}>速度</span>
          <span className={styles.scoreValue}>Lv.{game.speed}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.scoreLabel}>长度</span>
          <span className={styles.scoreValue}>{game.snake.length}</span>
        </div>
      </div>

      {/* 游戏画布 */}
      <div
        className={styles.canvasWrap}
        onTouchStart={game.handleTouchStart}
        onTouchEnd={game.handleTouchEnd}
        onClick={() => {
          if (game.status === 'idle') game.start()
        }}
      >
        <canvas
          ref={game.canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className={styles.canvas}
        />
      </div>

      {/* Game Over 弹窗 */}
      {game.status === 'gameover' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>💀</div>
            <h2>游戏结束</h2>
            <div className={styles.cardStats}>
              <p>得分：<strong>{game.score}</strong></p>
              <p>最高：<strong>{game.highScore}</strong></p>
              <p>蛇长度：{game.snake.length}</p>
            </div>
            <button className={styles.restartBtn} onClick={game.restart}>
              再来一局
            </button>
          </div>
        </div>
      )}

      {/* 虚拟方向键 */}
      <div className={styles.dpad}>
        <div className={styles.dpadRow}>
          <button
            className={styles.dpadBtn}
            onClick={() => game.changeDirection('UP' as Direction)}
          >
            ⬆
          </button>
        </div>
        <div className={styles.dpadRow}>
          <button
            className={styles.dpadBtn}
            onClick={() => game.changeDirection('LEFT' as Direction)}
          >
            ⬅
          </button>
          <button
            className={`${styles.dpadBtn} ${styles.dpadCenter}`}
            onClick={game.togglePause}
          >
            {game.status === 'playing' ? '⏸' : '▶'}
          </button>
          <button
            className={styles.dpadBtn}
            onClick={() => game.changeDirection('RIGHT' as Direction)}
          >
            ➡
          </button>
        </div>
        <div className={styles.dpadRow}>
          <button
            className={styles.dpadBtn}
            onClick={() => game.changeDirection('DOWN' as Direction)}
          >
            ⬇
          </button>
        </div>
      </div>
    </div>
  )
}

export default Snake
