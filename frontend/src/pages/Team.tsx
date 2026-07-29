import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowRight, Users } from 'lucide-react';
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

const topBarClass = (pct: number) =>
  pct >= 70 ? 'card-top-green' : pct >= 30 ? 'card-top-orange' : 'card-top-red';

export default function Team() {
  const { currentUser, session } = useAuth();
  const [members, setMembers] = useState<MemberWithGoals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    if (currentUser && currentUser.role !== 'employee') fetchTeamData();
    else setLoading(false);
  }, [currentUser, session]);

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
