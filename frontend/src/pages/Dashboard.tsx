import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Target, Sparkles, Loader2, Trash2, Calendar, LayoutDashboard, Compass, Activity, CheckCircle2, Circle, AlertCircle, X, Check, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [expandedKRs, setExpandedKRs] = useState<Record<string, boolean>>({});
  const [activeUpdateKrId, setActiveUpdateKrId] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<{ estimated_progress_pct: number; reasoning: string } | null>(null);
  const [proposedProgress, setProposedProgress] = useState<number>(0);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nudges, setNudges] = useState<Record<string, { text: string; loading: boolean }>>({});
  const context = useOutletContext<{ activeTab: 'overview' | 'goals' | 'checkins'; setActiveTab: (t: 'overview' | 'goals' | 'checkins') => void } | null>();
  const activeTab = context?.activeTab ?? 'overview';
  const setActiveTab = context?.setActiveTab ?? (() => {});
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
        if (!res.ok) {
          console.error(`Failed to fetch goals: ${res.status} ${res.statusText}`);
          return;
        }
        const data = await res.json();
        setActiveGoals(Array.isArray(data) ? data : []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchGoals();
  }, [currentUser, session]);

  /* ─── stats ────────────────────────────────────────────────── */
  const averageProgress = (() => {
    let total = 0, count = 0;
    activeGoals.forEach(g => g.key_results.forEach(kr => { total += kr.progress_pct; count++; }));
    return count > 0 ? total / count : 0;
  })();
  const alignmentScore = activeGoals.length > 0
    ? Math.round((activeGoals.filter(g => g.pillar_id !== null).length / activeGoals.length) * 100)
    : 0;

  const daysRemaining = (() => {
    const endOfCycle = new Date('2026-09-30T23:59:59');
    const diffTime = Math.max(0, endOfCycle.getTime() - new Date().getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  })();

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

      {/* Tab bar has been moved to left sidebar layout */}

      {/* Content */}
      {(loading || authLoading) ? (
        <div className="grid gap-6 md:grid-cols-2">
          <SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="space-y-8 animate-stagger-1">

          {/* ── Overview tab ─────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-stagger-1">
              {/* Stat cards */}
              <div className="grid gap-6 sm:grid-cols-3">
                <div className={`card ${topBarClass(averageProgress)} p-6 flex items-center justify-between relative overflow-hidden`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="icon-badge icon-badge-orange" style={{ width: 32, height: 32, borderRadius: 8 }}>
                        <Target size={16} />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6558' }}>Active Goals</p>
                    </div>
                    <p className="text-4xl font-extrabold font-mono mt-2" style={{ color: '#1A1A1A' }}>
                      <CountUp value={activeGoals.length} />
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B6558' }}>Avg. <span className="font-mono font-bold">{Math.round(averageProgress)}%</span> complete</p>
                  </div>
                  <ProgressRing progress={averageProgress} size={64} strokeWidth={6} />
                </div>

                <div className={`card ${topBarClass(alignmentScore)} p-6 flex items-center justify-between relative overflow-hidden`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="icon-badge icon-badge-green" style={{ width: 32, height: 32, borderRadius: 8 }}>
                        <Compass size={16} />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6558' }}>Alignment Score</p>
                    </div>
                    <p className="text-4xl font-extrabold font-mono mt-2" style={{ color: '#1A1A1A' }}>
                      <CountUp value={alignmentScore} />%
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B6558' }}>Goals linked to company pillars</p>
                  </div>
                  <ProgressRing progress={alignmentScore} size={64} strokeWidth={6} />
                </div>

                <div className="card card-top-blue p-6 flex items-center justify-between relative overflow-hidden">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="icon-badge icon-badge-blue" style={{ width: 32, height: 32, borderRadius: 8 }}>
                        <Calendar size={16} />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6558' }}>Days Remaining</p>
                    </div>
                    <p className="text-4xl font-extrabold font-mono mt-2" style={{ color: '#1A1A1A' }}>
                      <CountUp value={daysRemaining} />
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#6B6558' }}>Cycle: <span className="font-bold">Q3-2026</span></p>
                  </div>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#EFF6FF] border border-[#BFDBFE]" style={{ color: '#2563EB' }}>
                    <Calendar size={24} />
                  </div>
                </div>
              </div>

              {/* Snapshot */}
              <div className="space-y-4">
                <h2 style={{ fontFamily: 'Clash Display, Inter, sans-serif', fontWeight: 700, fontSize: 22, color: '#1A1A1A' }}>
                  Objectives Snapshot
                </h2>
                {activeGoals.length === 0 ? (
                  <div className="rounded-2xl p-12 text-center" style={{ border: '2px dashed #E8E2D6' }}>
                    <h3 className="font-semibold" style={{ color: '#1A1A1A' }}>No active goals yet</h3>
                    <p className="text-sm mt-1" style={{ color: '#6B6558' }}>Switch to the "My Goals" tab to create your first objective.</p>
                  </div>
                ) : (
                  <div className="card overflow-hidden" style={{ border: '1px solid #E8E2D6', background: '#FFFFFF', borderRadius: 16 }}>
                    <div className="divide-y divide-[#E8E2D6]">
                      {activeGoals.map(goal => {
                        const krs = goal.key_results || [];
                        const gPct = krs.length > 0 ? krs.reduce((s, k) => s + k.progress_pct, 0) / krs.length : 0;
                        return (
                          <div key={goal.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-[#FAFAF8] transition-colors">
                            {/* Left Side */}
                            <div className="flex-grow space-y-2">
                              <div className="flex items-start gap-2.5">
                                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${gPct >= 70 ? 'bg-[#27AE60]' : gPct >= 30 ? 'bg-[#F2994A]' : 'bg-[#EB5757]'}`} />
                                <h4 className="font-bold text-sm leading-snug" style={{ color: '#1A1A1A' }}>
                                  {goal.objective_text}
                                </h4>
                              </div>
                              <div className="flex items-center flex-wrap gap-2 text-xs">
                                <span className={gPct >= 70 ? 'pill-green' : gPct >= 30 ? 'pill-orange' : 'pill-neutral'}>
                                  {goal.status}
                                </span>
                                <span className="text-xs font-mono" style={{ color: '#6B6558' }}>{goal.cycle}</span>
                                {goal.pillar_title && (
                                  <span className="pill-blue">{goal.pillar_title}</span>
                                )}
                              </div>
                            </div>

                            {/* Right Side */}
                            <div className="w-full md:w-80 flex-shrink-0 space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6B6558' }}>Key Results Progress</p>
                              {krs.length === 0 ? (
                                <p className="text-xs italic" style={{ color: '#6B6558' }}>No Key Results defined</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {krs.map(kr => {
                                    const isCompleted = kr.progress_pct >= 100;
                                    const isAtRisk = kr.progress_pct < 30;
                                    return (
                                      <div key={kr.id} className="flex items-center gap-2 text-xs">
                                        {isCompleted ? (
                                          <CheckCircle2 size={12} className="text-[#27AE60] flex-shrink-0" />
                                        ) : isAtRisk ? (
                                          <AlertCircle size={12} className="text-[#EB5757] flex-shrink-0" />
                                        ) : (
                                          <Circle size={12} className="text-[#F2994A] flex-shrink-0" />
                                        )}
                                        <span className="flex-1 truncate" style={{ color: '#1A1A1A' }} title={kr.kr_text}>
                                          {kr.kr_text}
                                        </span>
                                        <span className="font-mono font-bold w-8 text-right flex-shrink-0" style={{ color: '#6B6558' }}>
                                          {kr.progress_pct}%
                                        </span>
                                        <div className="w-16 h-1.5 rounded-full bg-[#F0EDE6] overflow-hidden flex-shrink-0">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${kr.progress_pct >= 70 ? 'bg-[#27AE60]' : kr.progress_pct >= 30 ? 'bg-[#F2994A]' : 'bg-[#EB5757]'}`}
                                            style={{ width: `${kr.progress_pct}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                  <button onClick={() => setIsModalOpen(true)} className="gradient-button px-5 py-2.5 rounded-xl text-sm font-bold mt-6 cursor-pointer flex items-center gap-1.5 justify-center">
                    <Plus size={14} /> Create a Goal
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
                          {goal.key_results.map(kr => {
                            const isExpanded = !!expandedKRs[kr.id];
                            return (
                              <div key={kr.id} className="space-y-3">
                                <div 
                                  className="card p-5 flex items-center justify-between gap-4 cursor-pointer"
                                  onClick={() => setExpandedKRs(p => ({ ...p, [kr.id]: !p[kr.id] }))}
                                >
                                  <div className="flex-1 space-y-1">
                                    <p className="text-sm font-semibold leading-snug" style={{ color: '#1A1A1A' }}>{kr.kr_text}</p>
                                    {kr.suggested_metric && <p className="text-xs" style={{ color: '#6B6558' }}>Target: {kr.suggested_metric}</p>}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <ProgressRing progress={kr.progress_pct} size={40} strokeWidth={4} showText={false} />
                                    <span className="text-xs font-bold font-mono w-10 text-right" style={{ color: '#1A1A1A' }}>{kr.progress_pct}%</span>
                                    {isExpanded ? <ChevronUp size={16} className="text-[#6B6558]" /> : <ChevronDown size={16} className="text-[#6B6558]" />}
                                  </div>
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
                                      <button onClick={() => setActiveUpdateKrId(null)} className="px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5" style={{ background: '#F0EDE6', color: '#1A1A1A' }}>
                                        <X size={12} /> Cancel
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
                                        className="gradient-button text-xs font-bold px-5 py-2.5 rounded-lg cursor-pointer flex items-center gap-1.5">
                                        {isSavingUpdate ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                        Confirm & Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex justify-end">
                                      <button onClick={() => { setActiveUpdateKrId(kr.id); setUpdateText(''); setAiEstimate(null); setProposedProgress(kr.progress_pct); }}
                                        className="text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                                        style={{ background: '#FFFFFF', border: '1px solid #E8E2D6', color: '#6B6558' }}
                                        onMouseOver={e => e.currentTarget.style.borderColor = '#F2994A'}
                                        onMouseOut={e => e.currentTarget.style.borderColor = '#E8E2D6'}
                                      >
                                        <Activity size={12} /> Log Update
                                      </button>
                                    </div>

                                    {isExpanded && (
                                      <div className="p-5 rounded-xl bg-white border border-[#E8E2D6] space-y-4">
                                        <p className="text-xs font-bold uppercase tracking-wider font-mono text-[#6B6558]">Activity Timeline</p>
                                        {!kr.progress_logs?.length ? (
                                          <p className="text-xs italic text-[#6B6558]">No activity logged for this key result.</p>
                                        ) : (
                                          <div className="relative pl-6 space-y-5 border-l-2 border-[#E8E2D6]">
                                            {kr.progress_logs.map(log => (
                                              <div key={log.id} className="relative">
                                                <div className="absolute -left-[29px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#3B4B6B] border-2 border-white" />
                                                <div className="text-xs space-y-1.5 text-left">
                                                  <div className="flex flex-wrap items-center gap-2 text-[#6B6558]">
                                                    <span className="font-semibold font-mono">
                                                      {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span>·</span>
                                                    <span>by <span className="font-bold text-[#1A1A1A]">{log.users?.full_name || 'System'}</span></span>
                                                    <span>·</span>
                                                    <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-[#EEF1F7] text-[#3B4B6B] border border-[#D4DAE6]">
                                                      {log.previous_value}% → {log.new_value}%
                                                    </span>
                                                  </div>
                                                  {log.note && (
                                                    <p className="italic text-xs leading-relaxed pl-3 max-w-lg py-2 border-l-2 border-[#10B981] text-[#1A1A1A] bg-[#ECFDF5] rounded-r-lg">
                                                      "{log.note}"
                                                    </p>
                                                  )}
                                                  {log.reasoning && (
                                                    <div className="flex items-start gap-1.5 text-xs px-3 py-2 rounded-xl max-w-lg leading-relaxed bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C]">
                                                      <Sparkles size={11} className="shrink-0 mt-1" />
                                                      <span><span className="font-semibold">AI Interpretation:</span> {log.reasoning}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                AI Coach Check-ins
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
