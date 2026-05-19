import { useSudoku } from './useSudoku'
import styles from './Sudoku.module.css'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function Sudoku() {
  const game = useSudoku('medium')

  return (
    <div className={styles.container}>
      {/* 顶部状态栏 */}
      <div className={styles.statusBar}>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>难度</span>
          <select
            className={styles.difficultySelect}
            value={game.difficulty}
            onChange={(e) => game.changeDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
          >
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>错误</span>
          <span className={styles.statusValue}>{game.mistakes}/3</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>时间</span>
          <span className={styles.statusValue}>{formatTime(game.timer)}</span>
        </div>
      </div>

      {/* 完成弹窗 */}
      {game.isComplete && (
        <div className={styles.completeOverlay}>
          <div className={styles.completeCard}>
            <div className={styles.completeIcon}>🎉</div>
            <h2>恭喜完成！</h2>
            <p>用时 {formatTime(game.timer)}</p>
            <p>错误 {game.mistakes} 次</p>
            <button className={styles.restartBtn} onClick={game.restart}>
              再来一局
            </button>
          </div>
        </div>
      )}

      {/* 数独棋盘 */}
      <div className={styles.board}>
        {game.board.map((row, r) => (
          <div key={r} className={styles.row}>
            {row.map((cell, c) => {
              const isSelected =
                game.selectedCell?.row === r && game.selectedCell?.col === c
              const isInitial = game.puzzle[r][c] !== 0
              const isConflict = game.conflicts.has(`${r}-${c}`)
              const isHighlightRow = game.selectedCell?.row === r
              const isHighlightCol = game.selectedCell?.col === c
              const isHighlightBox =
                game.selectedCell &&
                Math.floor(game.selectedCell.row / 3) === Math.floor(r / 3) &&
                Math.floor(game.selectedCell.col / 3) === Math.floor(c / 3)
              const isHighlightNum =
                cell !== 0 &&
                game.selectedNumber !== null &&
                cell === game.selectedNumber
              const noteKey = `${r}-${c}`
              const notes = game.notes.get(noteKey)

              return (
                <div
                  key={c}
                  className={`
                    ${styles.cell}
                    ${isSelected ? styles.cellSelected : ''}
                    ${isInitial ? styles.cellInitial : ''}
                    ${isConflict ? styles.cellConflict : ''}
                    ${isHighlightRow || isHighlightCol || isHighlightBox ? styles.cellHighlight : ''}
                    ${isHighlightNum ? styles.cellHighlightNum : ''}
                    ${(c + 1) % 3 === 0 && c < 8 ? styles.cellBorderRight : ''}
                    ${(r + 1) % 3 === 0 && r < 8 ? styles.cellBorderBottom : ''}
                  `}
                  onClick={() => game.selectCell(r, c)}
                >
                  {cell !== 0 ? (
                    <span
                      className={`
                        ${styles.cellValue}
                        ${isInitial ? styles.cellValueInitial : ''}
                        ${isConflict ? styles.cellValueConflict : ''}
                      `}
                    >
                      {cell}
                    </span>
                  ) : notes && notes.size > 0 ? (
                    <div className={styles.notes}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span key={n} className={styles.noteItem}>
                          {notes.has(n) ? n : ''}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${game.isNoteMode ? styles.actionBtnActive : ''}`}
          onClick={game.toggleNoteMode}
        >
          <span className={styles.actionIcon}>✏️</span>
          <span className={styles.actionLabel}>笔记</span>
        </button>
        <button className={styles.actionBtn} onClick={game.hint}>
          <span className={styles.actionIcon}>💡</span>
          <span className={styles.actionLabel}>提示</span>
        </button>
        <button className={styles.actionBtn} onClick={game.erase}>
          <span className={styles.actionIcon}>🧹</span>
          <span className={styles.actionLabel}>擦除</span>
        </button>
      </div>

      {/* 数字面板 */}
      <div className={styles.numpad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const remaining = game.numberCounts.get(num) ?? 0
          const isActive = game.selectedNumber === num
          return (
            <button
              key={num}
              className={`${styles.numBtn} ${isActive ? styles.numBtnActive : ''} ${remaining === 0 ? styles.numBtnDone : ''}`}
              onClick={() => {
                game.selectNumber(isActive ? null : num)
                if (game.selectedCell) {
                  game.fillNumber(num)
                }
              }}
              disabled={remaining === 0}
            >
              <span className={styles.numValue}>{num}</span>
              <span className={styles.numRemaining}>{remaining}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Sudoku
