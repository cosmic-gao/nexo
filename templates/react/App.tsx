import { Routes, Route } from 'react-router-dom'
import { Default } from '@/layouts'
import { Home } from '@/pages/Home'
import { About } from '@/pages/About'
import { NotFound } from '@/pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Default />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App

