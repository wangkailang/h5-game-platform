import { useState, useCallback, useRef, useEffect } from 'react'
import styles from './Jump.module.css'

// ─── 类型 ───
interface Platform {
  x: number; y: number; width: number; height: number; color: string
}
interface JumpState {
  playerX: number; playerY: number; platforms: Platform[]
  currentIndex: number; score: number; bestScore: number
  status: 'ready' | 'charging' | 'jumping' | 'over'
  jumpPower: number; cameraX: number
  startX: number; startY: number; targetX: number; targetY: number
  progress: number; direction: 'left' | 'right'
}

// ─── 常量 ───
const COLORS = ['#6c5ce7','#a29bfe','#00b894','#00cec9','#fdcb6e','#e17055','#d63031','#e84393','#0984e3','#55efc4','#fab1a0','#74b9ff']
const PW = 30, PH = 40

// ─── 引擎 ───
function makePlatforms(n: number): Platform[] {
  const list: Platform[] = [{ x: 100, y: 300, width: 120, height: 20, color: COLORS[0] }]
  for (let i = 1; i < n; i++) {
    const p = list[i - 1], d = Math.random() > 0.5 ? 1 : -1, dist = 100 + Math.random() * 100
    list.push({ x: p.x + d * dist, y: p.y + (Math.random() * 30 - 15), width: 70 + Math.random() * 50, height: 20, color: COLORS[i % COLORS.length] })
  }
  return list
}
function pushPlatform(list: Platform[]) {
  const p = list[list.length - 1], d = Math.random() > 0.5 ? 1 : -1, dist = 100 + Math.random() * 100
  list.push({ x: p.x + d * dist, y: p.y + (Math.random() * 30 - 15), width: 70 + Math.random() * 50, height: 20, color: COLORS[list.length % COLORS.length] })
}
function initState(): JumpState {
  const platforms = makePlatforms(6), p = platforms[0]
  let best = 0; try { best = Number(localStorage.getItem('jumpBest')) || 0 } catch (_e) { /* ignore */ }
  return { playerX: p.x + p.width / 2 - PW / 2, playerY: p.y - PH, platforms, currentIndex: 0, score: 0, bestScore: best, status: 'ready', jumpPower: 0, cameraX: 0, startX: 0, startY: 0, targetX: 0, targetY: 0, progress: 0, direction: 'right' }
}
function doCharge(s: JumpState): JumpState { return s.status !== 'ready' ? s : { ...s, status: 'charging', jumpPower: 0 } }
function addPower(s: JumpState): JumpState { return s.status !== 'charging' ? s : { ...s, jumpPower: Math.min(s.jumpPower + 1.5, 100) } }
function doJump(s: JumpState): JumpState {
  if (s.status !== 'charging' || s.jumpPower < 5) return { ...s, status: 'ready', jumpPower: 0 }
  const next = s.platforms[s.currentIndex + 1]; if (!next) return { ...s, status: 'ready', jumpPower: 0 }
  const cur = s.platforms[s.currentIndex], dir: 'left' | 'right' = next.x > cur.x ? 'right' : 'left'
  const tx = dir === 'right' ? s.playerX + s.jumpPower * 3 : s.playerX - s.jumpPower * 3
  return { ...s, status: 'jumping', direction: dir, startX: s.playerX, startY: s.playerY, targetX: tx, targetY: s.playerY, progress: 0 }
}
function doTick(s: JumpState, dt: number): JumpState {
  if (s.status !== 'jumping') return s
  const np = Math.min(s.progress + 0.04 * dt, 1)
  const cx = s.startX + (s.targetX - s.startX) * np, cy = s.startY - Math.sin(np * Math.PI) * s.jumpPower * 2
  if (np >= 1) return doLand(s, s.targetX, s.targetY)
  return { ...s, playerX: cx, playerY: cy, progress: np }
}
function doLand(s: JumpState, lx: number, ly: number): JumpState {
  const cur = s.platforms[s.currentIndex], next = s.platforms[s.currentIndex + 1]
  if (!next) return { ...s, status: 'over' }
  const pcx = lx + PW / 2, pb = ly + PH
  if (pcx >= next.x && pcx <= next.x + next.width && pb >= next.y - 10 && pb <= next.y + next.height + 5) {
    const perfect = Math.abs(pcx - (next.x + next.width / 2)) < 15, pts = perfect ? 2 : 1
    const ns = s.score + pts, best = Math.max(ns, s.bestScore)
    try { localStorage.setItem('jumpBest', String(best)) } catch (_e) { /* ignore */ }
    const st: JumpState = { ...s, score: ns, bestScore: best, currentIndex: s.currentIndex + 1, status: 'ready', playerX: next.x + next.width / 2 - PW / 2, playerY: next.y - PH, jumpPower: 0, progress: 0, cameraX: s.cameraX + (next.x - cur.x) }
    while (st.platforms.length < st.currentIndex + 5) pushPlatform(st.platforms)
    return st
  }
  if (pcx >= cur.x && pcx <= cur.x + cur.width && pb >= cur.y - 10 && pb <= cur.y + cur.height + 5) return { ...s, status: 'ready', playerX: lx, playerY: ly, jumpPower: 0, progress: 0 }
  return { ...s, status: 'over' }
}
function moveCamera(s: JumpState): JumpState {
  const target = s.platforms[s.currentIndex].x - 100, diff = target - s.cameraX
  return Math.abs(diff) < 1 ? s : { ...s, cameraX: s.cameraX + diff * 0.15 }
}

// ─── 组件 ───
export default function Jump() {
  const [state, setState] = useState<JumpState>(initState)
  const rafRef = useRef(0), lastTsRef = useRef(0), chargeRef = useRef(0), stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (state.status !== 'jumping') return
    lastTsRef.current = 0
    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = Math.min((ts - lastTsRef.current) / 16.67, 3)
      lastTsRef.current = ts
      setState(prev => prev.status === 'jumping' ? moveCamera(doTick(prev, dt)) : prev)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [state.status])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); clearInterval(chargeRef.current) }, [])

  const handlePress = useCallback(() => {
    if (stateRef.current.status !== 'ready') return
    setState(doCharge(stateRef.current))
    clearInterval(chargeRef.current)
    chargeRef.current = window.setInterval(() => setState(prev => prev.status === 'charging' ? addPower(prev) : prev), 16)
  }, [])

  const handleRelease = useCallback(() => {
    clearInterval(chargeRef.current); chargeRef.current = 0
    setState(prev => prev.status === 'charging' ? doJump(prev) : prev)
  }, [])

  const restart = useCallback(() => {
    cancelAnimationFrame(rafRef.current); clearInterval(chargeRef.current); chargeRef.current = 0
    setState(initState())
  }, [])

  const { platforms, currentIndex, playerX, playerY, cameraX, status, jumpPower, score, bestScore } = state
  const cur = platforms[currentIndex], next = platforms[currentIndex + 1]

  const onPress = useCallback((e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); handlePress() }, [handlePress])
  const onRelease = useCallback((e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); handleRelease() }, [handleRelease])

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreBox}><span className={styles.scoreLabel}>分数</span><span className={styles.scoreValue}>{score}</span></div>
        <div className={styles.scoreBox}><span className={styles.scoreLabel}>最高</span><span className={styles.scoreValue}>{bestScore}</span></div>
      </div>
      <div className={styles.gameArea} onMouseDown={onPress} onMouseUp={onRelease} onMouseLeave={onRelease} onTouchStart={onPress} onTouchEnd={onRelease}>
        <div className={styles.platformsContainer} style={{ transform: `translateX(${-cameraX}px)` }}>
          {platforms.map((p, i) => (
            <div key={i} className={`${styles.platform} ${i === currentIndex ? styles.active : ''} ${i === currentIndex + 1 ? styles.next : ''}`}
              style={{ left: p.x, width: p.width, height: p.height, background: p.color, bottom: 300 - p.y }} />
          ))}
        </div>
        <div className={styles.player} style={{ left: playerX - cameraX, top: playerY, transform: status === 'charging' ? `scaleY(${1 + jumpPower * 0.003})` : 'scaleY(1)' }}>
          <div className={styles.playerBody}><div className={`${styles.playerEye} ${styles.left}`} /><div className={`${styles.playerEye} ${styles.right}`} /></div>
        </div>
        <div className={`${styles.powerBarContainer} ${status === 'charging' ? styles.visible : ''}`}><div className={styles.powerBar} style={{ width: `${jumpPower}%` }} /></div>
        {status === 'ready' && <div className={styles.hint}>按住屏幕蓄力，松手跳跃</div>}
        {status === 'charging' && next && cur && <div className={styles.directionHint}>{next.x > cur.x ? '→' : '←'}</div>}
      </div>
      {status === 'over' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>😅</div><h2>游戏结束</h2><p>分数：{score}</p><p>最高：{bestScore}</p>
            <button className={styles.btnPrimary} onClick={restart}>再来一局</button>
          </div>
        </div>
      )}
      <p className={styles.controlHint}>按住屏幕蓄力，松手跳跃</p>
    </div>
  )
}
