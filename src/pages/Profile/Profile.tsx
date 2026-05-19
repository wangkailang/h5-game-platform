import styles from './Profile.module.css'

/** Mock 用户数据 */
const MOCK_USER = {
  nickname: '游戏达人',
  avatar: '😎',
  level: 12,
  totalPlayTime: '126小时',
  gamesPlayed: 38,
  achievements: [
    { id: '1', name: '初出茅庐', icon: '🌟', description: '完成第一个游戏' },
    { id: '2', name: '游戏狂人', icon: '🔥', description: '累计游玩100小时' },
    { id: '3', name: '收藏家', icon: '💎', description: '收藏10款游戏' },
  ],
  recentGames: [
    { id: '1', name: '2048 经典版', icon: '🔢', lastPlayed: '2小时前' },
    { id: '3', name: '跳一跳', icon: '🦘', lastPlayed: '昨天' },
    { id: '5', name: '消消乐', icon: '🍬', lastPlayed: '3天前' },
  ],
}

function Profile() {
  return (
    <div className={styles.page}>
      {/* 用户卡片 */}
      <div className={styles.userCard}>
        <div className={styles.avatar}>{MOCK_USER.avatar}</div>
        <div className={styles.userInfo}>
          <h2 className={styles.nickname}>{MOCK_USER.nickname}</h2>
          <span className={styles.level}>Lv.{MOCK_USER.level}</span>
        </div>
      </div>

      {/* 数据统计 */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{MOCK_USER.gamesPlayed}</span>
          <span className={styles.statLabel}>玩过游戏</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{MOCK_USER.totalPlayTime}</span>
          <span className={styles.statLabel}>总时长</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{MOCK_USER.achievements.length}</span>
          <span className={styles.statLabel}>成就</span>
        </div>
      </div>

      {/* 成就列表 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🏆 我的成就</h3>
        <div className={styles.achievementList}>
          {MOCK_USER.achievements.map((ach) => (
            <div key={ach.id} className={styles.achievementItem}>
              <span className={styles.achievementIcon}>{ach.icon}</span>
              <div>
                <p className={styles.achievementName}>{ach.name}</p>
                <p className={styles.achievementDesc}>{ach.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 最近在玩 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🕐 最近在玩</h3>
        <div className={styles.recentList}>
          {MOCK_USER.recentGames.map((game) => (
            <a key={game.id} href={`/game/${game.id}`} className={styles.recentItem}>
              <span className={styles.recentIcon}>{game.icon}</span>
              <div className={styles.recentInfo}>
                <span className={styles.recentName}>{game.name}</span>
                <span className={styles.recentTime}>{game.lastPlayed}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Profile
