import React, { useState } from 'react';
import { Plus, Target, Sparkles, AlertCircle } from 'lucide-react';
import type { Goal, KeyResult } from '../types';
import GoalModal from '../components/GoalModal';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);

  const handleAddGoal = (goal: Goal) => {
    setActiveGoals(prev => [goal, ...prev]);
  };

  const updateKRProgress = (goalId: string, krId: string, newProgress: number) => {
    setActiveGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedKRs = goal.key_results.map(kr => 
        kr.id === krId ? { ...kr, progress_pct: newProgress } : kr
      );
      return { ...goal, key_results: updatedKRs };
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-400 mt-2">Manage your OKRs and track your progress.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors"
        >
          <Plus size={18} />
          Create New Goal
        </button>
      </div>

      {/* Stats row (Placeholder) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <h3 className="font-medium text-zinc-400 text-sm">Active Goals</h3>
          <p className="text-3xl font-bold mt-2">{activeGoals.length}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <h3 className="font-medium text-zinc-400 text-sm">Alignment Score</h3>
          <p className="text-3xl font-bold mt-2">--</p>
        </div>
      </div>

      {/* Active Goals List */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target size={20} className="text-zinc-400" />
          My Active Goals
        </h2>
        
        {activeGoals.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center bg-zinc-900/20">
            <div className="w-12 h-12 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="text-zinc-400" size={24} />
            </div>
            <h3 className="text-lg font-medium text-zinc-200">No active goals yet</h3>
            <p className="text-zinc-500 mt-1 max-w-sm">
              Get started by creating a new goal. Our AI can suggest objectives and key results based on your focus area.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors"
            >
              Create Goal
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {activeGoals.map(goal => (
              <div key={goal.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{goal.objective_text}</h3>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wider">
                          {goal.status}
                        </span>
                        <span className="text-zinc-500 text-sm font-medium">{goal.cycle}</span>
                        {goal.pillar_title && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {goal.pillar_title}
                          </span>
                        )}
                      </div>
                    </div>
                    {goal.ai_generated && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-purple-400 bg-purple-400/10 px-2 py-1 rounded border border-purple-400/20">
                        <Sparkles size={12} />
                        AI Suggested
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-5 space-y-5 bg-zinc-950">
                  {goal.key_results.map((kr) => (
                    <div key={kr.id} className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-sm font-medium text-zinc-300 flex-1">{kr.kr_text}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-500 w-12 text-right">
                            {kr.progress_pct}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${kr.progress_pct}%` }}
                          />
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={kr.progress_pct}
                          onChange={(e) => updateKRProgress(goal.id, kr.id, parseInt(e.target.value))}
                          className="w-32 accent-blue-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddGoal}
      />
    </div>
  );
}
