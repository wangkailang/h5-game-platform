import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { games, categories, formatPlayCount } from '@/data/games'
import styles from './Home.module.css'

function Home() {
  const [activeCategory, setActiveCategory] = useState('all')
  const navigate = useNavigate()

  const filteredGames =
    activeCategory === 'all'
      ? games
      : games.filter((g) => g.categoryId === activeCategory)

  return (
    <div className={styles.home}>
      {/* 顶部搜索栏 */}
      <header className={styles.header}>
        <h1 className={styles.logo}>🎮 GameHub</h1>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <span className={styles.searchPlaceholder}>搜索游戏</span>
        </div>
      </header>

      {/* Banner 轮播区 */}
      <section className={styles.banner}>
        <div className={styles.bannerCard}>
          <div className={styles.bannerContent}>
            <span className={styles.bannerTag}>🔥 热门推荐</span>
            <h2>贪吃蛇大作战</h2>
            <p>经典贪吃蛇，支持键盘·滑动·虚拟按键</p>
          </div>
        </div>
      </section>

      {/* 分类导航 */}
      <section className={styles.categories}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.categoryItem} ${activeCategory === cat.id ? styles.categoryActive : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className={styles.categoryIcon}>{cat.icon}</span>
            <span className={styles.categoryName}>{cat.name}</span>
          </button>
        ))}
      </section>

      {/* 游戏列表 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>精选游戏</h2>
          <span className={styles.sectionMore}>查看更多 →</span>
        </div>
        <div className={styles.gameGrid}>
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className={styles.gameCard}
              onClick={() => navigate(`/game/${game.id}`)}
            >
              <div className={styles.gameIconWrap}>
                <div className={styles.gameIcon}>{game.icon}</div>
                {game.implemented && <span className={styles.playableBadge}>可玩</span>}
              </div>
              <div className={styles.gameInfo}>
                <h3 className={styles.gameName}>{game.name}</h3>
                <div className={styles.gameMeta}>
                  <span className={styles.rating}>⭐ {game.rating}</span>
                  <span className={styles.playCount}>{formatPlayCount(game.playCount)}人玩过</span>
                </div>
                <div className={styles.tags}>
                  {game.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home
