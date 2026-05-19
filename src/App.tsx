import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Home from './pages/Home/Home'
import GameDetail from './pages/GameDetail/GameDetail'
import GamePlay from './pages/GamePlay/GamePlay'
import Profile from './pages/Profile/Profile'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="game/:id" element={<GameDetail />} />
        <Route path="game/:id/play" element={<GamePlay />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App
