import { useMatch3 } from './useMatch3'
import { CANDY_EMOJIS } from './engine'
import styles from './Match3.module.css'

function Match3() {
  const game = useMatch3()

  const selectedKey = game.selected ? `${game.selected.r},${game.selected.c}` : null

  return (
    <div className={styles.container}>
      {/* 计分板 */}
      <div className={styles.scoreboard}>
        <div className={styles.scoreBox}>
          <span className={styles.scoreLabel}>分数</span>
          <span className={styles.scoreValue}>{game.score}</span>
        </div>
        <div className={`${styles.scoreBox} ${styles.scoreBoxMoves}`}>
          <span className={styles.scoreLabel}>步数</span>
          <span className={styles.scoreValue}>{game.moves}</span>
        </div>
        <div className={`${styles.scoreBox} ${styles.scoreBoxTarget}`}>
          <span className={styles.scoreLabel}>最高</span>
          <span className={styles.scoreValue}>{game.bestScore}</span>
        </div>
      </div>

      {/* 目标提示 */}
      <div className={styles.goalBar}>
        🎯 目标分数：<span>{game.target}</span> 分 | 剩余 <span>{game.moves}</span> 步
      </div>

      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <button className={styles.toolBtn} onClick={game.restart}>🔄 重新开始</button>
      </div>

      {/* 棋盘 */}
      <div className={styles.board}>
        {game.grid.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`
            const isSelected = key === selectedKey
            const isMatched = game.matchedCells.has(key)

            let cellClass = styles.cell
            if (isSelected) cellClass += ` ${styles.cellSelected}`
            if (isMatched) cellClass += ` ${styles.cellMatched}`

            return (
              <div
                key={key}
                className={cellClass}
                onClick={() => game.handleCellClick(r, c)}
              >
                {cell >= 0 ? CANDY_EMOJIS[cell] : ''}
              </div>
            )
          }),
        )}
      </div>

      {/* 胜利弹窗 */}
      {game.status === 'won' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🎉</div>
            <h2>恭喜通关！</h2>
            <p>得分：{game.score}</p>
            <p>剩余步数：{game.moves}</p>
            <div className={styles.cardActions}>
              <button className={styles.btnPrimary} onClick={game.restart}>
                再来一局
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 失败弹窗 */}
      {game.status === 'lost' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>😿</div>
            <h2>挑战失败</h2>
            <p>得分：{game.score}</p>
            <p>目标：{game.target}</p>
            <div className={styles.cardActions}>
              <button className={styles.btnPrimary} onClick={game.restart}>
                再来一局
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 操作提示 */}
      <p className={styles.hint}>点击选中糖果，再点击相邻糖果交换，三个连成一线即可消除</p>
    </div>
  )
}

export default Match3
