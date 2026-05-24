import { useRef, useEffect, useState, useCallback } from 'react'
import styles from './NinjaRun.module.css'

// ─── 常量 ───
const GROUND_Y_RATIO = 0.78
const GRAVITY = 0.65
const JUMP_FORCE = -14
const DOUBLE_JUMP_FORCE = -12
const SLIDE_DURATION = 500
const INITIAL_SPEED = 5
const MAX_SPEED = 14
const SPEED_INCREMENT = 0.003

// ─── 颜色主题 ───
const SKY_TOP = '#1a1a2e'
const SKY_BOTTOM = '#16213e'
const BUILDING_COLORS = ['#0f3460', '#1a1a4e', '#162447', '#1f4068', '#1b1b2f']
const ROOF_COLOR = '#e94560'
const GROUND_COLOR = '#533483'
const NINJA_BODY = '#2d3436'
const NINJA_SCARF = '#e94560'
const NINJA_EYE = '#ffeaa7'
const COIN_COLOR = '#fdcb6e'
const SHURIKEN_COLOR = '#b2bec3'
const BARRIER_COLOR = '#6c5ce7'

// ─── 类型 ───
interface Ninja {
  x: number; y: number; vy: number; w: number; h: number
  state: 'run' | 'jump' | 'doubleJump' | 'slide' | 'dead'
  runFrame: number
  slideTimer: number
  canDoubleJump: boolean
  scarfWave: number
  invincible: number
}

interface Obstacle {
  x: number; y: number; w: number; h: number
  type: 'barrier' | 'lowBar' | 'shuriken'
  passed: boolean
  spin?: number
}

interface Coin {
  x: number; y: number; r: number; collected: boolean; sparkle: number
}

interface Building {
  x: number; w: number; h: number; color: string; windows: { rx: number; ry: number }[]
}

interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; size: number; color: string
}

interface Star {
  x: number; y: number; r: number; twinkle: number; speed: number
}

interface GameState {
  ninja: Ninja
  obstacles: Obstacle[]
  coins: Coin[]
  buildings: Building[]
  stars: Star[]
  particles: Particle[]
  score: number
  bestScore: number
  coinCount: number
  speed: number
  status: 'ready' | 'playing' | 'over'
  groundY: number
  distance: number
  spawnTimer: number
  coinSpawnTimer: number
}

// ─── 工具 ───
function rand(min: number, max: number) { return min + Math.random() * (max - min) }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)) }

function makeStar(canvasW: number, canvasH: number): Star {
  return { x: rand(0, canvasW), y: rand(0, canvasH * 0.5), r: rand(0.5, 2), twinkle: rand(0, Math.PI * 2), speed: rand(0.01, 0.04) }
}

function makeBuilding(x: number, canvasH: number): Building {
  const h = rand(canvasH * 0.2, canvasH * 0.5)
  const w = rand(60, 140)
  const color = BUILDING_COLORS[randInt(0, BUILDING_COLORS.length - 1)]
  const windows: { rx: number; ry: number }[] = []
  const cols = Math.floor(w / 24)
  const rows = Math.floor(h / 28)
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (Math.random() > 0.3) {
        windows.push({ rx: 8 + c * 24, ry: 10 + r * 28 })
      }
    }
  }
  return { x, w, h, color, windows }
}

function initBuildings(canvasW: number, canvasH: number): Building[] {
  const list: Building[] = []
  let x = -50
  while (x < canvasW + 200) {
    const b = makeBuilding(x, canvasH)
    list.push(b)
    x += b.w + rand(10, 40)
  }
  return list
}

function initStars(canvasW: number, canvasH: number): Star[] {
  return Array.from({ length: 60 }, () => makeStar(canvasW, canvasH))
}

function initState(canvasW: number, canvasH: number): GameState {
  const groundY = canvasH * GROUND_Y_RATIO
  let best = 0
  try { best = Number(localStorage.getItem('ninjaRunBest')) || 0 } catch { /* */ }
  return {
    ninja: {
      x: 60, y: groundY - 48, vy: 0,
      w: 28, h: 48,
      state: 'run', runFrame: 0, slideTimer: 0,
      canDoubleJump: true, scarfWave: 0, invincible: 0
    },
    obstacles: [], coins: [],
    buildings: initBuildings(canvasW, canvasH),
    stars: initStars(canvasW, canvasH),
    particles: [],
    score: 0, bestScore: best, coinCount: 0,
    speed: INITIAL_SPEED,
    status: 'ready', groundY,
    distance: 0, spawnTimer: 0, coinSpawnTimer: 0
  }
}

// ─── 生成障碍物 ───
function spawnObstacle(gs: GameState, canvasW: number): Obstacle {
  const r = Math.random()
  if (r < 0.4) {
    return { x: canvasW + 50, y: gs.groundY - 50, w: 30, h: 50, type: 'barrier', passed: false }
  } else if (r < 0.7) {
    return { x: canvasW + 50, y: gs.groundY - 65, w: 50, h: 25, type: 'lowBar', passed: false }
  } else {
    return { x: canvasW + 50, y: gs.groundY - 75 - rand(0, 30), w: 24, h: 24, type: 'shuriken', passed: false, spin: 0 }
  }
}

function spawnCoin(gs: GameState, canvasW: number): Coin {
  const y = gs.groundY - rand(40, 120)
  return { x: canvasW + 50 + rand(0, 100), y, r: 10, collected: false, sparkle: 0 }
}

// ─── 碰撞检测 ───
function boxCollide(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

// ─── 粒子生成 ───
function spawnParticles(list: Particle[], x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    list.push({
      x, y,
      vx: rand(-3, 3), vy: rand(-5, -1),
      life: 1, maxLife: rand(0.3, 0.7),
      size: rand(2, 6), color
    })
  }
}

// ─── 绘制函数 ───
function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, SKY_TOP)
  grad.addColorStop(1, SKY_BOTTOM)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[]) {
  for (const s of stars) {
    const alpha = 0.3 + Math.sin(s.twinkle) * 0.35
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.fill()
  }
}

function drawBuildings(ctx: CanvasRenderingContext2D, buildings: Building[], groundY: number) {
  for (const b of buildings) {
    const by = groundY - b.h
    ctx.fillStyle = b.color
    ctx.fillRect(b.x, by, b.w, b.h)
    ctx.fillStyle = ROOF_COLOR
    ctx.fillRect(b.x - 3, by, b.w + 6, 5)
    for (const win of b.windows) {
      ctx.fillStyle = Math.random() > 0.02 ? 'rgba(255,234,167,0.6)' : 'rgba(255,234,167,0.15)'
      ctx.fillRect(b.x + win.rx, by + win.ry, 10, 14)
    }
  }
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, groundY: number) {
  ctx.fillStyle = GROUND_COLOR
  ctx.fillRect(0, groundY, w, h - groundY)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, groundY + 1)
  ctx.lineTo(w, groundY + 1)
  ctx.stroke()
}

function drawNinja(ctx: CanvasRenderingContext2D, n: Ninja) {
  ctx.save()
  const cx = n.x + n.w / 2
  const cy = n.y + n.h

  if (n.state === 'slide') {
    ctx.translate(cx, cy)
    ctx.fillStyle = NINJA_BODY
    roundRect(ctx, -n.h / 2, -n.w, n.h, n.w - 4, 6)
    ctx.fill()
    ctx.fillStyle = NINJA_SCARF
    roundRect(ctx, -n.h / 2 - 2, -n.w + 2, 14, n.w - 8, 4)
    ctx.fill()
    ctx.fillStyle = NINJA_EYE
    ctx.fillRect(-n.h / 2 + 8, -n.w + 4, 5, 4)
    ctx.restore()
    return
  }

  ctx.translate(cx, cy)

  const legAngle = n.state === 'run' ? Math.sin(n.runFrame * 0.3) * 0.6 : 0
  const armAngle = n.state === 'run' ? Math.sin(n.runFrame * 0.3 + Math.PI) * 0.5 : 0

  // 腿
  ctx.save()
  ctx.fillStyle = NINJA_BODY
  ctx.translate(-4, -4)
  ctx.rotate(legAngle)
  roundRect(ctx, -3, 0, 6, 16, 3)
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.fillStyle = NINJA_BODY
  ctx.translate(4, -4)
  ctx.rotate(-legAngle)
  roundRect(ctx, -3, 0, 6, 16, 3)
  ctx.fill()
  ctx.restore()

  // 身体
  ctx.fillStyle = NINJA_BODY
  roundRect(ctx, -n.w / 2 + 2, -n.h + 14, n.w - 4, n.h - 28, 4)
  ctx.fill()

  // 手臂
  ctx.save()
  ctx.fillStyle = NINJA_BODY
  ctx.translate(-n.w / 2 + 2, -n.h + 22)
  ctx.rotate(armAngle)
  roundRect(ctx, -4, 0, 5, 14, 3)
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.fillStyle = NINJA_BODY
  ctx.translate(n.w / 2 - 2, -n.h + 22)
  ctx.rotate(-armAngle)
  roundRect(ctx, -1, 0, 5, 14, 3)
  ctx.fill()
  ctx.restore()

  // 头
  ctx.fillStyle = NINJA_BODY
  ctx.beginPath()
  ctx.arc(0, -n.h + 8, 10, 0, Math.PI * 2)
  ctx.fill()

  // 眼睛
  ctx.fillStyle = NINJA_EYE
  ctx.fillRect(2, -n.h + 5, 5, 4)

  // 头巾飘带
  ctx.fillStyle = NINJA_SCARF
  n.scarfWave += 0.15
  const sw = Math.sin(n.scarfWave) * 4
  ctx.beginPath()
  ctx.moveTo(-8, -n.h + 6)
  ctx.quadraticCurveTo(-18, -n.h + 10 + sw, -26, -n.h + 4 + sw * 1.5)
  ctx.quadraticCurveTo(-18, -n.h + 16 + sw, -8, -n.h + 12)
  ctx.fill()

  // 二段跳特效
  if (n.state === 'doubleJump') {
    ctx.strokeStyle = 'rgba(233,69,96,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, 20 + Math.sin(Date.now() * 0.01) * 5, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle) {
  if (o.type === 'barrier') {
    ctx.fillStyle = BARRIER_COLOR
    roundRect(ctx, o.x, o.y, o.w, o.h, 4)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(o.x + 4, o.y + 4, 3, o.h - 8)
    ctx.fillRect(o.x + o.w - 7, o.y + 4, 3, o.h - 8)
  } else if (o.type === 'lowBar') {
    ctx.fillStyle = '#d63031'
    roundRect(ctx, o.x, o.y, o.w, o.h, 4)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    for (let i = 0; i < o.w; i += 12) {
      ctx.fillRect(o.x + i, o.y, 6, o.h)
    }
  } else if (o.type === 'shuriken') {
    ctx.save()
    ctx.translate(o.x + o.w / 2, o.y + o.h / 2)
    ctx.rotate(o.spin || 0)
    ctx.fillStyle = SHURIKEN_COLOR
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-5, -12)
      ctx.lineTo(0, -8)
      ctx.lineTo(5, -12)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = '#636e72'
    ctx.beginPath()
    ctx.arc(0, 0, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, c: Coin) {
  if (c.collected) return
  ctx.save()
  ctx.translate(c.x, c.y)
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, c.r * 2)
  glow.addColorStop(0, 'rgba(253,203,110,0.3)')
  glow.addColorStop(1, 'rgba(253,203,110,0)')
  ctx.fillStyle = glow
  ctx.fillRect(-c.r * 2, -c.r * 2, c.r * 4, c.r * 4)
  ctx.fillStyle = COIN_COLOR
  ctx.beginPath()
  ctx.arc(0, 0, c.r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f9ca24'
  ctx.beginPath()
  ctx.arc(0, 0, c.r - 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = COIN_COLOR
  ctx.font = `bold ${c.r}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('¥', 0, 1)
  ctx.restore()
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.globalAlpha = p.life
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawHUD(ctx: CanvasRenderingContext2D, score: number, coinCount: number, bestScore: number, w: number) {
  ctx.save()
  ctx.font = 'bold 18px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#fff'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 4
  ctx.fillText(`距离: ${Math.floor(score)}m`, 16, 32)
  ctx.fillText(`🪙 ${coinCount}`, 16, 56)
  ctx.textAlign = 'right'
  ctx.fillText(`最高: ${Math.floor(bestScore)}m`, w - 16, 32)
  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ─── 渲染帧 ───
function renderFrame(canvas: HTMLCanvasElement, gs: GameState) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height

  ctx.clearRect(0, 0, w, h)

  drawSky(ctx, w, h)
  drawStars(ctx, gs.stars)
  drawBuildings(ctx, gs.buildings, gs.groundY)
  drawGround(ctx, w, h, gs.groundY)

  for (const o of gs.obstacles) drawObstacle(ctx, o)
  for (const c of gs.coins) drawCoin(ctx, c)
  drawParticles(ctx, gs.particles)

  if (gs.ninja.invincible <= 0 || Math.floor(Date.now() / 80) % 2 === 0) {
    drawNinja(ctx, gs.ninja)
  }

  if (gs.status !== 'ready') {
    drawHUD(ctx, gs.score, gs.coinCount, gs.bestScore, w)
  }

  if (gs.status === 'ready') {
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillRect(0, 0, w, h)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText('🥷 忍者跑酷', w / 2, h / 2 - 60)
    ctx.font = '18px sans-serif'
    ctx.fillText('点击屏幕开始', w / 2, h / 2)
    ctx.font = '14px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('点击跳跃 · 双击二段跳 · 长按滑铲', w / 2, h / 2 + 35)
    ctx.fillText('键盘: ↑/空格 跳跃 · ↓ 滑铲', w / 2, h / 2 + 60)
    ctx.restore()
  }
}

// ─── 更新逻辑 ───
function update(gs: GameState, dt: number, cw: number, ch: number) {
  const n = gs.ninja
  const spd = gs.speed

  gs.speed = Math.min(gs.speed + SPEED_INCREMENT * dt, MAX_SPEED)
  gs.distance += spd * dt * 0.1
  gs.score = gs.distance

  for (const s of gs.stars) s.twinkle += s.speed * dt

  for (const b of gs.buildings) b.x -= spd * 0.3 * dt
  while (gs.buildings.length > 0 && gs.buildings[0].x + gs.buildings[0].w < -20) gs.buildings.shift()
  const last = gs.buildings[gs.buildings.length - 1]
  if (last && last.x + last.w < cw + 150) {
    gs.buildings.push(makeBuilding(last.x + last.w + rand(10, 40), ch))
  }

  if (n.state === 'jump' || n.state === 'doubleJump') {
    n.vy += GRAVITY * dt
    n.y += n.vy * dt
    if (n.y >= gs.groundY - n.h) {
      n.y = gs.groundY - n.h
      n.vy = 0
      n.state = 'run'
      n.canDoubleJump = true
      spawnParticles(gs.particles, n.x + n.w / 2, gs.groundY, '#fff', 4)
    }
  }

  if (n.state === 'slide') {
    n.slideTimer -= dt * 16.67
    if (n.slideTimer <= 0) {
      n.state = 'run'
      n.h = 48
      n.y = gs.groundY - 48
    }
  }

  if (n.state === 'run') {
    n.runFrame += dt
  }

  if (n.invincible > 0) n.invincible -= dt * 16.67

  gs.spawnTimer += dt
  const spawnInterval = Math.max(50, 120 - gs.speed * 5)
  if (gs.spawnTimer > spawnInterval) {
    gs.spawnTimer = 0
    gs.obstacles.push(spawnObstacle(gs, cw))
  }

  gs.coinSpawnTimer += dt
  if (gs.coinSpawnTimer > 60) {
    gs.coinSpawnTimer = 0
    const count = randInt(1, 4)
    for (let i = 0; i < count; i++) {
      const coin = spawnCoin(gs, cw)
      coin.x += i * 30
      gs.coins.push(coin)
    }
  }

  for (const o of gs.obstacles) {
    o.x -= spd * dt
    if (o.type === 'shuriken') {
      o.spin = (o.spin || 0) + 0.15 * dt
    }

    const nx = n.state === 'slide' ? n.x : n.x + 4
    const ny = n.state === 'slide' ? gs.groundY - n.w : n.y + 4
    const nw = n.state === 'slide' ? n.h : n.w - 8
    const nh = n.state === 'slide' ? n.w - 4 : n.h - 8

    if (!o.passed && n.invincible <= 0 && boxCollide(nx, ny, nw, nh, o.x, o.y, o.w, o.h)) {
      if (n.state === 'slide' && o.type === 'lowBar') {
        // 滑铲安全通过
      } else {
        n.state = 'dead'
        spawnParticles(gs.particles, n.x + n.w / 2, n.y + n.h / 2, '#e94560', 20)
        gs.status = 'over'
        try { localStorage.setItem('ninjaRunBest', String(Math.floor(gs.bestScore))) } catch { /* */ }
        return
      }
    }

    if (!o.passed && o.x + o.w < n.x) {
      o.passed = true
      gs.score += 1
    }
  }

  for (const c of gs.coins) {
    c.x -= spd * dt
    c.sparkle += 0.1 * dt
    if (!c.collected) {
      const dist = Math.hypot((n.x + n.w / 2) - c.x, (n.y + n.h / 2) - c.y)
      if (dist < c.r + 16) {
        c.collected = true
        gs.coinCount++
        gs.score += 5
        spawnParticles(gs.particles, c.x, c.y, COIN_COLOR, 8)
      }
    }
  }

  gs.obstacles = gs.obstacles.filter(o => o.x + o.w > -50)
  gs.coins = gs.coins.filter(c => c.x > -50 && !c.collected)

  for (const p of gs.particles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 0.15 * dt
    p.life -= dt / (p.maxLife * 60)
  }
  gs.particles = gs.particles.filter(p => p.life > 0)

  gs.bestScore = Math.max(gs.bestScore, gs.score)
}

// ─── 主组件 ───
export default function NinjaRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gsRef = useRef<GameState | null>(null)
  const rafRef = useRef(0)
  const lastTsRef = useRef(0)
  const pressTimeRef = useRef(0)
  const lastTapRef = useRef(0)
  const [status, setStatus] = useState<'ready' | 'playing' | 'over'>('ready')
  const [finalScore, setFinalScore] = useState(0)
  const [finalCoins, setFinalCoins] = useState(0)
  const [finalBest, setFinalBest] = useState(0)

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return { w: 400, h: 600 }
    return { w: canvas.width, h: canvas.height }
  }, [])

  const init = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { w, h } = getCanvasSize()
    gsRef.current = initState(w, h)
    setStatus('ready')
  }, [getCanvasSize])

  // canvas 尺寸适配
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      if (gsRef.current) {
        gsRef.current.groundY = canvas.height * GROUND_Y_RATIO
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // 初始化
  useEffect(() => {
    init()
    const canvas = canvasRef.current
    if (canvas && gsRef.current) {
      renderFrame(canvas, gsRef.current)
    }
  }, [init])

  // 游戏循环
  useEffect(() => {
    if (status !== 'playing') return
    lastTsRef.current = 0

    const loop = (ts: number) => {
      const canvas = canvasRef.current
      const gs = gsRef.current
      if (!canvas || !gs) return
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = Math.min((ts - lastTsRef.current) / 16.67, 3)
      lastTsRef.current = ts

      update(gs, dt, canvas.width, canvas.height)
      renderFrame(canvas, gs)

      if (gs.status === 'over') {
        setFinalScore(Math.floor(gs.score))
        setFinalCoins(gs.coinCount)
        setFinalBest(Math.floor(gs.bestScore))
        setStatus('over')
        return
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [status])

  // ─── 操控 ───
  const doJump = useCallback(() => {
    const gs = gsRef.current
    if (!gs) return
    const n = gs.ninja

    if (gs.status === 'ready') {
      gs.status = 'playing'
      setStatus('playing')
      return
    }
    if (gs.status === 'over') return

    if (n.state === 'run') {
      n.state = 'jump'
      n.vy = JUMP_FORCE
      n.canDoubleJump = true
      spawnParticles(gs.particles, n.x + n.w / 2, gs.groundY, '#e94560', 6)
    } else if ((n.state === 'jump' || n.state === 'doubleJump') && n.canDoubleJump) {
      n.state = 'doubleJump'
      n.vy = DOUBLE_JUMP_FORCE
      n.canDoubleJump = false
      spawnParticles(gs.particles, n.x + n.w / 2, n.y + n.h, '#ffeaa7', 8)
    }
  }, [])

  const doSlide = useCallback(() => {
    const gs = gsRef.current
    if (!gs) return
    const n = gs.ninja
    if (gs.status !== 'playing') return
    if (n.state !== 'run') return

    n.state = 'slide'
    n.h = 24
    n.y = gs.groundY - 24
    n.slideTimer = SLIDE_DURATION
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const now = Date.now()

    if (gsRef.current?.status === 'over') return

    if (now - lastTapRef.current < 300) {
      doJump()
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
    }

    pressTimeRef.current = now
  }, [doJump])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const now = Date.now()
    const pressDuration = now - pressTimeRef.current

    if (gsRef.current?.status === 'over') return
    if (gsRef.current?.status === 'ready') {
      doJump()
      return
    }

    if (pressDuration > 250) {
      doSlide()
    } else if (lastTapRef.current !== 0) {
      doJump()
    }
  }, [doJump, doSlide])

  // 键盘
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        doJump()
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        doSlide()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [doJump, doSlide])

  const restart = useCallback(() => {
    init()
    const canvas = canvasRef.current
    if (canvas && gsRef.current) {
      renderFrame(canvas, gsRef.current)
    }
  }, [init])

  return (
    <div className={styles.container}>
      <div className={styles.gameArea}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onContextMenu={e => e.preventDefault()}
        />
      </div>

      {status === 'over' && (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>💀</div>
            <h2>任务失败</h2>
            <p>距离: {finalScore}m</p>
            <p>金币: {finalCoins} 🪙</p>
            <p>最高纪录: {finalBest}m</p>
            <button className={styles.btnPrimary} onClick={restart}>再来一次</button>
          </div>
        </div>
      )}

      <p className={styles.controlHint}>点击跳跃 · 双击二段跳 · 长按滑铲 | ↑/空格 跳跃 · ↓ 滑铲</p>
    </div>
  )
}
