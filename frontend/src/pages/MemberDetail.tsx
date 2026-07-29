import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, AlertCircle, Loader2, ChevronDown, ChevronUp, Clock, Calendar, Sparkles } from 'lucide-react';
import type { Goal, KeyResult } from '../types';
import ProgressRing from '../components/ProgressRing';

interface ProgressLog {
  id: string;
  key_result_id: string;
  previous_value: number;
  new_value: number;
  note: string | null;
  created_at: string;
  reasoning?: string | null;
  users?: { full_name: string } | null;
}

interface MemberDetailData {
  user: { id: string; full_name: string; role: string; job_title: string; department: string };
  goals: (Goal & { key_results: (KeyResult & { progress_logs: ProgressLog[] })[] })[];
}

const topBarClass = (pct: number) =>
  pct >= 70 ? 'card-top-green' : pct >= 30 ? 'card-top-orange' : 'card-top-red';

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
  ' at ' + new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export default function MemberDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser, session } = useAuth();

  const [data, setData] = useState<MemberDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKRs, setExpandedKRs] = useState<Record<string, boolean>>({});
  const [nudges, setNudges] = useState<Record<string, { text: string; loading: boolean }>>({});

  const handleGetNudge = async (goalId: string) => {
    setNudges(prev => ({ ...prev, [goalId]: { text: '', loading: true } }));
    try {
      const res = await fetch(`http://localhost:8000/api/goals/${goalId}/checkin`, {
        method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setNudges(prev => ({ ...prev, [goalId]: { text: d.nudge_text, loading: false } }));
    } catch {
      setNudges(prev => ({ ...prev, [goalId]: { text: 'Failed to generate nudge.', loading: false } }));
    }
  };

  useEffect(() => {
    const fetchMemberActivity = async () => {
      if (!userId || !session) return;
      try {
        const res = await fetch(`http://localhost:8000/api/users/${userId}/activity`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!res.ok) throw new Error(res.status === 403
          ? "Access restricted — you don't have permission to view this user's activity."
          : 'Failed to fetch employee details.');
        setData(await res.json());
      } catch (err: any) { setError(err.message || 'An error occurred.'); }
      finally { setLoading(false); }
    };

    if (currentUser?.role !== 'employee') fetchMemberActivity();
    else setLoading(false);
  }, [userId, currentUser, session]);

  if (currentUser?.role === 'employee') return (
    <div className="card card-top-red flex flex-col items-center justify-center p-14 mt-8 text-center">
      <AlertCircle size={40} style={{ color: '#EF4444', marginBottom: 12 }} />
      <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Access Restricted</h2>
      <p className="text-sm mt-1" style={{ color: '#6B6558' }}>This page is only available to managers and admins.</p>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-14 mt-8">
      <Loader2 size={32} style={{ color: '#F2994A' }} className="animate-spin mb-4" />
      <p className="text-sm" style={{ color: '#6B6558' }}>Loading activity timeline...</p>
    </div>
  );

  if (error || !data) return (
    <div className="card card-top-red flex flex-col items-center justify-center p-14 mt-8 text-center">
      <AlertCircle size={40} style={{ color: '#EF4444', marginBottom: 12 }} />
      <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Error</h2>
      <p className="text-sm mt-1" style={{ color: '#EF4444' }}>{error || 'Failed to load data.'}</p>
      <Link to="/team" className="gradient-button flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold mt-6">
        <ArrowLeft size={16} /> Back to Team
      </Link>
    </div>
  );

  const allKRs = data.goals.flatMap(g => g.key_results);
  const avgPct = allKRs.length > 0 ? allKRs.reduce((s, k) => s + k.progress_pct, 0) / allKRs.length : 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans animate-stagger-1">
      {/* Back + Header */}
      <div className="space-y-4 animate-stagger-2">
        <Link to="/team" className="inline-flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: '#6B6558' }}
          onMouseOver={e => e.currentTarget.style.color = '#B5651D'}
          onMouseOut={e => e.currentTarget.style.color = '#6B6558'}
        >
          <ArrowLeft size={16} /> Back to Team
        </Link>

        <div className={`card ${topBarClass(avgPct)} p-6`}>
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <h1 style={{ fontSize: 36 }}>{data.user.full_name}</h1>
              <p className="mt-1 text-base" style={{ color: '#6B6558' }}>{data.user.job_title} · {data.user.department} Department</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="gradient-badge px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider font-mono">{data.user.role}</span>
              <ProgressRing progress={avgPct} size={56} strokeWidth={5} />
            </div>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="space-y-5">
        <h2 className="flex items-center gap-2 pb-3 text-xl font-bold" style={{ color: '#1A1A1A', borderBottom: '1px solid #E8E2D6', fontFamily: 'Clash Display, Inter, sans-serif' }}>
          <Clock size={18} style={{ color: '#6B6558' }} />
          Active Goals &amp; <span className="gradient-text">KR History</span>
        </h2>

        {data.goals.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ border: '2px dashed #E8E2D6' }}>
            <p className="text-sm" style={{ color: '#6B6558' }}>No goals have been logged for this employee yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.goals.map(goal => {
              const gKRs = goal.key_results || [];
              const gPct = gKRs.length > 0 ? gKRs.reduce((s, k) => s + k.progress_pct, 0) / gKRs.length : 0;
              return (
                <div key={goal.id} className={`card ${topBarClass(gPct)} overflow-hidden`}>
                  {/* Goal header */}
                  <div className="p-6" style={{ borderBottom: '1px solid #E8E2D6' }}>
                    <div className="flex items-start justify-between gap-5 flex-wrap">
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold leading-tight" style={{ color: '#1A1A1A' }}>{goal.objective_text}</h3>
                        <div className="flex gap-2">
                          <span className={gPct >= 70 ? 'pill-green' : gPct >= 30 ? 'pill-orange' : 'pill-neutral'}>{goal.status}</span>
                          <span className="text-xs font-mono self-center" style={{ color: '#6B6558' }}>{goal.cycle}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleGetNudge(goal.id)}
                        disabled={nudges[goal.id]?.loading}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer transition-all shrink-0"
                        style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
                      >
                        {nudges[goal.id]?.loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        AI Check-in
                      </button>
                    </div>
                  </div>

                  {/* KRs */}
                  <div className="p-6 space-y-4" style={{ background: '#FAFAF8' }}>
                    {nudges[goal.id] && (
                      <div className="p-4 rounded-xl flex items-start gap-3 relative" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                        <Sparkles size={15} style={{ color: '#F2994A', flexShrink: 0 }} />
                        <div className="flex-1 text-xs leading-relaxed" style={{ color: '#1A1A1A' }}>
                          {nudges[goal.id].loading
                            ? <span className="flex items-center gap-1.5" style={{ color: '#6B6558' }}><Loader2 size={12} className="animate-spin" />Consulting AI OKR coach...</span>
                            : nudges[goal.id].text}
                        </div>
                        {!nudges[goal.id].loading && (
                          <button onClick={() => setNudges(prev => { const n = { ...prev }; delete n[goal.id]; return n; })} className="cursor-pointer text-base" style={{ color: '#6B6558' }}>×</button>
                        )}
                      </div>
                    )}

                    {gKRs.map(kr => {
                      const isExpanded = !!expandedKRs[kr.id];
                      return (
                        <div key={kr.id} className="card p-5 space-y-3">
                          <div onClick={() => setExpandedKRs(p => ({ ...p, [kr.id]: !p[kr.id] }))}
                            className="flex justify-between items-center gap-4 cursor-pointer py-1 rounded-lg">
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-semibold leading-snug" style={{ color: '#1A1A1A' }}>{kr.kr_text}</p>
                              {kr.suggested_metric && <p className="text-xs" style={{ color: '#6B6558' }}>Target: {kr.suggested_metric}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <ProgressRing progress={kr.progress_pct} size={40} strokeWidth={4} showText={false} />
                              <span className="text-xs font-bold font-mono w-10 text-right" style={{ color: '#1A1A1A' }}>{kr.progress_pct}%</span>
                              {isExpanded ? <ChevronUp size={16} style={{ color: '#6B6558' }} /> : <ChevronDown size={16} style={{ color: '#6B6558' }} />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="pt-4 space-y-4" style={{ borderTop: '1px solid #E8E2D6' }}>
                              <p className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: '#6B6558' }}>Activity Timeline</p>
                              {!kr.progress_logs?.length ? (
                                <p className="text-xs italic" style={{ color: '#6B6558' }}>No activity logged for this key result.</p>
                              ) : (
                                <div className="relative pl-6 space-y-5" style={{ borderLeft: '2px solid #E8E2D6' }}>
                                  {kr.progress_logs.map(log => (
                                    <div key={log.id} className="relative">
                                      <div className="absolute -left-[29px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: '#F2994A', border: '2px solid #FFFFFF' }} />
                                      <div className="text-xs space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2" style={{ color: '#6B6558' }}>
                                          <span className="flex items-center gap-1 font-semibold font-mono">
                                            <Calendar size={11} />{formatDate(log.created_at)}
                                          </span>
                                          <span>·</span>
                                          <span>by <span className="font-bold" style={{ color: '#1A1A1A' }}>{log.users?.full_name || 'System'}</span></span>
                                          <span>·</span>
                                          <span className="font-mono font-bold px-2 py-0.5 rounded-md" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                                            {log.previous_value}% → {log.new_value}%
                                          </span>
                                        </div>
                                        {log.note && (
                                          <p className="italic text-xs leading-relaxed pl-3 max-w-lg py-2" style={{ borderLeft: '2px solid #10B981', color: '#1A1A1A', background: '#ECFDF5', borderRadius: '0 8px 8px 0' }}>
                                            "{log.note}"
                                          </p>
                                        )}
                                        {log.reasoning && (
                                          <div className="flex items-start gap-1.5 text-xs px-3 py-2 rounded-xl max-w-lg leading-relaxed" style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#C2410C' }}>
                                            <Sparkles size={11} style={{ flexShrink: 0, marginTop: 1 }} />
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
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
