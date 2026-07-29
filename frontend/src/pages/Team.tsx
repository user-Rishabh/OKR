import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Goal } from '../types';

interface MemberWithGoals {
  id: string;
  role: string;
  job_title: string;
  department: string;
  goals: Goal[];
}

export default function Team() {
  const { currentUser, session } = useAuth();
  const [members, setMembers] = useState<MemberWithGoals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!currentUser || !session || !currentUser.team_id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`http://localhost:8000/api/goals/team?team_id=${currentUser.team_id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch team data');
        }
        const data = await res.json();
        // Show team members (filter out the logged-in manager if returned)
        setMembers(data.filter((m: MemberWithGoals) => m.role === 'employee' || m.id !== currentUser.id));
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && currentUser.role !== 'employee') {
      fetchTeamData();
    } else {
      setLoading(false);
    }
  }, [currentUser, session]);

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
        <p className="text-zinc-400">Loading team OKRs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-500/10 border border-red-500/20 rounded-xl mt-8">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
        <p className="text-zinc-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team View</h1>
        <p className="text-zinc-400 mt-2">View and manage OKRs across your team.</p>
      </div>

      {members.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center bg-zinc-900/20">
          <p className="text-zinc-500">No team members found in your team.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {members.map(member => (
            <div key={member.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <Link 
                    to={`/team/member/${member.id}`}
                    className="group inline-flex items-center gap-2 text-xl font-bold text-white hover:text-blue-400 transition-colors"
                  >
                    {member.full_name} 
                    <span className="text-zinc-500 font-normal text-sm">({member.job_title} • {member.department})</span>
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Link>
                  <p className="text-zinc-500 text-xs mt-1">Role: {member.role}</p>
                </div>
                <div className="text-sm text-zinc-400 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                  {member.goals?.length || 0} Active Goals
                </div>
              </div>

              {(!member.goals || member.goals.length === 0) ? (
                <p className="text-zinc-500 text-sm italic">No goals created yet.</p>
              ) : (
                <div className="space-y-6">
                  {member.goals.map(goal => (
                    <div key={goal.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 space-y-4">
                      <div>
                        <h4 className="font-semibold text-zinc-200">{goal.objective_text}</h4>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded uppercase">
                            {goal.status}
                          </span>
                          <span className="text-xs text-zinc-500 font-medium self-center">{goal.cycle}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {goal.key_results?.map(kr => (
                          <div key={kr.id} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-400">{kr.kr_text}</span>
                              <span className="text-zinc-500 font-medium">{kr.progress_pct}%</span>
                            </div>
                            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{ width: `${kr.progress_pct}%` }}
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
          ))}
        </div>
      )}
    </div>
  );
}
