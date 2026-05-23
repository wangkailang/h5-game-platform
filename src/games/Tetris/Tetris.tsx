import { useState, useCallback, useRef, useEffect } from 'react'
import styles from './Tetris.module.css'

// ─── 类型 ───
type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

interface Position {
  x: number
  y: number
}

interface Tetromino {
  type: TetrominoType
  shape: number[][]
  position: Position
  rotation: number
}

interface GameState {
  board: number[][]
  currentPiece: Tetromino | null
  nextPiece: Tetromino | null
  score: number
  level: number
  lines: number
  bestScore: number
  status: 'ready' | 'playing' | 'paused' | 'over'
  dropTime: number
  lastDrop: number
}

// 动画相关状态
interface AnimationState {
  clearingRows: number[]          // 正在消行的行索引
  landingCells: Set<string>       // 刚落地的格子 "y-x"
  hardDropFlash: boolean          // 硬降闪光
  scoreBounce: boolean            // 分数跳动
  gameOverRows: number[]          // 游戏结束已填充的行
  lineClearScore: number | null   // 消行弹出分数
}

// ─── 方块定义 ───
const TETROMINOS: Record<TetrominoType, number[][][]> = {
  I: [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]]
  ],
  O: [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]]
  ],
  T: [
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1], [1, 1], [0, 1]]
  ],
  S: [
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]]
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1], [1, 1], [1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1], [1, 1], [1, 0]]
  ],
  J: [
    [[1, 0, 0], [1, 1, 1]],
    [[1, 1], [1, 0], [1, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[0, 1], [0, 1], [1, 1]]
  ],
  L: [
    [[0, 0, 1], [1, 1, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1], [0, 1], [0, 1]]
  ]
}

// ─── 常量 ───
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const COLORS = [
  '#00f0f0', // I - 青色
  '#f0f000', // O - 黄色
  '#a000f0', // T - 紫色
  '#00f000', // S - 绿色
  '#f00000', // Z - 红色
  '#0000f0', // J - 蓝色
  '#f0a000'  // L - 橙色
]

// 动画持续时间
const LINE_CLEAR_DURATION = 400   // 消行动画 400ms
const LANDING_DURATION = 300      // 落地动画 300ms
const HARD_DROP_FLASH_DURATION = 300  // 硬降闪光 300ms
const SCORE_BOUNCE_DURATION = 300     // 分数跳动 300ms
const GAME_OVER_ROW_DELAY = 60        // 游戏结束每行间隔 60ms
const LINE_SCORE_POPUP_DURATION = 800 // 消行分数弹出 800ms

// ─── 工具函数 ───
function createEmptyBoard(): number[][] {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))
}

function getRandomTetrominoType(): TetrominoType {
  const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
  return types[Math.floor(Math.random() * types.length)]
}

function createTetromino(type: TetrominoType): Tetromino {
  return {
    type,
    shape: TETROMINOS[type][0],
    position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
    rotation: 0
  }
}

function isValidPosition(board: number[][], piece: Tetromino, offset: Position = { x: 0, y: 0 }): boolean {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const newX = piece.position.x + x + offset.x
        const newY = piece.position.y + y + offset.y
        
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return false
        }
        
        if (newY >= 0 && board[newY][newX]) {
          return false
        }
      }
    }
  }
  return true
}

function rotatePiece(piece: Tetromino): Tetromino {
  const newRotation = (piece.rotation + 1) % 4
  const newShape = TETROMINOS[piece.type][newRotation]
  return { ...piece, shape: newShape, rotation: newRotation }
}

function placePiece(board: number[][], piece: Tetromino): number[][] {
  const newBoard = board.map(row => [...row])
  
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardY = piece.position.y + y
        const boardX = piece.position.x + x
        
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          newBoard[boardY][boardX] = COLORS.indexOf(getColorForType(piece.type)) + 1
        }
      }
    }
  }
  
  return newBoard
}

function clearLines(board: number[][]): { board: number[][]; linesCleared: number } {
  const newBoard = board.filter(row => row.some(cell => cell === 0))
  const linesCleared = BOARD_HEIGHT - newBoard.length
  
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0))
  }
  
  return { board: newBoard, linesCleared }
}

// 找出需要消除的行
function findFullRows(board: number[][]): number[] {
  const rows: number[] = []
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    if (board[y].every(cell => cell !== 0)) {
      rows.push(y)
    }
  }
  return rows
}

function getColorForType(type: TetrominoType): string {
  const index = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'].indexOf(type)
  return COLORS[index]
}

function calculateScore(lines: number, level: number): number {
  const points = [0, 100, 300, 500, 800]
  return points[lines] * (level + 1)
}

// 获取幽灵方块位置
function getGhostPosition(board: number[][], piece: Tetromino): Position {
  let ghostY = piece.position.y
  while (isValidPosition(board, { ...piece, position: { x: piece.position.x, y: ghostY + 1 } })) {
    ghostY++
  }
  return { x: piece.position.x, y: ghostY }
}

// 获取当前活动方块占据的格子坐标
function getActiveCells(piece: Tetromino | null): Set<string> {
  if (!piece) return new Set()
  const cells = new Set<string>()
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardY = piece.position.y + y
        const boardX = piece.position.x + x
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          cells.add(`${boardY}-${boardX}`)
        }
      }
    }
  }
  return cells
}

// ─── 初始化 ───
function initState(): GameState {
  let best = 0
  try { best = Number(localStorage.getItem('tetrisBest')) || 0 } catch (_e) { /* ignore */ }
  
  const currentType = getRandomTetrominoType()
  const nextType = getRandomTetrominoType()
  
  return {
    board: createEmptyBoard(),
    currentPiece: createTetromino(currentType),
    nextPiece: createTetromino(nextType),
    score: 0,
    level: 0,
    lines: 0,
    bestScore: best,
    status: 'ready',
    dropTime: 1000,
    lastDrop: 0
  }
}

function initAnimState(): AnimationState {
  return {
    clearingRows: [],
    landingCells: new Set(),
    hardDropFlash: false,
    scoreBounce: false,
    gameOverRows: [],
    lineClearScore: null,
  }
}

// ─── 主组件 ───
export default function Tetris() {
  const [state, setState] = useState<GameState>(initState)
  const [anim, setAnim] = useState<AnimationState>(initAnimState)
  const rafRef = useRef(0)
  const lastTimeRef = useRef(0)
  const dropAccumulatorRef = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state
  const animRef = useRef(anim)
  animRef.current = anim
  const isClearingRef = useRef(false) // 标记正在消行动画中

  // ─── 触发分数跳动动画 ───
  const triggerScoreBounce = useCallback(() => {
    setAnim(prev => ({ ...prev, scoreBounce: true }))
    setTimeout(() => {
      setAnim(prev => ({ ...prev, scoreBounce: false }))
    }, SCORE_BOUNCE_DURATION)
  }, [])

  // ─── 触发硬降闪光 ───
  const triggerHardDropFlash = useCallback(() => {
    setAnim(prev => ({ ...prev, hardDropFlash: true }))
    setTimeout(() => {
      setAnim(prev => ({ ...prev, hardDropFlash: false }))
    }, HARD_DROP_FLASH_DURATION)
  }, [])

  // ─── 游戏结束动画 ───
  const playGameOverAnimation = useCallback(() => {
    for (let i = BOARD_HEIGHT - 1; i >= 0; i--) {
      setTimeout(() => {
        setAnim(prev => ({ ...prev, gameOverRows: [...prev.gameOverRows, i] }))
      }, (BOARD_HEIGHT - 1 - i) * GAME_OVER_ROW_DELAY)
    }
  }, [])

  // 游戏循环 - 使用累加器模式
  useEffect(() => {
    if (state.status !== 'playing') return
    
    // 重置时间引用
    lastTimeRef.current = 0
    dropAccumulatorRef.current = 0
    
    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      
      const deltaTime = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp
      
      // 如果正在消行动画中，跳过逻辑更新
      if (isClearingRef.current) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      
      // 累加时间
      dropAccumulatorRef.current += deltaTime
      
      // 检查是否应该下落
      if (dropAccumulatorRef.current >= stateRef.current.dropTime) {
        dropAccumulatorRef.current = 0
        
        setState(prev => {
          if (prev.status !== 'playing' || !prev.currentPiece) return prev
          
          const newPiece = {
            ...prev.currentPiece,
            position: { ...prev.currentPiece.position, y: prev.currentPiece.position.y + 1 }
          }
          
          if (isValidPosition(prev.board, newPiece)) {
            return { ...prev, currentPiece: newPiece }
          } else {
            // 降落到底部
            const newBoard = placePiece(prev.board, prev.currentPiece)
            
            // 检查是否有满行
            const fullRows = findFullRows(newBoard)
            
            if (fullRows.length > 0) {
              // 开始消行动画
              isClearingRef.current = true
              
              // 获取刚落地的格子
              const landingKeys = new Set<string>()
              for (let y = 0; y < prev.currentPiece.shape.length; y++) {
                for (let x = 0; x < prev.currentPiece.shape[y].length; x++) {
                  if (prev.currentPiece.shape[y][x]) {
                    const by = prev.currentPiece.position.y + y
                    const bx = prev.currentPiece.position.x + x
                    landingKeys.add(`${by}-${bx}`)
                  }
                }
              }
              
              setAnim(prevAnim => ({
                ...prevAnim,
                clearingRows: fullRows,
                landingCells: landingKeys,
                lineClearScore: calculateScore(fullRows.length, Math.floor((prev.lines + fullRows.length) / 10)),
              }))
              
              // 落地动画结束后移除
              setTimeout(() => {
                setAnim(prevAnim => ({ ...prevAnim, landingCells: new Set() }))
              }, LANDING_DURATION)
              
              // 消行动画结束后执行实际消除
              setTimeout(() => {
                setState(current => {
                  if (current.status !== 'playing') return current
                  const { board: clearedBoard, linesCleared } = clearLines(newBoard)
                  const newLines = current.lines + linesCleared
                  const newLevel = Math.floor(newLines / 10)
                  const newScore = current.score + calculateScore(linesCleared, newLevel)
                  const best = Math.max(newScore, current.bestScore)
                  
                  try { localStorage.setItem('tetrisBest', String(best)) } catch (_e) { /* ignore */ }
                  
                  const nextType = getRandomTetrominoType()
                  const newCurrentPiece = current.nextPiece
                  const newNextPiece = createTetromino(nextType)
                  
                  if (!isValidPosition(clearedBoard, newCurrentPiece!)) {
                    setTimeout(() => playGameOverAnimation(), 100)
                    return { ...current, status: 'over', bestScore: best }
                  }
                  
                  return {
                    ...current,
                    board: clearedBoard,
                    currentPiece: newCurrentPiece,
                    nextPiece: newNextPiece,
                    score: newScore,
                    level: newLevel,
                    lines: newLines,
                    bestScore: best,
                    dropTime: Math.max(100, 1000 - newLevel * 100)
                  }
                })
                
                setAnim(prevAnim => ({
                  ...prevAnim,
                  clearingRows: [],
                  lineClearScore: null,
                }))
                isClearingRef.current = false
              }, LINE_CLEAR_DURATION)
              
              // 分数跳动
              setTimeout(() => triggerScoreBounce(), LINE_CLEAR_DURATION)
              
              // 消行分数弹出消失
              setTimeout(() => {
                setAnim(prevAnim => ({ ...prevAnim, lineClearScore: null }))
              }, LINE_SCORE_POPUP_DURATION)
              
              return prev // 暂不更新，等动画结束
            } else {
              // 没有满行，正常放置
              // 获取刚落地的格子
              const landingKeys = new Set<string>()
              for (let y = 0; y < prev.currentPiece.shape.length; y++) {
                for (let x = 0; x < prev.currentPiece.shape[y].length; x++) {
                  if (prev.currentPiece.shape[y][x]) {
                    const by = prev.currentPiece.position.y + y
                    const bx = prev.currentPiece.position.x + x
                    landingKeys.add(`${by}-${bx}`)
                  }
                }
              }
              setAnim(prevAnim => ({ ...prevAnim, landingCells: landingKeys }))
              setTimeout(() => {
                setAnim(prevAnim => ({ ...prevAnim, landingCells: new Set() }))
              }, LANDING_DURATION)
              
              const nextType = getRandomTetrominoType()
              const newCurrentPiece = prev.nextPiece
              const newNextPiece = createTetromino(nextType)
              
              if (!isValidPosition(newBoard, newCurrentPiece!)) {
                setTimeout(() => playGameOverAnimation(), 100)
                return { ...prev, status: 'over', board: newBoard }
              }
              
              return {
                ...prev,
                board: newBoard,
                currentPiece: newCurrentPiece,
                nextPiece: newNextPiece,
                dropTime: Math.max(100, 1000 - prev.level * 100)
              }
            }
          }
        })
      }
      
      rafRef.current = requestAnimationFrame(loop)
    }
    
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [state.status, triggerScoreBounce, playGameOverAnimation])

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.status !== 'playing') return
      if (isClearingRef.current) return // 消行动画中不允许操作
      
      const { currentPiece } = stateRef.current
      if (!currentPiece) return
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setState(prev => {
            if (!prev.currentPiece) return prev
            const newPiece = {
              ...prev.currentPiece,
              position: { ...prev.currentPiece.position, x: prev.currentPiece.position.x - 1 }
            }
            if (isValidPosition(prev.board, newPiece)) {
              return { ...prev, currentPiece: newPiece }
            }
            return prev
          })
          break
          
        case 'ArrowRight':
          e.preventDefault()
          setState(prev => {
            if (!prev.currentPiece) return prev
            const newPiece = {
              ...prev.currentPiece,
              position: { ...prev.currentPiece.position, x: prev.currentPiece.position.x + 1 }
            }
            if (isValidPosition(prev.board, newPiece)) {
              return { ...prev, currentPiece: newPiece }
            }
            return prev
          })
          break
          
        case 'ArrowDown':
          e.preventDefault()
          // 软降 - 直接下落一格
          setState(prev => {
            if (!prev.currentPiece) return prev
            const newPiece = {
              ...prev.currentPiece,
              position: { ...prev.currentPiece.position, y: prev.currentPiece.position.y + 1 }
            }
            if (isValidPosition(prev.board, newPiece)) {
              return { ...prev, currentPiece: newPiece, score: prev.score + 1 }
            }
            return prev
          })
          break
          
        case 'ArrowUp':
          e.preventDefault()
          setState(prev => {
            if (!prev.currentPiece) return prev
            const rotated = rotatePiece(prev.currentPiece)
            if (isValidPosition(prev.board, rotated)) {
              return { ...prev, currentPiece: rotated }
            }
            return prev
          })
          break
          
        case ' ':
          e.preventDefault()
          // 硬降 - 直接落到底部 + 闪光
          triggerHardDropFlash()
          setState(prev => {
            if (!prev.currentPiece) return prev
            let newPiece = prev.currentPiece
            while (isValidPosition(prev.board, { ...newPiece, position: { ...newPiece.position, y: newPiece.position.y + 1 } })) {
              newPiece = { ...newPiece, position: { ...newPiece.position, y: newPiece.position.y + 1 } }
            }
            return { ...prev, currentPiece: newPiece }
          })
          break
          
        case 'p':
        case 'P':
          e.preventDefault()
          setState(prev => ({
            ...prev,
            status: prev.status === 'playing' ? 'paused' : 'playing'
          }))
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [triggerHardDropFlash])

  const startGame = useCallback(() => {
    lastTimeRef.current = 0
    dropAccumulatorRef.current = 0
    isClearingRef.current = false
    setAnim(initAnimState())
    setState(prev => ({
      ...prev,
      status: 'playing',
      board: createEmptyBoard(),
      currentPiece: createTetromino(getRandomTetrominoType()),
      nextPiece: createTetromino(getRandomTetrominoType()),
      score: 0,
      level: 0,
      lines: 0,
      dropTime: 1000
    }))
  }, [])

  const restartGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    lastTimeRef.current = 0
    dropAccumulatorRef.current = 0
    isClearingRef.current = false
    setAnim(initAnimState())
    setState(initState())
  }, [])

  const { board, currentPiece, nextPiece, score, level, lines, bestScore, status } = state

  // 计算幽灵方块位置
  const ghostPosition = currentPiece && status === 'playing'
    ? getGhostPosition(board, currentPiece)
    : null

  // 获取当前活动方块的格子
  const activeCells = getActiveCells(currentPiece)

  // 渲染游戏板
  const renderBoard = () => {
    // 构建幽灵方块占据的格子
    const ghostCells = new Set<string>()
    if (currentPiece && ghostPosition && ghostPosition.y !== currentPiece.position.y) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const by = ghostPosition.y + y
            const bx = ghostPosition.x + x
            if (by >= 0 && by < BOARD_HEIGHT && bx >= 0 && bx < BOARD_WIDTH) {
              ghostCells.add(`${by}-${bx}`)
            }
          }
        }
      }
    }

    const displayBoard = board.map(row => [...row])
    
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPiece.position.y + y
            const boardX = currentPiece.position.x + x
            
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = COLORS.indexOf(getColorForType(currentPiece.type)) + 1
            }
          }
        }
      }
    }
    
    return displayBoard.map((row, y) => (
      <div key={y} className={styles.row}>
        {row.map((cell, x) => {
          const cellKey = `${y}-${x}`
          const isClearing = anim.clearingRows.includes(y)
          const isLanding = anim.landingCells.has(cellKey) && !isClearing
          const isActive = activeCells.has(cellKey) && !isClearing
          const isGhost = ghostCells.has(cellKey) && !cell && !isClearing
          const isPlaced = cell !== 0 && !isActive && !isClearing && !isLanding && !anim.gameOverRows.includes(y)
          const isGameOverFill = anim.gameOverRows.includes(y) && !cell

          let cellClass = styles.cell
          if (isClearing && cell) cellClass += ` ${styles.lineClearing}`
          else if (isGameOverFill) cellClass += ` ${styles.gameOverFill}`
          else if (isActive && cell) cellClass += ` ${styles.filled} ${styles.active}`
          else if (isLanding && cell) cellClass += ` ${styles.filled} ${styles.landing}`
          else if (isGhost) cellClass += ` ${styles.ghost}`
          else if (isPlaced) cellClass += ` ${styles.filled} ${styles.placed}`
          else if (cell) cellClass += ` ${styles.filled}`

          let cellStyle: React.CSSProperties | undefined
          if (cell) {
            cellStyle = { background: COLORS[cell - 1] }
          }
          if (isGameOverFill) {
            cellStyle = { background: '#4a4a5a' }
          }

          return (
            <div
              key={x}
              className={cellClass}
              style={cellStyle}
            />
          )
        })}
      </div>
    ))
  }

  // 渲染下一个方块
  const renderNextPiece = () => {
    if (!nextPiece) return null
    
    return nextPiece.shape.map((row, y) => (
      <div key={y} className={styles.nextRow}>
        {row.map((cell, x) => (
          <div
            key={x}
            className={`${styles.nextCell} ${cell ? styles.filled : ''}`}
            style={cell ? { background: getColorForType(nextPiece.type) } : undefined}
          />
        ))}
      </div>
    ))
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.scoreBox}>
          <span className={styles.scoreLabel}>分数</span>
          <span className={`${styles.scoreValue} ${anim.scoreBounce ? styles.scoreBounce : ''}`}>{score}</span>
        </div>
        <div className={styles.scoreBox}>
          <span className={styles.scoreLabel}>等级</span>
          <span className={styles.scoreValue}>{level}</span>
        </div>
        <div className={styles.scoreBox}>
          <span className={styles.scoreLabel}>消行</span>
          <span className={styles.scoreValue}>{lines}</span>
        </div>
        <div className={styles.scoreBox}>
          <span className={styles.scoreLabel}>最高</span>
          <span className={styles.scoreValue}>{bestScore}</span>
        </div>
      </div>
      
      <div className={styles.gameArea}>
        <div className={styles.boardWrapper}>
          <div className={`${styles.board} ${status === 'over' ? styles.gameOverBoard : ''}`}>
            {renderBoard()}
          </div>
          
          {/* 硬降闪光 */}
          {anim.hardDropFlash && <div className={styles.hardDropFlash} />}
          
          {/* 消行分数弹出 */}
          {anim.lineClearScore !== null && (
            <div className={styles.lineClearPopup}>
              +{anim.lineClearScore}
            </div>
          )}
        </div>
        
        <div className={styles.sidebar}>
          <div className={styles.nextPieceContainer}>
            <div className={styles.nextLabel}>下一个</div>
            <div className={styles.nextPiece}>
              {renderNextPiece()}
            </div>
          </div>
          
          <div className={styles.controls}>
            <div className={styles.controlItem}>
              <span className={styles.key}>←→</span>
              <span className={styles.action}>移动</span>
            </div>
            <div className={styles.controlItem}>
              <span className={styles.key}>↑</span>
              <span className={styles.action}>旋转</span>
            </div>
            <div className={styles.controlItem}>
              <span className={styles.key}>↓</span>
              <span className={styles.action}>加速</span>
            </div>
            <div className={styles.controlItem}>
              <span className={styles.key}>空格</span>
              <span className={styles.action}>直接落底</span>
            </div>
            <div className={styles.controlItem}>
              <span className={styles.key}>P</span>
              <span className={styles.action}>暂停</span>
            </div>
          </div>
        </div>
      </div>
      
      {status === 'ready' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>🎮</div>
            <h2>俄罗斯方块</h2>
            <p>经典益智游戏，挑战你的反应和策略！</p>
            <button className={styles.btnPrimary} onClick={startGame}>开始游戏</button>
          </div>
        </div>
      )}
      
      {status === 'paused' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>⏸️</div>
            <h2>游戏暂停</h2>
            <button className={styles.btnPrimary} onClick={() => setState(prev => ({ ...prev, status: 'playing' }))}>继续游戏</button>
          </div>
        </div>
      )}
      
      {status === 'over' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>😅</div>
            <h2>游戏结束</h2>
            <p>分数：{score}</p>
            <p>最高：{bestScore}</p>
            <button className={styles.btnPrimary} onClick={restartGame}>再来一局</button>
          </div>
        </div>
      )}
      
      <p className={styles.controlHint}>方向键移动 · ↑旋转 · 空格直接落底 · P暂停</p>
    </div>
  )
}
