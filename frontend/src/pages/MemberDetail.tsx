import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, AlertCircle, Loader2, ChevronDown, ChevronUp, Clock, Calendar } from 'lucide-react';
import type { Goal, KeyResult } from '../types';

interface ProgressLog {
  id: string;
  key_result_id: string;
  previous_value: number;
  new_value: number;
  note: string | null;
  created_at: string;
  users?: {
    full_name: string;
  } | null;
}

interface MemberDetailData {
  user: {
    id: string;
    role: string;
    job_title: string;
    department: string;
  };
  goals: (Goal & {
    key_results: (KeyResult & {
      progress_logs: ProgressLog[];
    })[];
  })[];
}

export default function MemberDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser, session } = useAuth();
  
  const [data, setData] = useState<MemberDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKRs, setExpandedKRs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchMemberActivity = async () => {
      if (!userId || !session) return;
      try {
        const res = await fetch(`http://localhost:8000/api/users/${userId}/activity`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('Access restricted — you do not have permission to view this user\'s activity.');
          }
          throw new Error('Failed to fetch employee details.');
        }
        const activityData = await res.json();
        setData(activityData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && currentUser.role !== 'employee') {
      fetchMemberActivity();
    } else {
      setLoading(false);
    }
  }, [userId, currentUser, session]);

  const toggleKRExpanded = (krId: string) => {
    setExpandedKRs(prev => ({
      ...prev,
      [krId]: !prev[krId]
    }));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Route protection
  if (currentUser && currentUser.role === 'employee') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/20 border border-zinc-800 rounded-xl mt-8">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Access restricted</h2>
        <p className="text-zinc-400">This page is only available to managers and admins.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 mt-8">
        <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
        <p className="text-zinc-400">Loading activity timeline...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-500/10 border border-red-500/20 rounded-xl mt-8 animate-in fade-in duration-200">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
        <p className="text-zinc-400 mb-6">{error || 'Failed to load data.'}</p>
        <Link to="/team" className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          <ArrowLeft size={16} /> Back to Team
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header and Back navigation */}
      <div className="space-y-4">
        <Link 
          to="/team" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to Team
        </Link>
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{data.user.full_name}</h1>
            <p className="text-zinc-400 mt-1">{data.user.job_title} • {data.user.department} Department</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
            {data.user.role}
          </span>
        </div>
      </div>

      {/* Goals Timeline */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Clock size={18} className="text-zinc-400" />
          Active Goals & KR History
        </h2>

        {data.goals.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center bg-zinc-900/20">
            <p className="text-zinc-500 text-sm">No goals have been logged for this employee yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.goals.map(goal => (
              <div key={goal.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                {/* Goal Info */}
                <div className="p-5 border-b border-zinc-800 bg-zinc-900/40">
                  <h3 className="text-lg font-semibold text-white">{goal.objective_text}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded uppercase">
                      {goal.status}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium self-center">{goal.cycle}</span>
                  </div>
                </div>

                {/* Key Results list */}
                <div className="p-5 space-y-4 bg-zinc-950/60">
                  {goal.key_results.map(kr => {
                    const isExpanded = !!expandedKRs[kr.id];
                    return (
                      <div key={kr.id} className="border border-zinc-900 bg-zinc-900/10 rounded-lg p-4 space-y-3">
                        <div 
                          onClick={() => toggleKRExpanded(kr.id)}
                          className="flex justify-between items-start gap-4 cursor-pointer hover:bg-zinc-900/20 p-1.5 rounded transition-all"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-300">{kr.kr_text}</p>
                            {kr.suggested_metric && (
                              <p className="text-xs text-zinc-500 mt-1">Target: {kr.suggested_metric}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-400">
                              {kr.progress_pct}%
                            </span>
                            {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${kr.progress_pct}%` }}
                          />
                        </div>

                        {/* Activity Timeline Expansion */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3 animate-in slide-in-from-top-1 duration-200">
                            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Activity Timeline</p>
                            {!kr.progress_logs || kr.progress_logs.length === 0 ? (
                              <p className="text-zinc-500 text-xs italic pl-4">No activity logged for this key result.</p>
                            ) : (
                              <div className="relative pl-6 border-l border-zinc-800 space-y-4">
                                {kr.progress_logs.map(log => (
                                  <div key={log.id} className="relative">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[30px] top-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-zinc-950" />
                                    
                                    <div className="text-xs space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-zinc-400 flex items-center gap-1 font-medium">
                                          <Calendar size={12} />
                                          {formatDate(log.created_at)}
                                        </span>
                                        <span className="text-zinc-500">•</span>
                                        <span className="text-zinc-400">
                                          Updated by <span className="text-zinc-300 font-semibold">{log.users?.full_name || 'System'}</span>
                                        </span>
                                        <span className="text-zinc-500">•</span>
                                        <span className="text-zinc-300 font-semibold bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
                                          Progress: {log.previous_value}% → {log.new_value}%
                                        </span>
                                      </div>
                                      
                                      {log.note && (
                                        <p className="text-zinc-300 italic bg-zinc-900/30 p-2 border-l-2 border-blue-500/50 rounded-r-md mt-1 pl-3 text-xs leading-relaxed max-w-lg">
                                          "{log.note}"
                                        </p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
