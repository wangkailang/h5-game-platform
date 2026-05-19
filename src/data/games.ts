/**
 * 游戏数据源 — 全平台共享
 */

export interface GameData {
  id: string
  name: string
  icon: string
  category: string
  categoryId: string
  tags: string[]
  rating: number
  playCount: number
  description: string
  developer: string
  createdAt: string
  /** 是否已实现（可直接玩） */
  implemented: boolean
}

export const categories = [
  { id: 'all', name: '全部', icon: '🎯' },
  { id: 'casual', name: '休闲', icon: '🎲' },
  { id: 'puzzle', name: '益智', icon: '🧩' },
  { id: 'action', name: '动作', icon: '⚡' },
  { id: 'strategy', name: '策略', icon: '♟️' },
  { id: 'sports', name: '体育', icon: '⚽' },
]

export const games: GameData[] = [
  {
    id: '1',
    name: '2048 经典版',
    icon: '🔢',
    category: '益智',
    categoryId: 'puzzle',
    tags: ['益智', '数字', '经典'],
    rating: 4.8,
    playCount: 128000,
    description: '2048 是一款风靡全球的数字益智游戏。玩家通过上下左右滑动，让相同数字的方块碰撞合并，最终目标是合成 2048。游戏规则简单却极具挑战性，锻炼你的逻辑思维和空间规划能力。',
    developer: 'GameStudio',
    createdAt: '2025-01-15',
    implemented: true,
  },
  {
    id: '2',
    name: '贪吃蛇大作战',
    icon: '🐍',
    category: '休闲',
    categoryId: 'casual',
    tags: ['休闲', '竞技', '经典'],
    rating: 4.6,
    playCount: 95000,
    description: '经典贪吃蛇玩法全新升级！控制小蛇在地图上吃食物不断成长，速度会随着你的进步越来越快。支持键盘操控、触摸滑动和虚拟方向键，随时随地畅玩。挑战你的反应力和策略规划！',
    developer: 'SnakeTeam',
    createdAt: '2025-02-20',
    implemented: true,
  },
  {
    id: '3',
    name: '跳一跳',
    icon: '🦘',
    category: '休闲',
    categoryId: 'casual',
    tags: ['休闲', '挑战', '微信'],
    rating: 4.5,
    playCount: 230000,
    description: '按住屏幕蓄力，松手跳跃到下一个平台！跳得越准分数越高，连续精准跳跃还能获得加分。考验你的手感和节奏感，简单却让人上瘾。',
    developer: 'JumpStudio',
    createdAt: '2025-01-05',
    implemented: true,
  },
  {
    id: '4',
    name: '五子棋大师',
    icon: '⚫',
    category: '策略',
    categoryId: 'strategy',
    tags: ['策略', '对战', '棋类'],
    rating: 4.7,
    playCount: 67000,
    description: '经典五子棋对弈游戏，支持双人对战和 AI 对弈。在 15×15 的棋盘上，先将五颗棋子连成一线者获胜。内置多种难度 AI，从新手到大师都能找到合适的挑战。',
    developer: 'ChessMaster',
    createdAt: '2025-03-10',
    implemented: false,
  },
  {
    id: '5',
    name: '消消乐',
    icon: '🍬',
    category: '益智',
    categoryId: 'puzzle',
    tags: ['益智', '消除', '三消'],
    rating: 4.4,
    playCount: 310000,
    description: '交换相邻的糖果，让三个或以上相同糖果连成一线即可消除！连锁反应带来华丽特效和海量分数。数百个精心设计的关卡，让你停不下来。',
    developer: 'CandyLab',
    createdAt: '2025-02-01',
    implemented: true,
  },
  {
    id: '6',
    name: '足球射门',
    icon: '⚽',
    category: '体育',
    categoryId: 'sports',
    tags: ['体育', '足球', '射门'],
    rating: 4.3,
    playCount: 45000,
    description: '瞄准球门，调整角度和力度，射出完美弧线！面对守门员的防守，选择最佳射门角度。支持任意球、点球等多种模式，体验进球的快感。',
    developer: 'SportGames',
    createdAt: '2025-04-01',
    implemented: false,
  },
  {
    id: '7',
    name: '忍者跑酷',
    icon: '🥷',
    category: '动作',
    categoryId: 'action',
    tags: ['动作', '跑酷', '忍者'],
    rating: 4.5,
    playCount: 88000,
    description: '化身忍者在屋顶间飞奔！点击屏幕跳跃，双击二段跳，长按滑铲躲避障碍。收集金币解锁酷炫皮肤，挑战全球排行榜。速度与激情的完美结合！',
    developer: 'NinjaGames',
    createdAt: '2025-03-20',
    implemented: false,
  },
  {
    id: '8',
    name: '数独挑战',
    icon: '🧮',
    category: '益智',
    categoryId: 'puzzle',
    tags: ['益智', '数独', '逻辑'],
    rating: 4.9,
    playCount: 52000,
    description: '经典 9×9 数独谜题，三档难度自由选择。支持笔记模式记录候选数字，一键提示帮你突破瓶颈。实时冲突检测和高亮关联让推理更直观。锻炼逻辑思维的最佳选择！',
    developer: 'SudokuMaster',
    createdAt: '2025-01-25',
    implemented: true,
  },
]

/** 根据 ID 获取游戏 */
export function getGameById(id: string): GameData | undefined {
  return games.find((g) => g.id === id)
}

/** 格式化游玩次数 */
export function formatPlayCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  return String(count)
}
