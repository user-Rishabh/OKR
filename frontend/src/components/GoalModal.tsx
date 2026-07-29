import React, { useState } from 'react';
import { X, Check, Edit2, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import type { Goal, KeyResult } from '../types';
import { useAuth } from '../context/AuthContext';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Goal) => void;
  userId: string;
}


function SuggestedGoalCard({ goal, onSave, userId }: { goal: Goal, onSave: (goal: Goal) => void, userId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Goal>(goal);
  const [isSaving, setIsSaving] = useState(false);
  const { session } = useAuth();

  const handleSave = async () => {
    if (isEditing) {
      setIsEditing(false);
    } else {
      setIsSaving(true);
      try {
        const res = await fetch('http://localhost:8000/api/goals', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            user_id: userId,
            cycle: editedGoal.cycle,
            objective_text: editedGoal.objective_text,
            pillar_id: null, // the API expects pillar_id but frontend has pillar_title. We'll send null for now or leave it out if optional
            ai_generated: editedGoal.ai_generated,
            key_results: editedGoal.key_results.map(kr => ({
              kr_text: kr.kr_text,
              target_value: kr.target_value ? Number(kr.target_value) : null,
              unit: kr.unit || null,
              suggested_metric_text: kr.suggested_metric
            }))
          })
        });
        if (!res.ok) throw new Error('Failed to save goal');
        const savedGoal = await res.json();
        onSave(savedGoal);
      } catch (err) {
        console.error(err);
        alert('Failed to save goal');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const updateKR = (index: number, text: string) => {
    const newKRs = [...editedGoal.key_results];
    newKRs[index].kr_text = text;
    setEditedGoal({ ...editedGoal, key_results: newKRs });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-4 relative group">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editedGoal.objective_text}
              onChange={(e) => setEditedGoal({ ...editedGoal, objective_text: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          ) : (
            <h4 className="font-semibold text-lg">{editedGoal.objective_text}</h4>
          )}
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
            {editedGoal.pillar_title || 'No Pillar'}
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Edit Goal"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-400">Key Results</p>
        <ul className="space-y-2">
          {editedGoal.key_results.map((kr, idx) => (
            <li key={kr.id} className="flex items-start gap-2 text-sm">
              <span className="text-zinc-500 mt-1">•</span>
              {isEditing ? (
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={kr.kr_text}
                    onChange={(e) => updateKR(idx, e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300 focus:outline-none focus:border-blue-500"
                  />
                  {kr.suggested_metric && (
                    <span className="text-xs text-zinc-500 block">Metric: {kr.suggested_metric}</span>
                  )}
                </div>
              ) : (
                <div className="flex-1">
                  <span className="text-zinc-300 block">{kr.kr_text}</span>
                  {kr.suggested_metric && (
                    <span className="text-xs text-zinc-500">Target: {kr.suggested_metric}</span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end pt-2 border-t border-zinc-800/50 mt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
          {isEditing ? 'Done Editing' : (
            <>
              {!isSaving && <Check size={16} />}
              Accept & Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function GoalModal({ isOpen, onClose, onSave, userId }: GoalModalProps) {
  const [step, setStep] = useState<'form' | 'loading' | 'suggestions'>('form');
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    job_title: '',
    department: '',
    focus_area: ''
  });
  const [suggestions, setSuggestions] = useState<Goal[]>([]);

  if (!isOpen) return null;

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');
    setError(null);

    try {
      // 1. Fetch current company ID
      const companyRes = await fetch('http://localhost:8000/api/companies/current');
      if (!companyRes.ok) throw new Error('Failed to fetch company context');
      const company = await companyRes.json();
      
      // 2. Fetch suggestions from Groq
      const suggestRes = await fetch('http://localhost:8000/api/goals/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          company_id: company.id
        })
      });
      
      if (!suggestRes.ok) throw new Error('Failed to generate suggestions. Please try again.');
      
      const data = await suggestRes.json();
      
      // Map API response to our local Goal interface
      const mappedSuggestions: Goal[] = data.map((item: any, i: number) => ({
        id: `temp-${i}`,
        objective_text: item.objective,
        pillar_title: item.aligned_pillar === 'none' ? undefined : item.aligned_pillar,
        status: 'draft',
        cycle: 'Q3-2026',
        ai_generated: true,
        key_results: item.key_results.map((kr: any, j: number) => ({
          id: `temp-kr-${i}-${j}`,
          kr_text: kr.text,
          suggested_metric: kr.suggested_metric,
          current_value: 0,
          progress_pct: 0
        }))
      }));

      setSuggestions(mappedSuggestions);
      setStep('suggestions');
    } catch (err: any) {
      setError(err.message);
      setStep('form');
    }
  };

  const handleSaveGoal = (goal: Goal) => {
    onSave(goal);
    const remaining = suggestions.filter(s => s.id !== goal.id);
    setSuggestions(remaining);
    if (remaining.length === 0) {
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('form');
    setError(null);
    setFormData({ job_title: '', department: '', focus_area: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {step === 'form' || step === 'loading' ? 'Create New Goal' : 'AI-Suggested Goals'}
            {(step === 'suggestions' || step === 'loading') && <Sparkles size={20} className="text-blue-400" />}
          </h2>
          <button onClick={handleClose} className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {step === 'loading' ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Analyzing your focus area</h3>
              <p className="text-zinc-400 max-w-sm">
                Our AI is matching your role against company pillars to generate optimal SMART goals...
              </p>
            </div>
          ) : step === 'form' ? (
            <form onSubmit={handleSuggest} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3 text-red-400">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backend Engineer"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                  value={formData.job_title}
                  onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Department</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Focus Area</label>
                <textarea
                  required
                  placeholder="e.g. I want to improve backend performance..."
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow resize-none"
                  value={formData.focus_area}
                  onChange={e => setFormData({ ...formData, focus_area: e.target.value })}
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  <Sparkles size={18} />
                  Suggest Goals
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-400 text-sm mb-4">
                Based on your focus area, here are some suggested goals. You can edit them before saving.
              </p>
              {suggestions.map(goal => (
                <SuggestedGoalCard key={goal.id} goal={goal} onSave={handleSaveGoal} userId={userId} />
              ))}
              {suggestions.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  All suggestions processed!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
