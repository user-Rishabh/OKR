import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowRight, Users, Sparkles, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Goal } from '../types';
import ProgressRing from '../components/ProgressRing';
import { SkeletonCard } from '../components/Skeleton';

interface MemberWithGoals {
  id: string;
  full_name: string;
  role: string;
  job_title: string;
  department: string;
  goals: Goal[];
}

interface AlignmentFlag {
  id: string;
  goal_id_a: string;
  goal_id_b: string;
  reason: string;
  created_at: string;
  employee_name_a: string;
  employee_name_b: string;
  objective_text_a: string;
  objective_text_b: string;
}

const topBarClass = (pct: number) =>
  pct >= 70 ? 'card-top-green' : pct >= 30 ? 'card-top-orange' : 'card-top-red';

export default function Team() {
  const { currentUser, session } = useAuth();
  const [members, setMembers] = useState<MemberWithGoals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [flags, setFlags] = useState<AlignmentFlag[]>([]);
  const [checkingAlignment, setCheckingAlignment] = useState(false);
  const [alignmentError, setAlignmentError] = useState<string | null>(null);
  const [loadingFlags, setLoadingFlags] = useState(true);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!currentUser || !session || !currentUser.team_id) { setLoading(false); return; }
      try {
        const res = await fetch(`http://localhost:8000/api/goals/team?team_id=${currentUser.team_id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch team data');
        const data = await res.json();
        setMembers(data.filter((m: MemberWithGoals) => m.role === 'employee' || m.id !== currentUser.id));
      } catch (err: any) { setError(err.message || 'An error occurred'); }
      finally { setLoading(false); }
    };

    const fetchFlags = async () => {
      if (!currentUser || !session || !currentUser.team_id) { setLoadingFlags(false); return; }
      try {
        const res = await fetch(`http://localhost:8000/api/goals/alignment-flags?team_id=${currentUser.team_id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch alignment flags');
        const data = await res.json();
        setFlags(data);
      } catch (err: any) {
        console.error('Failed to load alignment flags:', err);
      } finally {
        setLoadingFlags(false);
      }
    };

    if (currentUser && currentUser.role !== 'employee') {
      fetchTeamData();
      fetchFlags();
    } else {
      setLoading(false);
      setLoadingFlags(false);
    }
  }, [currentUser, session]);

  const runAlignmentCheck = async () => {
    if (!currentUser || !session || !currentUser.team_id) return;
    setCheckingAlignment(true);
    setAlignmentError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/goals/check-alignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ team_id: currentUser.team_id })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to run alignment check');
      }
      const data = await res.json();
      setFlags(data);
    } catch (err: any) {
      setAlignmentError(err.message || 'An error occurred running the alignment check');
    } finally {
      setCheckingAlignment(false);
    }
  };

  if (currentUser?.role === 'employee') return (
    <div className="card card-top-red flex flex-col items-center justify-center p-14 mt-8 text-center font-sans">
      <AlertCircle size={40} style={{ color: '#EF4444', marginBottom: 12 }} />
      <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Access Restricted</h2>
      <p className="text-sm mt-1" style={{ color: '#6B6558' }}>This page is only available to managers and admins.</p>
    </div>
  );

  if (loading) return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 style={{ fontSize: 40 }}>Team <span className="gradient-text">View</span></h1>
        <p className="mt-1 text-base" style={{ color: '#6B6558' }}>View and manage OKRs across your team.</p>
      </div>
      <SkeletonCard /><SkeletonCard /><SkeletonCard />
    </div>
  );

  if (error) return (
    <div className="card card-top-red flex flex-col items-center justify-center p-12 mt-8 text-center font-sans">
      <AlertCircle size={40} style={{ color: '#EF4444', marginBottom: 12 }} />
      <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Error</h2>
      <p className="text-sm mt-1" style={{ color: '#EF4444' }}>{error}</p>
    </div>
  );

  return (
    <div className="space-y-8 font-sans animate-stagger-1">
      <div className="flex justify-between items-center flex-wrap gap-5">
        <div>
          <h1 style={{ fontSize: 40 }}>Team <span className="gradient-text">View</span></h1>
          <p className="mt-1 text-base" style={{ color: '#6B6558' }}>View and manage OKRs across your team.</p>
        </div>
        <div className="icon-badge icon-badge-orange" style={{ width: 44, height: 44, borderRadius: 12 }}>
          <Users size={22} />
        </div>
      </div>

      {/* Alignment Check Section */}
      <div className="card overflow-hidden animate-stagger-2" style={{ borderTop: '4px solid #F2994A' }}>
        <div className="p-6" style={{ borderBottom: '1px solid #E8E2D6' }}>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1A1A1A', fontFamily: 'Clash Display, Inter, sans-serif' }}>
                <Sparkles size={20} style={{ color: '#F2994A' }} />
                Alignment Check
              </h2>
              <p className="text-sm mt-1" style={{ color: '#6B6558' }}>
                Scan active goals across your team to detect semantic overlaps or duplicate work.
              </p>
            </div>
            <button
              onClick={runAlignmentCheck}
              disabled={checkingAlignment}
              className="gradient-button px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              {checkingAlignment ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Running AI Check...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Run Alignment Check
                </>
              )}
            </button>
          </div>
          {alignmentError && (
            <div className="mt-4 p-3.5 rounded-xl text-sm font-medium flex items-center gap-2.5" style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FEE2E2' }}>
              <AlertCircle size={16} />
              <span>{alignmentError}</span>
            </div>
          )}
        </div>

        <div className="p-6" style={{ background: '#FAFAF8' }}>
          {loadingFlags ? (
            <div className="flex justify-center items-center py-6">
              <RefreshCw size={24} className="animate-spin" style={{ color: '#F2994A' }} />
            </div>
          ) : flags.length === 0 ? (
            <div className="rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left justify-between" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge-green" style={{ width: 36, height: 36 }}>
                  <CheckCircle size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm" style={{ color: '#059669' }}>No alignment issues detected</h4>
                  <p className="text-xs mt-0.5" style={{ color: '#047857' }}>All team members are working on distinct and well-aligned objectives.</p>
                </div>
              </div>
              <span className="pill-green">Aligned</span>
            </div>
          ) : (
            <div className="space-y-4">
              {flags.map((flag) => (
                <div key={flag.id} className="card p-5 space-y-4" style={{ borderLeft: '4px solid #F2994A' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {/* Left Goal */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: '#FFF7ED', color: '#C2410C' }}>Employee A</span>
                        <h5 className="font-bold text-sm" style={{ color: '#1A1A1A' }}>{flag.employee_name_a}</h5>
                      </div>
                      <p className="text-sm font-medium p-3.5 rounded-xl italic leading-relaxed" style={{ background: '#F7F4EE', border: '1px solid #E8E2D6', color: '#1A1A1A' }}>
                        "{flag.objective_text_a}"
                      </p>
                    </div>

                    {/* Right Goal */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: '#FFF7ED', color: '#C2410C' }}>Employee B</span>
                        <h5 className="font-bold text-sm" style={{ color: '#1A1A1A' }}>{flag.employee_name_b}</h5>
                      </div>
                      <p className="text-sm font-medium p-3.5 rounded-xl italic leading-relaxed" style={{ background: '#F7F4EE', border: '1px solid #E8E2D6', color: '#1A1A1A' }}>
                        "{flag.objective_text_b}"
                      </p>
                    </div>
                  </div>

                  {/* AI Reason */}
                  <div className="pt-3.5 space-y-1.5" style={{ borderTop: '1px solid #E8E2D6' }}>
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: '#B5651D' }}>
                      <AlertTriangle size={14} />
                      AI Overlap Detection Reason
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#6B6558' }}>
                      {flag.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl p-14 text-center" style={{ border: '2px dashed #E8E2D6' }}>
          <p className="text-sm" style={{ color: '#6B6558' }}>No team members found in your team.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {members.map(member => {
            const allKRs = member.goals.flatMap(g => g.key_results || []);
            const avgPct = allKRs.length > 0 ? allKRs.reduce((s, k) => s + k.progress_pct, 0) / allKRs.length : 0;

            return (
              <div key={member.id} className={`card ${topBarClass(avgPct)} overflow-hidden`}>
                {/* Member header */}
                <div className="p-6" style={{ borderBottom: '1px solid #E8E2D6' }}>
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                      <Link
                        to={`/team/member/${member.id}`}
                        className="group inline-flex items-center gap-2 text-xl font-bold transition-colors"
                        style={{ color: '#1A1A1A', fontFamily: 'Clash Display, Inter, sans-serif' }}
                        onMouseOver={e => e.currentTarget.style.color = '#B5651D'}
                        onMouseOut={e => e.currentTarget.style.color = '#1A1A1A'}
                      >
                        {member.full_name}
                        <span className="font-normal text-sm" style={{ color: '#6B6558', fontFamily: 'Inter, sans-serif' }}>
                          ({member.job_title} · {member.department})
                        </span>
                        <ArrowRight size={16} style={{ color: '#F2994A' }} />
                      </Link>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="pill-neutral">{member.role}</span>
                      </div>
                    </div>
                    <span className="gradient-badge px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide font-mono">
                      {member.goals?.length || 0} Goals
                    </span>
                  </div>
                </div>

                {/* Goals */}
                <div className="p-6 space-y-4" style={{ background: '#FAFAF8' }}>
                  {(!member.goals || member.goals.length === 0) ? (
                    <p className="text-sm italic" style={{ color: '#6B6558' }}>No goals created yet.</p>
                  ) : (
                    member.goals.map(goal => {
                      const gKRs = goal.key_results || [];
                      const gPct = gKRs.length > 0 ? gKRs.reduce((s, k) => s + k.progress_pct, 0) / gKRs.length : 0;
                      return (
                        <div key={goal.id} className={`card ${topBarClass(gPct)} p-5 space-y-3`}>
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <h4 className="font-bold text-base leading-snug" style={{ color: '#1A1A1A' }}>{goal.objective_text}</h4>
                              <div className="flex gap-2 mt-2">
                                <span className={gPct >= 70 ? 'pill-green' : gPct >= 30 ? 'pill-orange' : 'pill-neutral'}>{goal.status}</span>
                                <span className="text-xs font-mono self-center" style={{ color: '#6B6558' }}>{goal.cycle}</span>
                              </div>
                            </div>
                            <ProgressRing progress={gPct} size={48} strokeWidth={4.5} />
                          </div>

                          <div className="space-y-2 pt-3" style={{ borderTop: '1px solid #E8E2D6' }}>
                            {gKRs.map(kr => (
                              <div key={kr.id} className="flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg" style={{ background: '#F7F4EE' }}>
                                <span className="text-sm font-medium flex-1" style={{ color: '#1A1A1A' }}>{kr.kr_text}</span>
                                <ProgressRing progress={kr.progress_pct} size={36} strokeWidth={4} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
