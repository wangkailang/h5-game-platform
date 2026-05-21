import { useState, useCallback, useRef, useEffect } from 'react'
import styles from './Jump.module.css'

// ─── 类型 ───
interface Platform {
  x: number; y: number; width: number; height: number; color: string
}
interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string
}
interface ScorePopup {
  x: number; y: number; value: number; perfect: boolean; id: number
}
interface JumpState {
  playerX: number; playerY: number
  platforms: Platform[]
  currentIndex: number
  score: number; bestScore: number
  status: 'ready' | 'charging' | 'jumping' | 'landing' | 'over'
  jumpPower: number
  cameraX: number
  startX: number; startY: number
  targetX: number; targetY: number
  progress: number
  particles: Particle[]
  scorePopups: ScorePopup[]
  squash: number
  landingImpact: number
  popupId: number
}

// ─── 常量 ───
const COLORS = [
  '#6c5ce7', '#a29bfe', '#00b894', '#00cec9', '#fdcb6e',
  '#e17055', '#d63031', '#e84393', '#0984e3', '#55efc4',
  '#fab1a0', '#74b9ff'
]
const PW = 30, PH = 40
const ARC_HEIGHT = 120
const MAX_JUMP_DIST = 300

// ─── 工具函数 ───
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

// ─── 平台生成 ───
function makePlatforms(n: number): Platform[] {
  const baseY = 300
  const minGap = MAX_JUMP_DIST * 0.3
  const maxGap = MAX_JUMP_DIST * 0.85
  const list: Platform[] = [{ x: 100, y: baseY, width: 120, height: 20, color: COLORS[0] }]
  for (let i = 1; i < n; i++) {
    const prev = list[i - 1]
    const gapX = minGap + Math.random() * (maxGap - minGap)
    const offsetY = (Math.random() - 0.5) * 40
    list.push({
      x: prev.x + gapX,
      y: baseY + offsetY,
      width: 70 + Math.random() * 50,
      height: 20,
      color: COLORS[i % COLORS.length]
    })
  }
  return list
}

function pushPlatform(list: Platform[]) {
  const baseY = 300
  const minGap = MAX_JUMP_DIST * 0.3
  const maxGap = MAX_JUMP_DIST * 0.85
  const prev = list[list.length - 1]
  const gapX = minGap + Math.random() * (maxGap - minGap)
  const offsetY = (Math.random() - 0.5) * 40
  list.push({
    x: prev.x + gapX,
    y: baseY + offsetY,
    width: 70 + Math.random() * 50,
    height: 20,
    color: COLORS[list.length % COLORS.length]
  })
}

// ─── 落地粒子爆发 ───
function spawnLandingParticles(x: number, y: number, color: string): Particle[] {
  const particles: Particle[] = []
  // 向上的主粒子
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.2
    const speed = 3 + Math.random() * 5
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: -Math.abs(Math.sin(angle) * speed),
      life: 1,
      maxLife: 0.3 + Math.random() * 0.3,
      size: 3 + Math.random() * 5,
      color
    })
  }
  // 向两侧扩散的粒子
  for (let i = 0; i < 8; i++) {
    const dir = i < 4 ? -1 : 1
    particles.push({
      x, y,
      vx: dir * (2 + Math.random() * 3),
      vy: -1 - Math.random() * 2,
      life: 1,
      maxLife: 0.2 + Math.random() * 0.2,
      size: 2 + Math.random() * 3,
      color: '#fff'
    })
  }
  return particles
}

// ─── 初始化 ───
function initState(): JumpState {
  const platforms = makePlatforms(8), p = platforms[0]
  let best = 0
  try { best = Number(localStorage.getItem('jumpBest')) || 0 } catch (_e) { /* ignore */ }
  return {
    playerX: p.x + p.width / 2 - PW / 2,
    playerY: p.y - PH,
    platforms, currentIndex: 0,
    score: 0, bestScore: best,
    status: 'ready', jumpPower: 0,
    cameraX: 0,
    startX: 0, startY: 0, targetX: 0, targetY: 0,
    progress: 0,
    particles: [], scorePopups: [],
    squash: 1, landingImpact: 0, popupId: 0
  }
}

// ─── 蓄力 ───
function doCharge(s: JumpState): JumpState {
  if (s.status !== 'ready') return s
  return { ...s, status: 'charging', jumpPower: 0, squash: 0.85 }
}

function addPower(s: JumpState): JumpState {
  if (s.status !== 'charging') return s
  const power = Math.min(s.jumpPower + 1.5, 100)
  const squash = 0.85 - (power / 100) * 0.15
  return { ...s, jumpPower: power, squash }
}

// ─── 跳跃 ───
function doJump(s: JumpState): JumpState {
  if (s.status !== 'charging' || s.jumpPower < 5) return { ...s, status: 'ready', jumpPower: 0, squash: 1 }

  const cur = s.platforms[s.currentIndex]
  const curRight = cur.x + cur.width
  const jumpDist = (s.jumpPower / 100) * MAX_JUMP_DIST
  const tx = curRight + jumpDist - PW
  const ty = s.platforms[s.currentIndex + 1]?.y - PH ?? s.playerY

  return {
    ...s, status: 'jumping',
    startX: s.playerX, startY: s.playerY,
    targetX: tx, targetY: ty,
    progress: 0, squash: 1.3
  }
}

// ─── 物理Tick（去掉缓动，匀速运动） ───
function doTick(s: JumpState, dt: number): JumpState {
  if (s.status !== 'jumping') return s

  const speed = 0.045 * dt
  const np = Math.min(s.progress + speed, 1)

  // 匀速水平移动
  const cx = lerp(s.startX, s.targetX, np)

  // 垂直：抛物线（先升后降）
  const baseY = lerp(s.startY, s.targetY, np)
  const arcOffset = -Math.sin(np * Math.PI) * ARC_HEIGHT
  const cy = baseY + arcOffset

  // 拉伸：起跳拉伸，空中恢复
  let squash = 1
  if (np < 0.15) squash = lerp(1.3, 1.0, np / 0.15)
  else squash = 1.0

  if (np >= 1) return doLand({ ...s, playerX: cx, playerY: cy, progress: np, squash })

  return { ...s, playerX: cx, playerY: cy, progress: np, squash }
}

// ─── 落地检测与动效 ───
function doLand(s: JumpState): JumpState {
  const next = s.platforms[s.currentIndex + 1]
  if (!next) return { ...s, status: 'over', squash: 0.5, landingImpact: 0.3 }

  const pcx = s.playerX + PW / 2
  const pb = s.playerY + PH

  // 落在下一个平台上
  if (pcx >= next.x - 8 && pcx <= next.x + next.width + 8 && pb >= next.y - 12 && pb <= next.y + next.height + 8) {
    const perfect = Math.abs(pcx - (next.x + next.width / 2)) < 20
    const pts = perfect ? 2 : 1
    const ns = s.score + pts
    const best = Math.max(ns, s.bestScore)
    try { localStorage.setItem('jumpBest', String(best)) } catch (_e) { /* ignore */ }

    const landParticles = spawnLandingParticles(pcx, next.y, next.color)
    const newPopupId = s.popupId + 1
    const popup: ScorePopup = { x: pcx, y: next.y - 20, value: pts, perfect, id: newPopupId }

    const st: JumpState = {
      ...s,
      score: ns, bestScore: best,
      currentIndex: s.currentIndex + 1,
      status: 'landing',
      playerX: next.x + next.width / 2 - PW / 2,
      playerY: next.y - PH,
      jumpPower: 0, progress: 0,
      squash: 0.5, // 强烈落地压缩
      landingImpact: perfect ? 1.5 : 1.0, // 强震屏
      particles: landParticles,
      scorePopups: [...s.scorePopups, popup],
      popupId: newPopupId
    }

    while (st.platforms.length < st.currentIndex + 6) pushPlatform(st.platforms)
    return st
  }

  // 落空
  return { ...s, status: 'over', squash: 0.5, landingImpact: 0.3 }
}

// ─── 落地恢复（弹跳效果） ───
function recoverFromLanding(s: JumpState): JumpState {
  if (s.status !== 'landing') return s

  // 弹跳恢复：先拉伸再恢复
  let squash = s.squash
  if (squash < 0.8) {
    squash = Math.min(squash + 0.08, 1.15) // 快速拉伸超过1
  } else if (squash > 1.05) {
    squash = Math.max(squash - 0.04, 1.0) // 回弹到1
  } else if (squash < 1.0) {
    squash = Math.min(squash + 0.05, 1.0)
  }

  const impact = Math.max(s.landingImpact - 0.12, 0)

  if (Math.abs(squash - 1) < 0.02 && impact <= 0) {
    return { ...s, status: 'ready', squash: 1, landingImpact: 0 }
  }
  return { ...s, squash, landingImpact: impact }
}

// ─── 相机跟随 ───
function moveCamera(s: JumpState): JumpState {
  const targetX = s.playerX - 120
  const dx = targetX - s.cameraX
  const newCamX = Math.abs(dx) < 1 ? s.cameraX : s.cameraX + dx * 0.12
  return { ...s, cameraX: newCamX }
}

// ─── 粒子更新 ───
function updateParticles(s: JumpState, dt: number): JumpState {
  const alive = s.particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + 0.2 * dt,
      life: p.life - dt / (p.maxLife * 60)
    }))
    .filter(p => p.life > 0)

  const popups = s.scorePopups.filter((_, i) => i > s.scorePopups.length - 5)
  return { ...s, particles: alive, scorePopups: popups }
}

// ─── 主组件 ───
export default function Jump() {
  const [state, setState] = useState<JumpState>(initState)
  const rafRef = useRef(0)
  const lastTsRef = useRef(0)
  const chargeRef = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (state.status !== 'jumping' && state.status !== 'landing') return
    lastTsRef.current = 0

    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = Math.min((ts - lastTsRef.current) / 16.67, 3)
      lastTsRef.current = ts

      setState(prev => {
        let next = prev
        if (prev.status === 'jumping') next = doTick(next, dt)
        if (prev.status === 'landing' || next.status === 'landing') next = recoverFromLanding(next)
        next = updateParticles(next, dt)
        next = moveCamera(next)
        return next
      })

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [state.status])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(chargeRef.current)
  }, [])

  const handlePress = useCallback(() => {
    const cur = stateRef.current
    if (cur.status !== 'ready') return
    setState(doCharge(cur))
    clearInterval(chargeRef.current)
    chargeRef.current = window.setInterval(() => {
      setState(prev => prev.status === 'charging' ? addPower(prev) : prev)
    }, 16)
  }, [])

  const handleRelease = useCallback(() => {
    clearInterval(chargeRef.current); chargeRef.current = 0
    setState(prev => prev.status === 'charging' ? doJump(prev) : prev)
  }, [])

  const restart = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(chargeRef.current); chargeRef.current = 0
    setState(initState())
  }, [])

  const {
    platforms, currentIndex, playerX, playerY,
    cameraX, status, jumpPower,
    score, bestScore, squash, landingImpact,
    particles, scorePopups
  } = state
  const next = platforms[currentIndex + 1]

  const onPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); handlePress()
  }, [handlePress])
  const onRelease = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); handleRelease()
  }, [handleRelease])

  // 震屏
  const shakeX = landingImpact > 0 ? (Math.random() - 0.5) * landingImpact * 12 : 0
  const shakeY = landingImpact > 0 ? (Math.random() - 0.5) * landingImpact * 8 : 0
  const camOffsetX = -cameraX + shakeX
  const camOffsetY = shakeY

  // 间距信息
  const curPlatform = platforms[currentIndex]
  const gapToNext = next ? next.x - (curPlatform.x + curPlatform.width) : 0
  const requiredPower = Math.round((gapToNext / MAX_JUMP_DIST) * 100)

  return (
    <div className={styles.container}>
      <div className={styles.scoreboard}>
        <div className={styles.scoreBox}>
          <span className={styles.scoreLabel}>分数</span>
          <span className={styles.scoreValue}>{score}</span>
        </div>
        <div className={styles.scoreBox}>
          <span className={styles.scoreLabel}>最高</span>
          <span className={styles.scoreValue}>{bestScore}</span>
        </div>
      </div>

      <div className={styles.gameArea}
        onMouseDown={onPress} onMouseUp={onRelease} onMouseLeave={onRelease}
        onTouchStart={onPress} onTouchEnd={onRelease}>

        <div className={styles.world} style={{ transform: `translate(${camOffsetX}px, ${camOffsetY}px)` }}>

          {/* 平台 */}
          {platforms.map((p, i) => (
            <div key={i}
              className={`${styles.platform} ${i === currentIndex ? styles.active : ''} ${i === currentIndex + 1 ? styles.next : ''}`}
              style={{
                left: p.x, top: p.y, width: p.width, height: p.height,
                background: `linear-gradient(180deg, ${p.color}, ${p.color}dd)`
              }}>
              <div className={styles.platformTop} style={{ background: `${p.color}88` }} />
              <div className={styles.platformShadow} style={{ background: `linear-gradient(180deg, ${p.color}33, transparent)` }} />
            </div>
          ))}

          {/* 落地冲击波 */}
          {status === 'landing' && landingImpact > 0.5 && (
            <div className={styles.shockwave} style={{
              left: playerX + PW / 2 - 40,
              top: playerY + PH,
              opacity: landingImpact,
              transform: `scale(${1 + (1 - landingImpact) * 2})`
            }} />
          )}

          {/* 玩家 */}
          <div className={`${styles.player} ${status === 'charging' ? styles.charging : ''} ${status === 'jumping' ? styles.jumping : ''}`}
            style={{
              left: playerX, top: playerY,
              transform: `scaleY(${squash}) scaleX(${2 - squash})`,
              transformOrigin: 'center bottom'
            }}>
            <div className={styles.playerBody}>
              <div className={styles.playerFace}>
                <div className={`${styles.playerEye} ${styles.left}`} />
                <div className={`${styles.playerEye} ${styles.right}`} />
                <div className={styles.playerMouth} />
              </div>
              {status === 'charging' && (
                <div className={styles.chargeGlow} style={{ opacity: jumpPower / 100 }} />
              )}
            </div>
          </div>

          {/* 粒子 */}
          {particles.map((p, i) => (
            <div key={`p-${i}`} className={styles.particle}
              style={{
                left: p.x, top: p.y,
                width: p.size, height: p.size,
                background: p.color,
                opacity: p.life,
                transform: `scale(${p.life})`
              }} />
          ))}

          {/* 分数弹出 */}
          {scorePopups.map((sp) => (
            <div key={`sp-${sp.id}`}
              className={`${styles.scorePopup} ${sp.perfect ? styles.perfect : ''}`}
              style={{ left: sp.x - 20, top: sp.y }}>
              +{sp.value}
              {sp.perfect && <span className={styles.perfectLabel}>完美!</span>}
            </div>
          ))}
        </div>

        {/* 蓄力条 */}
        <div className={`${styles.powerBarContainer} ${status === 'charging' ? styles.visible : ''}`}>
          <div className={styles.powerBarTrack}>
            {next && (
              <div className={styles.safeZone} style={{
                left: `${requiredPower - 10}%`,
                width: '20%'
              }} />
            )}
            <div className={styles.powerBar} style={{ width: `${jumpPower}%` }} />
          </div>
          <div className={styles.powerLabel}>{Math.round(jumpPower)}%</div>
        </div>

        {/* 方向提示 */}
        {status === 'charging' && (
          <div className={styles.directionHint}>
            <div className={styles.directionArrow}>→</div>
            <div className={styles.directionText}>
              松手跳跃
              {next && <span className={styles.gapHint}>间距: {Math.round(gapToNext)}px (约{requiredPower}%)</span>}
            </div>
          </div>
        )}

        {/* 开始提示 */}
        {status === 'ready' && score === 0 && (
          <div className={styles.hint}>
            <div className={styles.hintIcon}>👆</div>
            <div>按住蓄力，松手跳跃到前方平台</div>
            <div className={styles.hintSub}>距离越远需要蓄力越多</div>
          </div>
        )}
      </div>

      {status === 'over' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>😅</div>
            <h2>游戏结束</h2>
            <p>分数：{score}</p>
            <p>最高：{bestScore}</p>
            <button className={styles.btnPrimary} onClick={restart}>再来一局</button>
          </div>
        </div>
      )}

      <p className={styles.controlHint}>按住蓄力 · 松手跳跃 · 距离越远蓄力越多</p>
    </div>
  )
}
