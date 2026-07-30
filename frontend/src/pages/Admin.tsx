import React, { useEffect, useState } from 'react';
import { Settings, Building2, Plus, Trash2, Edit2, Save, X, AlertCircle, Loader2, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Pillar {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  active_goals_count: number;
  total_goals_count: number;
}

interface Company {
  id: string;
  name: string;
}

export default function Admin() {
  const { currentUser, session } = useAuth();
  
  // Data loading states
  const [company, setCompany] = useState<Company | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Creation form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creatingPillar, setCreatingPillar] = useState(false);

  // Inline edit states
  const [editingPillarId, setEditingPillarId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updatingPillar, setUpdatingPillar] = useState(false);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!currentUser || !session) return;
      if (currentUser.role !== 'admin') {
        setLoading(false);
        return;
      }
      
      try {
        // 1. Fetch current company
        const companyRes = await fetch('http://localhost:8000/api/companies/current', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!companyRes.ok) throw new Error('Failed to fetch company details');
        const companyData = await companyRes.json();
        setCompany(companyData);

        // 2. Fetch strategic pillars
        const pillarsRes = await fetch(`http://localhost:8000/api/pillars?company_id=${companyData.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!pillarsRes.ok) throw new Error('Failed to fetch strategic pillars');
        const pillarsData = await pillarsRes.json();
        setPillars(pillarsData);
      } catch (err: any) {
        setError(err.message || 'An error occurred loading settings');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [currentUser, session]);

  // Access Gate Check
  if (currentUser?.role !== 'admin') {
    return (
      <div className="card card-top-red flex flex-col items-center justify-center p-14 mt-8 text-center font-sans">
        <AlertCircle size={40} style={{ color: '#EF4444', marginBottom: 12 }} />
        <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Access Restricted</h2>
        <p className="text-sm mt-1" style={{ color: '#6B6558' }}>This settings page is only available to administrators.</p>
      </div>
    );
  }

  const handleAddPillar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !session) return;
    
    setCreatingPillar(true);
    try {
      const res = await fetch('http://localhost:8000/api/pillars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          company_id: company.id,
          title: newTitle,
          description: newDescription
        })
      });
      if (!res.ok) throw new Error('Failed to create strategic pillar');
      const newPillar = await res.json();
      setPillars(prev => [newPillar, ...prev]);
      
      // Reset form
      setNewTitle('');
      setNewDescription('');
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create pillar');
    } finally {
      setCreatingPillar(false);
    }
  };

  const startEdit = (pillar: Pillar) => {
    setEditingPillarId(pillar.id);
    setEditTitle(pillar.title);
    setEditDescription(pillar.description || '');
  };

  const handleSaveEdit = async (pillarId: string) => {
    if (!session) return;
    
    setUpdatingPillar(true);
    try {
      const res = await fetch(`http://localhost:8000/api/pillars/${pillarId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription
        })
      });
      if (!res.ok) throw new Error('Failed to update strategic pillar');
      const updatedPillar = await res.json();
      
      setPillars(prev => prev.map(p => p.id === pillarId ? updatedPillar : p));
      setEditingPillarId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save changes');
    } finally {
      setUpdatingPillar(false);
    }
  };

  const handleDeletePillar = async (pillar: Pillar) => {
    if (!session) return;
    
    const message = pillar.total_goals_count > 0 
      ? `This pillar is used by ${pillar.total_goals_count} goals — they'll become unaligned. Continue?`
      : 'Are you sure you want to delete this strategic pillar?';
      
    if (!window.confirm(message)) return;

    try {
      const res = await fetch(`http://localhost:8000/api/pillars/${pillar.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to delete strategic pillar');
      
      setPillars(prev => prev.filter(p => p.id !== pillar.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete pillar');
    }
  };

  if (loading) return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 style={{ fontSize: 40 }}>Admin <span className="gradient-text">Settings</span></h1>
        <p className="mt-1 text-base" style={{ color: '#6B6558' }}>Loading strategic pillar configurations...</p>
      </div>
      <div className="flex justify-center items-center py-20">
        <Loader2 size={36} className="animate-spin" style={{ color: '#F2994A' }} />
      </div>
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
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-5">
        <div>
          <h1 style={{ fontSize: 40 }}>
            Admin <span className="gradient-text">Settings</span>
          </h1>
          <p className="mt-1 text-base" style={{ color: '#6B6558' }}>
            Configure strategic pillars for {company?.name || 'Nimbus Technologies'}.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="gradient-button px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer"
        >
          {showAddForm ? (
            <>
              <X size={16} /> Close Form
            </>
          ) : (
            <>
              <Plus size={16} /> Add New Pillar
            </>
          )}
        </button>
      </div>

      {/* Add New Pillar Form (Inline Card) */}
      {showAddForm && (
        <div className="card card-top-orange p-6 space-y-4 animate-stagger-1">
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: '#1A1A1A', fontFamily: 'Clash Display, Inter, sans-serif' }}>
            <Sparkles size={18} style={{ color: '#F2994A' }} />
            New Strategic Pillar
          </h3>
          <form onSubmit={handleAddPillar} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>Title</label>
              <input
                type="text" required placeholder="e.g. Expand into enterprise market segment"
                className="w-full px-4 py-2.5 text-sm"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>Description</label>
              <textarea
                required rows={3} placeholder="Provide details on this strategic pillar, key drivers and alignment parameters..."
                className="w-full px-4 py-2.5 text-sm resize-none"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-divider hover:bg-[#F0EDE6] transition-colors cursor-pointer"
                style={{ color: '#6B6558' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingPillar}
                className="gradient-button px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                {creatingPillar ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Create Pillar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pillars List */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4" style={{ color: '#1A1A1A', fontFamily: 'Clash Display, Inter, sans-serif' }}>
          <Building2 size={20} style={{ color: '#F2994A' }} />
          Company Strategic Pillars
        </h2>
        
        {pillars.length === 0 ? (
          <div className="rounded-2xl p-14 text-center" style={{ border: '2px dashed #E8E2D6' }}>
            <p className="text-sm font-medium" style={{ color: '#6B6558' }}>No strategic pillars defined. Add one to help align team goals.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {pillars.map((pillar) => {
              const isEditing = editingPillarId === pillar.id;
              
              return (
                <div key={pillar.id} className="card card-top-orange p-6 flex flex-col justify-between space-y-4">
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div className="space-y-4 flex-1">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>Title</label>
                        <input
                          type="text" required
                          className="w-full px-3 py-2 text-sm"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>Description</label>
                        <textarea
                          required rows={3}
                          className="w-full px-3 py-2 text-sm resize-none"
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingPillarId(null)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-divider hover:bg-[#F0EDE6] transition-colors cursor-pointer"
                          style={{ color: '#6B6558' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(pillar.id)}
                          disabled={updatingPillar}
                          className="gradient-button px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {updatingPillar ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: '#1A1A1A', fontFamily: 'Clash Display, Inter, sans-serif' }}>
                          {pillar.title}
                        </h3>
                        <p className="text-sm mt-2 leading-relaxed" style={{ color: '#6B6558' }}>
                          {pillar.description || 'No description provided.'}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid #E8E2D6' }}>
                        <span className={pillar.active_goals_count > 0 ? 'pill-green' : 'pill-neutral'}>
                          {pillar.active_goals_count} Active Goals
                        </span>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(pillar)}
                            className="p-2 rounded-lg transition-colors hover:bg-[#F0EDE6] text-muted hover:text-brand-orange cursor-pointer"
                            title="Edit Strategic Pillar"
                            style={{ color: '#6B6558' }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeletePillar(pillar)}
                            className="p-2 rounded-lg transition-colors hover:bg-red-50 text-muted hover:text-brand-red cursor-pointer"
                            title="Delete Strategic Pillar"
                            style={{ color: '#6B6558' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
