import { Navigate, Route, Routes } from 'react-router-dom'
import { ContinuousKellyPage } from './tools/continuous-kelly/ContinuousKellyPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tools/continuous-kelly" replace />} />
      <Route path="/tools/continuous-kelly" element={<ContinuousKellyPage />} />
      <Route path="*" element={<Navigate to="/tools/continuous-kelly" replace />} />
    </Routes>
  )
}

export default App
