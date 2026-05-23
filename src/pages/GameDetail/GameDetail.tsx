import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getGameById, formatPlayCount } from '@/data/games'
import styles from './GameDetail.module.css'

function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)

  const game = getGameById(id ?? '')

  // 游戏不存在
  if (!game) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>😕</span>
          <p className={styles.emptyText}>游戏不存在</p>
          <p className={styles.emptyHint}>可能已被下架或链接有误</p>
          <button className={styles.backHomeBtn} onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const hasScreenshots = game.screenshots && game.screenshots.length > 0

  const handleBack = () => {
    // 有历史记录则返回，否则回首页
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div className={styles.page}>
      {/* ===== 顶部导航栏 ===== */}
      <div className={styles.navbar}>
        <button className={styles.backBtn} onClick={handleBack}>
          ← 返回
        </button>
        <span className={styles.navTitle}>游戏详情</span>
        <div style={{ width: 56 }} />
      </div>

      {/* ===== 游戏头部信息 ===== */}
      <div className={styles.hero}>
        <div className={styles.gameIcon}>{game.icon}</div>
        <div className={styles.gameMeta}>
          <h1 className={styles.gameName}>{game.name}</h1>
          <div className={styles.gameSub}>
            <span className={styles.category}>{game.category}</span>
            <span className={styles.divider}>·</span>
            <span className={styles.developer}>{game.developer}</span>
          </div>
          <div className={styles.stats}>
            <span className={styles.statItem}>
              <span className={styles.statIcon}>⭐</span>
              {game.rating}
            </span>
            <span className={styles.statItem}>
              <span className={styles.statIcon}>👥</span>
              {formatPlayCount(game.playCount)}次游玩
            </span>
            <span className={styles.statItem}>
              <span className={styles.statIcon}>📅</span>
              {game.createdAt}
            </span>
          </div>
        </div>
      </div>

      {/* ===== 操作按钮区 ===== */}
      <div className={styles.actions}>
        <button
          className={styles.playBtn}
          onClick={() => navigate(`/game/${id}/play`)}
          disabled={!game.implemented}
        >
          {game.implemented ? (
            <>
              <span className={styles.playBtnIcon}>🎮</span>
              <span>开始游戏</span>
            </>
          ) : (
            <>
              <span className={styles.playBtnIcon}>🚧</span>
              <span>敬请期待</span>
            </>
          )}
        </button>
        <button
          className={`${styles.favBtn} ${liked ? styles.favBtnActive : ''}`}
          onClick={() => setLiked((v) => !v)}
        >
          {liked ? '❤️' : '🤍'}
        </button>
        <button className={styles.shareBtn}>
          <span>↗</span>
        </button>
      </div>

      {/* ===== 状态提示条 ===== */}
      {game.implemented ? (
        <div className={styles.statusBar}>
          <span className={styles.statusDot} />
          <span>已上线 · 可直接游玩</span>
        </div>
      ) : (
        <div className={styles.statusBarPending}>
          <span>⏳</span>
          <span>开发中 · 敬请期待</span>
        </div>
      )}

      {/* ===== 游戏简介 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📖 游戏简介</h2>
        <div className={styles.description}>
          {game.description.split('\n').map((line, i) => (
            <p key={i} className={styles.descLine}>{line || '\u00A0'}</p>
          ))}
        </div>
      </section>

      {/* ===== 标签 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🏷️ 标签</h2>
        <div className={styles.tagList}>
          {game.tags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      </section>

      {/* ===== 截图预览 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📸 游戏截图</h2>
        <div className={styles.screenshots}>
          {hasScreenshots
            ? game.screenshots!.map((src, index) => (
                <div key={index} className={styles.screenshotItem}>
                  <img
                    src={src}
                    alt={`${game.name} 截图 ${index + 1}`}
                    loading="lazy"
                  />
                </div>
              ))
            : [1, 2, 3].map((index) => (
                <div key={index} className={styles.screenshotPlaceholder}>
                  <span className={styles.screenshotPlaceholderIcon}>
                    {game.icon}
                  </span>
                  <span>截图 {index}</span>
                </div>
              ))
          }
        </div>
      </section>

      {/* ===== 游戏信息 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>ℹ️ 游戏信息</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>开发者</span>
            <span className={styles.infoValue}>{game.developer}</span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>上线日期</span>
            <span className={styles.infoValue}>{game.createdAt}</span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>分类</span>
            <span className={styles.infoValue}>{game.category}</span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>评分</span>
            <span className={styles.infoValue}>
              <span className={styles.starRating}>
                {'★'.repeat(Math.round(game.rating))}
                {'☆'.repeat(5 - Math.round(game.rating))}
              </span>
              <span className={styles.ratingNum}>{game.rating}</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default GameDetail
