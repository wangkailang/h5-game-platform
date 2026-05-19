import { use2048 } from './use2048'
import styles from './Game2048.module.css'

function Game2048() {
  const game = use2048()

  return (
    <div
      className={styles.container}
      onTouchStart={game.handleTouchStart}
      onTouchEnd={game.handleTouchEnd}
    >
      {/* 计分板 */}
      <div className={styles.scoreboard}>
        <div className={styles.scoreBox}>
          <span className={styles.scoreLabel}>分数</span>
          <span className={styles.scoreValue}>{game.score}</span>
        </div>
        <div className={styles.scoreBox}>
          <span className={styles.scoreLabel}>最高</span>
          <span className={styles.scoreValue}>{game.bestScore}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className={styles.toolbar}>
        <button className={styles.toolBtn} onClick={game.restart}>🔄 新游戏</button>
        <button
          className={styles.toolBtn}
          onClick={game.undo}
          disabled={!game.canUndo}
        >
          ↩️ 撤销
        </button>
      </div>

      {/* 游戏棋盘 */}
      <div className={styles.board}>
        {/* 背景格子 */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className={styles.cellBg} />
        ))}

        {/* 数字方块 */}
        {game.grid.map((row, r) =>
          row.map((val, c) =>
            val !== 0 ? (
              <div
                key={`${r}-${c}-${val}`}
                className={`${styles.tile} ${styles[`tile${val > 4096 ? 'Super' : val}`]}`}
                style={{
                  left: `${c * 25}%`,
                  top: `${r * 25}%`,
                }}
              >
                {val}
              </div>
            ) : null,
          ),
        )}
      </div>

      {/* 2048 胜利弹窗 */}
      {game.status === 'won' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🎉</div>
            <h2>恭喜达成 2048！</h2>
            <p>分数：{game.score}</p>
            <div className={styles.cardActions}>
              <button className={styles.btnPrimary} onClick={game.handleContinue}>
                继续挑战
              </button>
              <button className={styles.btnSecondary} onClick={game.restart}>
                新游戏
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over 弹窗 */}
      {game.status === 'lost' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>😵</div>
            <h2>游戏结束</h2>
            <p>分数：{game.score}</p>
            <p>最高：{game.bestScore}</p>
            <button className={styles.btnPrimary} onClick={game.restart}>
              再来一局
            </button>
          </div>
        </div>
      )}

      {/* 操作提示 */}
      <p className={styles.hint}>⬆⬇⬅➡ 或 WASD 滑动方块</p>
    </div>
  )
}

export default Game2048
