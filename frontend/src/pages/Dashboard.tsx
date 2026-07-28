import React from 'react'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 mt-2">Manage your OKRs and track your progress.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder cards */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="font-medium">Active Goals</h3>
          <p className="text-3xl font-bold mt-2">3</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="font-medium">Alignment Score</h3>
          <p className="text-3xl font-bold mt-2">92%</p>
        </div>
      </div>
    </div>
  )
}
