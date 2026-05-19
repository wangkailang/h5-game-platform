import { useParams, useNavigate } from 'react-router-dom'
import { getGameById, formatPlayCount } from '@/data/games'
import styles from './GameDetail.module.css'

function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const game = getGameById(id ?? '')

  // 游戏不存在
  if (!game) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <p>😕 游戏不存在</p>
          <button className={styles.backHomeBtn} onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* 顶部游戏信息 */}
      <div className={styles.hero}>
        <div className={styles.gameIcon}>{game.icon}</div>
        <div className={styles.gameMeta}>
          <h1 className={styles.gameName}>{game.name}</h1>
          <p className={styles.gameCategory}>
            {game.category} · {game.developer}
          </p>
          <div className={styles.stats}>
            <span className={styles.statItem}>⭐ {game.rating}</span>
            <span className={styles.statItem}>
              🎮 {formatPlayCount(game.playCount)}次游玩
            </span>
          </div>
        </div>
      </div>

      {/* 操作按钮区 */}
      <div className={styles.actions}>
        <button
          className={styles.playBtn}
          onClick={() => navigate(`/game/${id}/play`)}
          disabled={!game.implemented}
        >
          {game.implemented ? '🎮 开始游戏' : '🚧 敬请期待'}
        </button>
        <button className={styles.favBtn}>❤️ 收藏</button>
      </div>

      {/* 上线状态 */}
      {game.implemented && (
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          已上线 · 可直接游玩
        </div>
      )}

      {/* 游戏简介 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>游戏简介</h2>
        <p className={styles.description}>{game.description}</p>
      </section>

      {/* 标签 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>标签</h2>
        <div className={styles.tagList}>
          {game.tags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      </section>

      {/* 截图预览 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>游戏截图</h2>
        <div className={styles.screenshots}>
          {[1, 2, 3].map((index) => (
            <div key={index} className={styles.screenshotPlaceholder}>
              <span>{game.icon}</span>
              <span>截图 {index}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 游戏信息 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>游戏信息</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>开发者</span>
            <span className={styles.infoValue}>{game.developer}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>上线日期</span>
            <span className={styles.infoValue}>{game.createdAt}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>分类</span>
            <span className={styles.infoValue}>{game.category}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>评分</span>
            <span className={styles.infoValue}>{game.rating} / 5.0</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default GameDetail
