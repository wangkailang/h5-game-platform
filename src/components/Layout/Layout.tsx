import { Outlet } from 'react-router-dom'
import styles from './Layout.module.css'

/**
 * 全局布局组件
 * 包含底部导航栏 + 内容区域
 */
function Layout() {
  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <nav className={styles.tabBar}>
        <a href="/" className={styles.tabItem}>
          <span className={styles.tabIcon}>🏠</span>
          <span className={styles.tabLabel}>首页</span>
        </a>
        <a href="/" className={styles.tabItem}>
          <span className={styles.tabIcon}>🔥</span>
          <span className={styles.tabLabel}>热门</span>
        </a>
        <a href="/" className={styles.tabItem}>
          <span className={styles.tabIcon}>🆕</span>
          <span className={styles.tabLabel}>新品</span>
        </a>
        <a href="/profile" className={styles.tabItem}>
          <span className={styles.tabIcon}>👤</span>
          <span className={styles.tabLabel}>我的</span>
        </a>
      </nav>
    </div>
  )
}

export default Layout
