import React, { useState } from 'react';
import { X, Check, Edit2, Sparkles } from 'lucide-react';
import type { Goal, KeyResult } from '../types';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Goal) => void;
}

const MOCK_SUGGESTIONS: Goal[] = [
  {
    id: 'mock-1',
    objective_text: 'Improve backend API performance and reliability',
    pillar_title: 'Improve platform reliability',
    status: 'draft',
    cycle: 'Q3-2026',
    ai_generated: true,
    key_results: [
      { id: 'kr-1', kr_text: 'Reduce p95 API latency to <200ms', current_value: 0, progress_pct: 0 },
      { id: 'kr-2', kr_text: 'Achieve 99.99% uptime for core services', current_value: 0, progress_pct: 0 },
    ]
  },
  {
    id: 'mock-2',
    objective_text: 'Streamline the developer deployment pipeline',
    pillar_title: 'Accelerate customer onboarding',
    status: 'draft',
    cycle: 'Q3-2026',
    ai_generated: true,
    key_results: [
      { id: 'kr-3', kr_text: 'Reduce average CI/CD build time to under 5 minutes', current_value: 0, progress_pct: 0 },
      { id: 'kr-4', kr_text: 'Increase automated test coverage to 85%', current_value: 0, progress_pct: 0 },
    ]
  },
  {
    id: 'mock-3',
    objective_text: 'Enhance system monitoring and alerting',
    pillar_title: 'Improve platform reliability',
    status: 'draft',
    cycle: 'Q3-2026',
    ai_generated: true,
    key_results: [
      { id: 'kr-5', kr_text: 'Implement distributed tracing for all tier-1 microservices', current_value: 0, progress_pct: 0 },
      { id: 'kr-6', kr_text: 'Reduce false-positive critical alerts by 50%', current_value: 0, progress_pct: 0 },
      { id: 'kr-7', kr_text: 'Decrease Mean Time to Recovery (MTTR) to under 30 minutes', current_value: 0, progress_pct: 0 },
    ]
  }
];

function SuggestedGoalCard({ goal, onSave }: { goal: Goal, onSave: (goal: Goal) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Goal>(goal);

  const handleSave = () => {
    if (isEditing) {
      setIsEditing(false);
    } else {
      // Create a unique ID and mark as active when saved
      onSave({
        ...editedGoal,
        id: crypto.randomUUID(),
        status: 'active',
        key_results: editedGoal.key_results.map(kr => ({ ...kr, id: crypto.randomUUID() }))
      });
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
            {editedGoal.pillar_title}
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
                <input
                  type="text"
                  value={kr.kr_text}
                  onChange={(e) => updateKR(idx, e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-300 focus:outline-none focus:border-blue-500"
                />
              ) : (
                <span className="text-zinc-300">{kr.kr_text}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end pt-2 border-t border-zinc-800/50 mt-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          {isEditing ? 'Done Editing' : (
            <>
              <Check size={16} />
              Accept & Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function GoalModal({ isOpen, onClose, onSave }: GoalModalProps) {
  const [step, setStep] = useState<'form' | 'suggestions'>('form');
  const [formData, setFormData] = useState({
    job_title: '',
    department: '',
    focus_area: ''
  });
  const [suggestions, setSuggestions] = useState<Goal[]>(MOCK_SUGGESTIONS);

  if (!isOpen) return null;

  const handleSuggest = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('suggestions');
    setSuggestions(MOCK_SUGGESTIONS);
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
            {step === 'form' ? 'Create New Goal' : 'AI-Suggested Goals'}
            {step === 'suggestions' && <Sparkles size={20} className="text-blue-400" />}
          </h2>
          <button onClick={handleClose} className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {step === 'form' ? (
            <form onSubmit={handleSuggest} className="space-y-5">
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
                <SuggestedGoalCard key={goal.id} goal={goal} onSave={handleSaveGoal} />
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
