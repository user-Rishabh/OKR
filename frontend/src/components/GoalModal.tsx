import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Edit2, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import type { Goal } from '../types';
import { useAuth } from '../context/AuthContext';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Goal) => void;
  userId: string;
}

function SuggestedGoalCard({ goal, onSave, userId }: { goal: Goal; onSave: (g: Goal) => void; userId: string }) {
  const [isSaving, setIsSaving] = useState(false);
  const { session } = useAuth();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:8000/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          user_id: userId,
          cycle: goal.cycle,
          objective_text: goal.objective_text,
          pillar_id: null,
          ai_generated: goal.ai_generated,
          key_results: goal.key_results.map(kr => ({
            kr_text: kr.kr_text,
            target_value: kr.target_value ? Number(kr.target_value) : null,
            unit: kr.unit || null,
            suggested_metric_text: kr.suggested_metric
          }))
        })
      });
      if (!res.ok) throw new Error('Failed to save goal');
      onSave(await res.json());
    } catch (err) { console.error(err); alert('Failed to save goal'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="card card-top-blue p-5 space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h4 className="font-bold text-base leading-snug" style={{ color: '#1A1A1A' }}>{goal.objective_text}</h4>
          <span className="pill-blue mt-2 inline-flex">
            {goal.pillar_title || 'No Pillar'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6B6558' }}>Key Results</p>
        <ul className="space-y-2">
          {goal.key_results.map((kr) => (
            <li key={kr.id} className="flex items-start gap-2 text-sm">
              <span className="mt-1 flex-shrink-0" style={{ color: '#F2994A' }}>•</span>
              <div className="flex-1">
                <span style={{ color: '#1A1A1A' }}>{kr.kr_text}</span>
                {kr.suggested_metric && <span className="text-xs block mt-0.5" style={{ color: '#6B6558' }}>Target: {kr.suggested_metric}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end pt-3" style={{ borderTop: '1px solid #E8E2D6' }}>
        <button onClick={handleSave} disabled={isSaving} className="gradient-button flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold cursor-pointer">
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
          <Check size={15} />Accept &amp; Save
        </button>
      </div>
    </div>
  );
}

export default function GoalModal({ isOpen, onClose, onSave, userId }: GoalModalProps) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'form' | 'loading' | 'suggestions'>('form');
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ job_title: '', department: '', focus_area: '' });
  const [suggestions, setSuggestions] = useState<Goal[]>([]);

  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData(prev => ({
        ...prev,
        job_title: prev.job_title || currentUser.job_title || '',
        department: prev.department || currentUser.department || '',
      }));
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault(); setStep('loading'); setError(null);
    try {
      const companyRes = await fetch('http://localhost:8000/api/companies/current');
      if (!companyRes.ok) throw new Error('Failed to fetch company context');
      const company = await companyRes.json();
      const suggestRes = await fetch('http://localhost:8000/api/goals/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, company_id: company.id })
      });
      if (!suggestRes.ok) throw new Error('Failed to generate suggestions.');
      const data = await suggestRes.json();
      setSuggestions(data.map((item: any, i: number) => ({
        id: `temp-${i}`, objective_text: item.objective,
        pillar_title: item.aligned_pillar === 'none' ? undefined : item.aligned_pillar,
        status: 'draft', cycle: 'Q3-2026', ai_generated: true,
        key_results: item.key_results.map((kr: any, j: number) => ({
          id: `temp-kr-${i}-${j}`, kr_text: kr.text, suggested_metric: kr.suggested_metric,
          current_value: 0, progress_pct: 0
        }))
      })));
      setStep('suggestions');
    } catch (err: any) { setError(err.message); setStep('form'); }
  };

  const handleSaveGoal = (goal: Goal) => {
    onSave(goal);
    const remaining = suggestions.filter(s => s.id !== goal.id);
    setSuggestions(remaining);
    if (remaining.length === 0) handleClose();
  };

  const handleClose = () => {
    setStep('form'); setError(null);
    setFormData({ job_title: '', department: '', focus_area: '' });
    onClose();
  };

  const inputCls = "w-full px-4 py-2.5 text-sm rounded-xl";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} onClick={handleClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-stagger-1"
        style={{ background: '#FFFFFF', border: '1px solid #E8E2D6', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', borderTop: '4px solid #F2994A' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E8E2D6' }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#1A1A1A', fontFamily: 'Clash Display, Inter, sans-serif' }}>
            {step === 'suggestions' ? 'AI-Suggested ' : 'Create New '}
            <span className="gradient-text">{step === 'suggestions' ? 'Goals' : 'Goal'}</span>
            {(step === 'suggestions' || step === 'loading') && <Sparkles size={18} style={{ color: '#F2994A' }} />}
          </h2>
          <button onClick={handleClose} className="p-1.5 rounded-lg cursor-pointer transition-colors" style={{ color: '#6B6558' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-5">
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, rgba(242,153,74,0.1), rgba(181,101,29,0.1))' }}>
                <Loader2 size={28} style={{ color: '#F2994A' }} className="animate-spin" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#1A1A1A' }}>Analyzing your focus area</h3>
              <p className="text-sm" style={{ color: '#6B6558' }}>Matching your role against company pillars to generate SMART goals...</p>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSuggest} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl flex items-start gap-3" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                  <AlertCircle size={16} style={{ color: '#EF4444' }} />
                  <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>
                </div>
              )}
              {[
                { label: 'Job Title', key: 'job_title', placeholder: 'e.g. Backend Engineer', type: 'text' },
                { label: 'Department', key: 'department', placeholder: 'e.g. Engineering', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>{f.label}</label>
                  <input type={f.type} required placeholder={f.placeholder} className={inputCls}
                    value={(formData as any)[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>Focus Area</label>
                <textarea required rows={4} placeholder="e.g. Improve backend performance..." className="w-full px-4 py-2.5 text-sm rounded-xl resize-none"
                  value={formData.focus_area} onChange={e => setFormData({ ...formData, focus_area: e.target.value })} />
                
                {/* Suggestions Pills */}
                <div className="mt-2.5 space-y-1.5">
                  <span className="text-xs font-semibold" style={{ color: '#6B6558' }}>Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {[
                      "Improve API latency & backend speed",
                      "Optimize database & cloud resource usage",
                      "Increase automated test coverage",
                      "Accelerate onboarding & documentation",
                      "Improve support response time"
                    ].map((pill, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, focus_area: pill })}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer hover:border-brand-amber hover:text-brand-orange"
                        style={{
                          background: formData.focus_area === pill ? 'linear-gradient(135deg, rgba(242,153,74,0.1), rgba(181,101,29,0.1))' : '#F7F4EE',
                          borderColor: formData.focus_area === pill ? '#F2994A' : '#E8E2D6',
                          color: formData.focus_area === pill ? '#B5651D' : '#6B6558'
                        }}
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full gradient-button font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                <Sparkles size={18} />Suggest Goals
              </button>
            </form>
          )}

          {step === 'suggestions' && (
            <div className="space-y-5">
              <p className="text-sm" style={{ color: '#6B6558' }}>AI-generated goals based on your focus area — review and save.</p>
              {suggestions.map(goal => <SuggestedGoalCard key={goal.id} goal={goal} onSave={handleSaveGoal} userId={userId} />)}
              {suggestions.length === 0 && <p className="text-center py-8 italic" style={{ color: '#6B6558' }}>All suggestions processed!</p>}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
