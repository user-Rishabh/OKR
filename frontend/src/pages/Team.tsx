import React from 'react'
import { useAuth } from '../context/AuthContext'
import { AlertCircle } from 'lucide-react'

export default function Team() {
  const { currentUser } = useAuth()

  if (currentUser && currentUser.role === 'employee') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/20 border border-zinc-800 rounded-xl mt-8">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Access restricted</h2>
        <p className="text-zinc-400">This page is only available to managers and admins.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team View</h1>
        <p className="text-zinc-400 mt-2">View and manage OKRs across your team.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <p className="text-zinc-500">Team members and their goals will appear here.</p>
      </div>
    </div>
  )
}

