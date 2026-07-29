import React, { useState, useEffect } from 'react';
import { Plus, Target, Sparkles, Loader2, Trash2, Calendar } from 'lucide-react';
import type { Goal, KeyResult } from '../types';
import GoalModal from '../components/GoalModal';
import { useAuth } from '../context/AuthContext';
import ProgressRing from '../components/ProgressRing';
import { SkeletonCard } from '../components/Skeleton';
import useCountUp from '../hooks/useCountUp';

/* ─── helpers ─────────────────────────────────────────────── */
const topBarClass = (pct: number) =>
  pct >= 70 ? 'card-top-green' : pct >= 30 ? 'card-top-orange' : 'card-top-red';

function CountUp({ value }: { value: number }) {
  const count = useCountUp(value);
  return <>{count}</>;
}

/* ─── Component ───────────────────────────────────────────── */
export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [activeUpdateKrId, setActiveUpdateKrId] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<{ estimated_progress_pct: number; reasoning: string } | null>(null);
  const [proposedProgress, setProposedProgress] = useState<number>(0);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nudges, setNudges] = useState<Record<string, { text: string; loading: boolean }>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'checkins'>('overview');
  const [generatedNudges, setGeneratedNudges] = useState<Array<{ id: string; objective: string; text: string; date: string }>>([]);
  const { currentUser, session, loading: authLoading } = useAuth();

  /* ─── data fetch ──────────────────────────────────────────── */
  useEffect(() => {
    const fetchGoals = async () => {
      if (!currentUser || !session) return;
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/goals?user_id=${currentUser.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        setActiveGoals(await res.json());
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchGoals();
  }, [currentUser]);

  /* ─── stats ────────────────────────────────────────────────── */
  const averageProgress = (() => {
    let total = 0, count = 0;
    activeGoals.forEach(g => g.key_results.forEach(kr => { total += kr.progress_pct; count++; }));
    return count > 0 ? total / count : 0;
  })();
  const alignmentScore = activeGoals.length > 0
    ? Math.round((activeGoals.filter(g => g.pillar_id !== null).length / activeGoals.length) * 100)
    : 0;

  /* ─── handlers ────────────────────────────────────────────── */
  const handleAddGoal = (goal: Goal) => setActiveGoals(prev => [goal, ...prev]);

  const handleGetNudge = async (goalId: string) => {
    setNudges(prev => ({ ...prev, [goalId]: { text: '', loading: true } }));
    try {
      const res = await fetch(`http://localhost:8000/api/goals/${goalId}/checkin`, {
        method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNudges(prev => ({ ...prev, [goalId]: { text: data.nudge_text, loading: false } }));
      setGeneratedNudges(prev => [{
        id: Math.random().toString(),
        objective: activeGoals.find(g => g.id === goalId)?.objective_text || 'Objective',
        text: data.nudge_text,
        date: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      }, ...prev]);
    } catch {
      setNudges(prev => ({ ...prev, [goalId]: { text: 'Failed to generate nudge.', loading: false } }));
    }
  };

  const handleGetAiEstimate = async (krId: string) => {
    if (!updateText.trim()) return;
    setIsEstimating(true); setAiEstimate(null);
    try {
      const res = await fetch(`http://localhost:8000/api/key-results/${krId}/estimate-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ update_text: updateText })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAiEstimate(data);
      setProposedProgress(data.estimated_progress_pct);
    } catch { alert('Failed to get AI estimate. You can still adjust manually.'); }
    finally { setIsEstimating(false); }
  };

  const handleSaveUpdate = async (krId: string) => {
    setIsSavingUpdate(true);
    try {
      const res = await fetch(`http://localhost:8000/api/key-results/${krId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ progress_pct: proposedProgress, note: updateText, reasoning: aiEstimate?.reasoning })
      });
      if (!res.ok) throw new Error();
      const updatedKr = await res.json();
      setActiveGoals(prev => prev.map(goal => ({
        ...goal,
        key_results: goal.key_results.map(kr => kr.id === krId ? { ...kr, progress_pct: updatedKr.progress_pct } : kr)
      })));
      setActiveUpdateKrId(null); setUpdateText(''); setAiEstimate(null);
    } catch { alert('Failed to save progress update.'); }
    finally { setIsSavingUpdate(false); }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm('Delete this goal? This cannot be undone.')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/goals/${goalId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error();
      setActiveGoals(prev => prev.filter(g => g.id !== goalId));
    } catch { alert('Failed to delete the goal.'); }
  };

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <div className="space-y-8 font-sans">
      {/* Page header */}
      <div className="flex justify-between items-center flex-wrap gap-5">
        <div>
          <h1 style={{ fontSize: 40 }}>
            My <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="mt-1 text-base" style={{ color: '#6B6558' }}>Manage your OKRs and track your progress.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="gradient-button flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer"
        >
          <Plus size={18} /> Create New Goal
        </button>
      </div>

      {/* Tab bar */}
      <div className="relative flex rounded-xl p-1 max-w-sm" style={{ background: '#FFFFFF', border: '1px solid #E8E2D6' }}>
        {(['overview', 'goals', 'checkins'] as const).map((tab, i) => {
          const label = tab === 'overview' ? 'Overview' : tab === 'goals' ? 'My Goals' : 'Check-ins';
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all text-center cursor-pointer rounded-lg z-10 relative"
              style={active ? { color: '#FFFFFF' } : { color: '#6B6558' }}
            >
              {label}
            </button>
          );
        })}
        <div
          className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out"
          style={{
            background: 'linear-gradient(135deg, #F2994A, #B5651D)',
            width: 'calc(33.33% - 2px)',
            left: activeTab === 'overview' ? '4px' : activeTab === 'goals' ? 'calc(33.33% + 2px)' : 'calc(66.66% + 0px)',
          }}
        />
      </div>

      {/* Content */}
      {(loading || authLoading) ? (
        <div className="grid gap-6 md:grid-cols-2">
          <SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="space-y-8 animate-stagger-1">

          {/* ── Overview tab ─────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stat cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className={`card ${topBarClass(averageProgress)} p-6 flex items-center justify-between`}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6558' }}>Active Goals</p>
                    <p className="text-4xl font-extrabold font-mono mt-2" style={{ color: '#1A1A1A' }}>
                      <CountUp value={activeGoals.length} />
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B6558' }}>Avg. <span className="font-mono font-bold">{Math.round(averageProgress)}%</span> complete</p>
                  </div>
                  <ProgressRing progress={averageProgress} size={64} strokeWidth={6} />
                </div>

                <div className={`card ${topBarClass(alignmentScore)} p-6 flex items-center justify-between`}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6558' }}>Alignment Score</p>
                    <p className="text-4xl font-extrabold font-mono mt-2" style={{ color: '#1A1A1A' }}>
                      <CountUp value={alignmentScore} />%
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B6558' }}>Goals linked to company pillars</p>
                  </div>
                  <ProgressRing progress={alignmentScore} size={64} strokeWidth={6} />
                </div>
              </div>

              {/* Snapshot */}
              <div className="space-y-4">
                <h2 style={{ fontFamily: 'Clash Display, Inter, sans-serif', fontWeight: 700, fontSize: 22, color: '#1A1A1A' }}>
                  Objectives <span className="gradient-text">Snapshot</span>
                </h2>
                {activeGoals.length === 0 ? (
                  <div className="rounded-2xl p-12 text-center" style={{ border: '2px dashed #E8E2D6' }}>
                    <h3 className="font-semibold" style={{ color: '#1A1A1A' }}>No active goals yet</h3>
                    <p className="text-sm mt-1" style={{ color: '#6B6558' }}>Switch to the "My Goals" tab to create your first objective.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {activeGoals.map(goal => {
                      const krs = goal.key_results || [];
                      const gPct = krs.length > 0 ? krs.reduce((s, k) => s + k.progress_pct, 0) / krs.length : 0;
                      return (
                        <div key={goal.id} className={`card ${topBarClass(gPct)} p-5 flex items-center justify-between gap-4`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-snug truncate" style={{ color: '#1A1A1A' }}>{goal.objective_text}</p>
                            <p className="text-xs font-mono mt-0.5" style={{ color: '#6B6558' }}>{goal.cycle}</p>
                          </div>
                          <ProgressRing progress={gPct} size={48} strokeWidth={4.5} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── My Goals tab ─────────────────────────────── */}
          {activeTab === 'goals' && (
            <div className="space-y-6 animate-stagger-1">
              {activeGoals.length === 0 ? (
                <div className="rounded-2xl p-14 flex flex-col items-center text-center" style={{ border: '2px dashed #E8E2D6' }}>
                  <div className="icon-badge icon-badge-orange w-14 h-14 rounded-full mb-4">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>No active goals yet</h3>
                  <p className="text-sm mt-1" style={{ color: '#6B6558', maxWidth: 300 }}>Let's create your first objective to start tracking progress.</p>
                  <button onClick={() => setIsModalOpen(true)} className="gradient-button px-5 py-2.5 rounded-xl text-sm font-bold mt-6 cursor-pointer">
                    Create a Goal
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeGoals.map(goal => {
                    const krs = goal.key_results || [];
                    const gPct = krs.length > 0 ? krs.reduce((s, k) => s + k.progress_pct, 0) / krs.length : 0;
                    return (
                      <div key={goal.id} className={`card ${topBarClass(gPct)} overflow-hidden`}>
                        {/* Goal header */}
                        <div className="p-6" style={{ borderBottom: '1px solid #E8E2D6' }}>
                          <div className="flex items-start justify-between gap-6 flex-wrap">
                            <div className="space-y-2.5">
                              <h3 className="text-lg font-bold leading-tight" style={{ color: '#1A1A1A' }}>{goal.objective_text}</h3>
                              <div className="flex items-center flex-wrap gap-2">
                                <span className={gPct >= 70 ? 'pill-green' : gPct >= 30 ? 'pill-orange' : 'pill-neutral'}>
                                  {goal.status}
                                </span>
                                <span className="text-xs font-mono" style={{ color: '#6B6558' }}>{goal.cycle}</span>
                                {goal.pillar_title && (
                                  <span className="pill-blue">{goal.pillar_title}</span>
                                )}
                                {goal.ai_generated && (
                                  <span className="pill-blue" style={{ gap: 4 }}>
                                    <Sparkles size={10} style={{ display: 'inline', marginRight: 2 }} />AI Suggested
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleGetNudge(goal.id)}
                                disabled={nudges[goal.id]?.loading}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer transition-all"
                                style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
                              >
                                {nudges[goal.id]?.loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                AI Check-in
                              </button>
                              <button
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="p-2 rounded-lg cursor-pointer transition-colors"
                                style={{ color: '#6B6558' }}
                                onMouseOver={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
                                onMouseOut={e => { e.currentTarget.style.color = '#6B6558'; e.currentTarget.style.background = 'transparent'; }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Goal body */}
                        <div className="p-6 space-y-4" style={{ background: '#FAFAF8' }}>
                          {/* Nudge panel */}
                          {nudges[goal.id] && (
                            <div className="p-4 rounded-xl flex items-start gap-3 relative" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                              <Sparkles size={15} style={{ color: '#F2994A', flexShrink: 0, marginTop: 1 }} />
                              <div className="flex-1 text-xs leading-relaxed" style={{ color: '#1A1A1A' }}>
                                {nudges[goal.id].loading
                                  ? <span style={{ color: '#6B6558' }} className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" />Consulting AI OKR coach...</span>
                                  : nudges[goal.id].text}
                              </div>
                              {!nudges[goal.id].loading && (
                                <button
                                  onClick={() => setNudges(prev => { const n = { ...prev }; delete n[goal.id]; return n; })}
                                  className="cursor-pointer text-base leading-none" style={{ color: '#6B6558' }}
                                >×</button>
                              )}
                            </div>
                          )}

                          {/* Key results */}
                          {goal.key_results.map(kr => (
                            <div key={kr.id} className="space-y-3">
                              <div className="card p-5 flex items-center justify-between gap-4">
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm font-semibold leading-snug" style={{ color: '#1A1A1A' }}>{kr.kr_text}</p>
                                  {kr.suggested_metric && <p className="text-xs" style={{ color: '#6B6558' }}>Target: {kr.suggested_metric}</p>}
                                </div>
                                <ProgressRing progress={kr.progress_pct} size={48} strokeWidth={4.5} />
                              </div>

                              {activeUpdateKrId === kr.id ? (
                                <div className="p-5 rounded-xl space-y-4" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                                  <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>What did you work on?</label>
                                    <textarea
                                      rows={2} value={updateText} onChange={e => setUpdateText(e.target.value)}
                                      placeholder="e.g. Completed initial research, set up repository boilerplates"
                                      className="w-full px-4 py-3 text-xs rounded-xl resize-none"
                                      style={{ background: '#FFFFFF' }}
                                    />
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleGetAiEstimate(kr.id)}
                                      disabled={!updateText.trim() || isEstimating}
                                      className="gradient-button flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer"
                                    >
                                      {isEstimating ? <><Loader2 size={12} className="animate-spin" />Estimating...</> : <><Sparkles size={12} />Get AI Estimate</>}
                                    </button>
                                    <button onClick={() => setActiveUpdateKrId(null)} className="px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer" style={{ background: '#F0EDE6', color: '#1A1A1A' }}>
                                      Cancel
                                    </button>
                                  </div>

                                  {aiEstimate && (
                                    <div className="p-4 rounded-xl space-y-1" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                                      <div className="flex items-center gap-2">
                                        <Sparkles size={13} style={{ color: '#10B981' }} />
                                        <p className="text-xs font-bold" style={{ color: '#059669' }}>AI Estimate: {aiEstimate.estimated_progress_pct}%</p>
                                      </div>
                                      <p className="text-xs italic pl-5" style={{ color: '#6B6558' }}>"{aiEstimate.reasoning}"</p>
                                    </div>
                                  )}

                                  <div className="space-y-2 pt-3" style={{ borderTop: '1px solid #E8E2D6' }}>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-semibold" style={{ color: '#6B6558' }}>Proposed Progress:</span>
                                      <span className="font-bold font-mono px-2.5 py-0.5 rounded" style={{ background: '#F0EDE6', color: '#1A1A1A' }}>{proposedProgress}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <input type="range" min="0" max="100" value={proposedProgress}
                                        onChange={e => setProposedProgress(parseInt(e.target.value))}
                                        className="flex-1 cursor-pointer" style={{ accentColor: '#F2994A' }}
                                      />
                                      <div className="flex gap-1.5">
                                        {['-', '+'].map((op, idx) => (
                                          <button key={op} onClick={() => setProposedProgress(p => Math.max(0, Math.min(100, idx === 0 ? p - 1 : p + 1)))}
                                            className="w-7 h-7 rounded font-bold text-xs cursor-pointer"
                                            style={{ background: '#F0EDE6', color: '#1A1A1A' }}>{op}</button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex justify-end">
                                    <button onClick={() => handleSaveUpdate(kr.id)} disabled={isSavingUpdate}
                                      className="gradient-button text-xs font-bold px-5 py-2.5 rounded-lg cursor-pointer">
                                      {isSavingUpdate ? 'Saving...' : 'Confirm & Save'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-end">
                                  <button onClick={() => { setActiveUpdateKrId(kr.id); setUpdateText(''); setAiEstimate(null); setProposedProgress(kr.progress_pct); }}
                                    className="text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                                    style={{ background: '#FFFFFF', border: '1px solid #E8E2D6', color: '#6B6558' }}
                                    onMouseOver={e => e.currentTarget.style.borderColor = '#F2994A'}
                                    onMouseOut={e => e.currentTarget.style.borderColor = '#E8E2D6'}
                                  >
                                    Log Update
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Check-ins tab ─────────────────────────────── */}
          {activeTab === 'checkins' && (
            <div className="space-y-5 animate-stagger-1">
              <h2 style={{ fontFamily: 'Clash Display, Inter, sans-serif', fontWeight: 700, fontSize: 22, color: '#1A1A1A' }}>
                AI Coach <span className="gradient-text">Check-ins</span>
              </h2>
              {generatedNudges.length === 0 ? (
                <div className="rounded-2xl p-14 flex flex-col items-center text-center" style={{ border: '2px dashed #E8E2D6' }}>
                  <div className="icon-badge icon-badge-orange w-14 h-14 rounded-full mb-4"><Sparkles size={24} /></div>
                  <h3 className="font-bold" style={{ color: '#1A1A1A' }}>No check-in nudges generated</h3>
                  <p className="text-sm mt-1 max-w-sm" style={{ color: '#6B6558' }}>Go to "My Goals" and request an AI check-in nudge for an active objective.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedNudges.map(n => (
                    <div key={n.id} className="card card-top-orange p-5 space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="pill-orange"><Sparkles size={10} style={{ display: 'inline', marginRight: 2 }} />AI Nudge</span>
                        <span className="text-xs font-mono flex items-center gap-1" style={{ color: '#6B6558' }}>
                          <Calendar size={12} />{n.date}
                        </span>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: '#6B6558' }}>"{n.objective}"</p>
                      <p className="text-sm italic leading-relaxed pl-4" style={{ borderLeft: '3px solid #F2994A', color: '#1A1A1A' }}>"{n.text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddGoal}
        userId={currentUser?.id || ''}
      />
    </div>
  );
}
