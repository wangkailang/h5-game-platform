# H5 Game Platform 🎮

[![Build and Deploy](https://github.com/wangkailang/h5-game-platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/wangkailang/h5-game-platform/actions/workflows/deploy.yml)

🎮 **[在线体验](https://wangkailang.github.io/h5-game-platform/)**

H5 即点即玩游戏平台，基于 React + TypeScript + Vite 构建。

## 技术栈

- **构建工具**: Vite 5
- **前端框架**: React 18 + TypeScript
- **路由管理**: React Router v6
- **状态管理**: Zustand
- **HTTP 请求**: Axios
- **样式方案**: CSS Modules
- **包管理器**: pnpm
- **CI/CD**: GitHub Actions → GitHub Pages

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

## 项目结构

```
src/
├── api/              # API 请求封装
├── assets/           # 静态资源
├── components/       # 公共组件
├── data/             # 共享数据源
├── games/            # 内置游戏
│   ├── Snake/        # 🐍 贪吃蛇大作战
│   └── Sudoku/       # 🧮 数独挑战
├── hooks/            # 自定义 Hooks
├── pages/            # 页面组件
│   ├── Home/         # 首页 - 游戏中心
│   ├── GameDetail/   # 游戏详情页
│   ├── GamePlay/     # 游戏运行页
│   └── Profile/      # 个人中心
├── store/            # Zustand 状态管理
├── styles/           # 全局样式
├── types/            # TypeScript 类型定义
└── utils/            # 工具函数
```

## 内置游戏

| 游戏 | 状态 | 操控方式 |
|------|------|----------|
| 🐍 贪吃蛇大作战 | ✅ 已上线 | 键盘 / 触摸滑动 / 虚拟方向键 |
| 🧮 数独挑战 | ✅ 已上线 | 点击选格 + 数字面板 |
| 🔢 2048 经典版 | 🔜 开发中 | - |
| 🦘 跳一跳 | 🔜 开发中 | - |
| ⚫ 五子棋大师 | 🔜 开发中 | - |
| 🍬 消消乐 | 🔜 开发中 | - |
| ⚽ 足球射门 | 🔜 开发中 | - |
| 🥷 忍者跑酷 | 🔜 开发中 | - |

## 部署

项目通过 GitHub Actions 自动部署到 GitHub Pages。

每次推送到 `main` 分支会自动触发构建和部署。

## 环境变量

创建 `.env.local` 文件（可选）：

```
VITE_API_BASE_URL=http://localhost:8080/api
```

## License

MIT
