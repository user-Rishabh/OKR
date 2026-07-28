import React from 'react'

export default function Admin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-zinc-400 mt-2">Configure company-wide strategic pillars and settings.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="font-medium mb-4">Strategic Pillars</h3>
        <p className="text-zinc-500">Pillar configuration options will go here.</p>
      </div>
    </div>
  )
}
