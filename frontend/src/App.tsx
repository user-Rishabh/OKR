import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Team from './pages/Team'
import MemberDetail from './pages/MemberDetail'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="team" element={<Team />} />
          <Route path="team/member/:userId" element={<MemberDetail />} />
          <Route path="admin" element={<Admin />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
