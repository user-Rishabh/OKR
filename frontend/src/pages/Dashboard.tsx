import React, { useState, useEffect, useRef } from 'react';
import { Plus, Target, Sparkles, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import type { Goal, KeyResult } from '../types';
import GoalModal from '../components/GoalModal';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [activeUpdateKrId, setActiveUpdateKrId] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<{ estimated_progress_pct: number; reasoning: string } | null>(null);
  const [proposedProgress, setProposedProgress] = useState<number>(0);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nudges, setNudges] = useState<Record<string, { text: string; loading: boolean }>>({});

  const { currentUser, session, loading: authLoading } = useAuth();

  const handleGetNudge = async (goalId: string) => {
    setNudges(prev => ({
      ...prev,
      [goalId]: { text: '', loading: true }
    }));

    try {
      const res = await fetch(`http://localhost:8000/api/goals/${goalId}/checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch check-in nudge');
      }
      const data = await res.json();
      setNudges(prev => ({
        ...prev,
        [goalId]: { text: data.nudge_text, loading: false }
      }));
    } catch (err) {
      console.error(err);
      setNudges(prev => ({
        ...prev,
        [goalId]: { text: 'Failed to generate nudge. Please try again.', loading: false }
      }));
    }
  };

  useEffect(() => {
    const fetchGoals = async () => {
      if (!currentUser || !session) return;
      setLoading(true);
      try {
        const goalsRes = await fetch(`http://localhost:8000/api/goals?user_id=${currentUser.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const goalsData = await goalsRes.json();
        setActiveGoals(goalsData);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGoals();
  }, [currentUser]);

  const handleAddGoal = (goal: Goal) => {
    setActiveGoals(prev => [goal, ...prev]);
  };

  const startLogUpdate = (krId: string, currentProgress: number) => {
    setActiveUpdateKrId(krId);
    setUpdateText("");
    setAiEstimate(null);
    setProposedProgress(currentProgress);
  };

  const handleGetAiEstimate = async (krId: string) => {
    if (!updateText.trim()) return;
    setIsEstimating(true);
    setAiEstimate(null);
    try {
      const res = await fetch(`http://localhost:8000/api/key-results/${krId}/estimate-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ update_text: updateText })
      });
      if (!res.ok) throw new Error('Failed to estimate progress');
      const data = await res.json();
      setAiEstimate({
        estimated_progress_pct: data.estimated_progress_pct,
        reasoning: data.reasoning
      });
      setProposedProgress(data.estimated_progress_pct);
    } catch (err) {
      console.error(err);
      alert('Failed to get AI estimate. You can still set it manually.');
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSaveUpdate = async (krId: string) => {
    setIsSavingUpdate(true);
    try {
      const res = await fetch(`http://localhost:8000/api/key-results/${krId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          progress_pct: proposedProgress,
          note: updateText,
          reasoning: aiEstimate?.reasoning || undefined
        })
      });
      if (!res.ok) throw new Error('Failed to save update');
      const updatedKr = await res.json();
      
      setActiveGoals(prev => prev.map(goal => {
        const updatedKRs = goal.key_results.map(kr => 
          kr.id === krId ? { ...kr, progress_pct: updatedKr.progress_pct } : kr
        );
        return { ...goal, key_results: updatedKRs };
      }));
      
      setActiveUpdateKrId(null);
      setUpdateText("");
      setAiEstimate(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save progress update.');
    } finally {
      setIsSavingUpdate(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:8000/api/goals/${goalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete goal');
      }
      
      setActiveGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete the goal. Please try again.');
    }
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
        
        {loading || authLoading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/20 border border-zinc-800 rounded-xl">
            <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
            <p className="text-zinc-400">Loading goals...</p>
          </div>
        ) : activeGoals.length === 0 ? (
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
                    <div className="flex items-center gap-4">
                      {goal.ai_generated && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-purple-400 bg-purple-400/10 px-2 py-1 rounded border border-purple-400/20">
                          <Sparkles size={12} />
                          AI Suggested
                        </div>
                      )}
                      <button
                        onClick={() => handleGetNudge(goal.id)}
                        disabled={nudges[goal.id]?.loading}
                        className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 bg-purple-400/10 hover:bg-purple-400/20 border border-purple-400/20 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                        title="Get AI Check-in Nudge"
                      >
                        {nudges[goal.id]?.loading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        Get AI Check-in
                      </button>
                      <button 
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-zinc-600 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 space-y-5 bg-zinc-950">
                  {nudges[goal.id] && (
                    <div className="p-3.5 bg-purple-500/5 border-l-2 border-purple-500 rounded-r-lg flex items-start gap-3 relative animate-in slide-in-from-top duration-200">
                      <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs text-purple-200 pr-6 leading-relaxed">
                        {nudges[goal.id].loading ? (
                          <span className="flex items-center gap-1.5 text-zinc-500">
                            <Loader2 size={12} className="animate-spin" />
                            Consulting AI OKR coach...
                          </span>
                        ) : (
                          nudges[goal.id].text
                        )}
                      </div>
                      {!nudges[goal.id].loading && (
                        <button
                          onClick={() => {
                            setNudges(prev => {
                              const updated = { ...prev };
                              delete updated[goal.id];
                              return updated;
                            });
                          }}
                          className="absolute right-2 top-2 text-purple-400/50 hover:text-purple-300 transition-colors"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  )}
                  {goal.key_results.map((kr) => (
                    <div key={kr.id} className="space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-zinc-300">{kr.kr_text}</p>
                          {kr.suggested_metric && (
                            <p className="text-xs text-zinc-500 mt-1">Target: {kr.suggested_metric}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-500 w-12 text-right mt-0.5">
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
                      </div>

                      {activeUpdateKrId === kr.id ? (
                        <div className="mt-3 p-4 bg-zinc-900 border border-purple-500/20 rounded-lg space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                              What did you work on?
                            </label>
                            <textarea
                              rows={2}
                              value={updateText}
                              onChange={(e) => setUpdateText(e.target.value)}
                              placeholder="e.g. Completed initial research, setup repository boilerplates"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 placeholder-zinc-600 resize-none"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleGetAiEstimate(kr.id)}
                              disabled={!updateText.trim() || isEstimating}
                              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-md transition-colors"
                            >
                              {isEstimating ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" />
                                  Estimating...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={12} />
                                  Get AI Estimate
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveUpdateKrId(null)}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                          </div>

                          {aiEstimate && (
                            <div className="p-3 bg-purple-500/5 border-l-2 border-purple-500 rounded-r-lg space-y-2 animate-in slide-in-from-top-1 duration-200">
                              <div className="flex items-start gap-2">
                                <Sparkles size={14} className="text-purple-400 shrink-0 mt-0.5" />
                                <div className="flex-1 text-xs text-purple-200">
                                  <p className="font-semibold text-purple-300">
                                    AI Estimate: {aiEstimate.estimated_progress_pct}%
                                  </p>
                                  <p className="text-[11px] text-purple-400/80 italic mt-0.5 leading-relaxed">
                                    "{aiEstimate.reasoning}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Stepper/Adjustment for final check */}
                          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium text-zinc-400">Proposed Progress:</span>
                              <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded">
                                {proposedProgress}%
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={proposedProgress}
                                onChange={(e) => setProposedProgress(parseInt(e.target.value))}
                                className="flex-1 accent-purple-500 cursor-pointer"
                              />
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setProposedProgress(p => Math.max(0, p - 1))}
                                  className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 font-bold text-xs"
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setProposedProgress(p => Math.min(100, p + 1))}
                                  className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 font-bold text-xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <button
                              onClick={() => handleSaveUpdate(kr.id)}
                              disabled={isSavingUpdate}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                            >
                              {isSavingUpdate ? 'Saving...' : 'Confirm & Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => startLogUpdate(kr.id, kr.progress_pct)}
                            className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded-md transition-colors font-medium"
                          >
                            Log Update
                          </button>
                        </div>
                      )}
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
        userId={currentUser?.id || ''}
      />
    </div>
  );
}
