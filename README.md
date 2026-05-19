# H5 Game Platform 🎮

H5 即点即玩游戏平台，基于 React + TypeScript + Vite 构建。

## 技术栈

- **构建工具**: Vite 5
- **前端框架**: React 18 + TypeScript
- **路由管理**: React Router v6
- **状态管理**: Zustand
- **HTTP 请求**: Axios
- **样式方案**: CSS Modules
- **包管理器**: pnpm

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
│   └── Layout/       # 全局布局
├── hooks/            # 自定义 Hooks
├── pages/            # 页面组件
│   ├── Home/         # 首页 - 游戏中心
│   ├── GameDetail/   # 游戏详情页
│   ├── GamePlay/     # 游戏运行页（iframe）
│   └── Profile/      # 个人中心
├── router/           # 路由配置
├── store/            # Zustand 状态管理
├── styles/           # 全局样式
├── types/            # TypeScript 类型定义
├── utils/            # 工具函数
├── App.tsx           # 根组件
└── main.tsx          # 入口文件
```

## 核心功能

- 🏠 **游戏中心** — 分类浏览、搜索、推荐
- 🎮 **即点即玩** — iframe 加载 H5 游戏
- 👤 **个人中心** — 游戏记录、成就、收藏
- 📱 **移动端适配** — 响应式布局，适配各尺寸屏幕

## 环境变量

创建 `.env.local` 文件：

```
VITE_API_BASE_URL=http://localhost:8080/api
```
