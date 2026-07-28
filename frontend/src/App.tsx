import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Team from './pages/Team'
import Admin from './pages/Admin'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="team" element={<Team />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}

export default App
