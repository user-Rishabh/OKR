import React, { useEffect, useState } from 'react';
import { Settings, Building2, Plus, Trash2, Edit2, Save, X, AlertCircle, Loader2, Sparkles, Check, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from "../config";

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

  // Profile change requests states
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const fetchAdminData = async () => {
    if (!currentUser || !session) return;
    if (currentUser.role !== 'admin') {
      setLoading(false);
      return;
    }
    
    try {
      // 1. Fetch curre
    
      const companyRes = await fetch(`${API_URL}/api/companies/current`, {
    headers: { 
        Authorization: `Bearer ${session.access_token}` 
    }
});

if (!companyRes.ok) {
    throw new Error('Failed to fetch company details');
}

const companyData = await companyRes.json();
setCompany(companyData);

      // 2. Fetch strategic pillars
      const pillarsRes = await fetch(`${API_URL}/api/pillars?company_id=${companyData.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!pillarsRes.ok) throw new Error('Failed to fetch strategic pillars');
      const pillarsData = await pillarsRes.json();
      setPillars(pillarsData);

      // 3. Fetch pending profile change requests
      const requestsRes = await fetch(`${API_URL}/api/profile/change-requests/pending`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setPendingRequests(requestsData);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser, session]);

  // Handle Strategic Pillar Creation
  const handleAddPillar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !company) return;
    
    setCreatingPillar(true);
    try {
      const res = await fetch(`${API_URL}/api/pillars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          company_id: company.id,
          title: newTitle,
          description: newDescription
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create strategic pillar');
      }
      
      const newPillar = await res.json();
      // Calculate default counts
      newPillar.active_goals_count = 0;
      newPillar.total_goals_count = 0;
      
      setPillars(prev => [newPillar, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add pillar');
    } finally {
      setCreatingPillar(false);
    }
  };

  // Handle Edit Start
  const startEdit = (pillar: Pillar) => {
    setEditingPillarId(pillar.id);
    setEditTitle(pillar.title);
    setEditDescription(pillar.description || '');
  };

  // Handle Edit Save
  const handleSaveEdit = async (pillarId: string) => {
    if (!editTitle.trim()) return;
    
    setUpdatingPillar(true);
    try {
      const res = await fetch(`${API_URL}/api/pillars/${pillarId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update strategic pillar');
      }
      
      const updated = await res.json();
      setPillars(prev => prev.map(p => p.id === pillarId ? { ...p, title: updated.title, description: updated.description } : p));
      setEditingPillarId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update pillar');
    } finally {
      setUpdatingPillar(false);
    }
  };

  // Handle Strategic Pillar Delete
  const handleDeletePillar = async (pillar: Pillar) => {
    const confirmationMsg = pillar.total_goals_count > 0 
      ? `This pillar is used by ${pillar.total_goals_count} goals - they will become unaligned. Continue?`
      : 'Are you sure you want to delete this strategic pillar?';
      
    if (!window.confirm(confirmationMsg)) return;
    
    try {
      const res = await fetch(`${API_URL}/api/pillars/${pillar.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to delete strategic pillar');
      }
      
      setPillars(prev => prev.filter(p => p.id !== pillar.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete pillar');
    }
  };

  // Handle Profile Request Approval / Rejection
  const handleReviewRequest = async (reqId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`${API_URL}/api/profile/change-requests/${reqId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          status,
          reviewer_note: status === 'rejected' && rejectNote.trim() ? rejectNote : undefined
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to review request');
      }
      
      setReviewMessage(`Request successfully ${status}!`);
      setTimeout(() => setReviewMessage(null), 3000);
      setRejectingRequestId(null);
      setRejectNote('');
      fetchAdminData(); // Refresh requests list
    } catch (err: any) {
      alert(err.message);
    }
  };

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

  if (loading) return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 style={{ fontSize: 40 }}>Admin <span className="gradient-text">Settings</span></h1>
        <p className="mt-1 text-base" style={{ color: '#6B6558' }}>Loading settings details...</p>
      </div>
      <div className="flex justify-center items-center py-20">
        <Loader2 size={36} className="animate-spin" style={{ color: '#3B4B6B' }} />
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
    <div className="space-y-12 font-sans animate-stagger-1">
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
            <Sparkles size={18} style={{ color: '#3B4B6B' }} />
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
                rows={3} placeholder="e.g. Expand platform feature set with compliance and Single Sign-On features requested by large companies."
                className="w-full px-4 py-2.5 text-sm resize-none"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit" disabled={creatingPillar}
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
          <Building2 size={20} style={{ color: '#3B4B6B' }} />
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
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B6558' }}>Title</label>
                        <input
                          type="text" className="w-full px-3 py-2 text-sm"
                          value={editTitle} onChange={e => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B6558' }}>Description</label>
                        <textarea
                          rows={3} className="w-full px-3 py-2 text-sm resize-none"
                          value={editDescription} onChange={e => setEditDescription(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setEditingPillarId(null)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                          style={{ background: '#F0EDE6', color: '#1A1A1A' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(pillar.id)}
                          disabled={updatingPillar}
                          className="gradient-button px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {updatingPillar ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex flex-col justify-between flex-1 space-y-3">
                      <div>
                        <h4 className="font-bold text-base leading-snug" style={{ color: '#1A1A1A' }}>{pillar.title}</h4>
                        {pillar.description && (
                          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: '#6B6558' }}>{pillar.description}</p>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid #E8E2D6' }}>
                        <span className={pillar.active_goals_count > 0 ? 'pill-green' : 'pill-neutral'}>
                          {pillar.active_goals_count} Active Goals
                        </span>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(pillar)}
                            className="p-2 rounded-lg transition-colors hover:bg-[#F0EDE6] text-muted cursor-pointer"
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

      {/* Pending Change Requests Section */}
      <div className="space-y-4 pt-6" style={{ borderTop: '1px solid #E8E2D6' }}>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4" style={{ color: '#1A1A1A', fontFamily: 'Clash Display, Inter, sans-serif' }}>
          <Users size={20} style={{ color: '#3B4B6B' }} />
          Pending Profile Change Requests
        </h2>

        {reviewMessage && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-semibold animate-stagger-1">
            {reviewMessage}
          </div>
        )}

        {pendingRequests.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ border: '2px dashed #E8E2D6', background: '#FFFFFF' }}>
            <p className="text-sm font-medium" style={{ color: '#6B6558' }}>No pending profile change requests for review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div key={req.id} className="card p-5 space-y-4 relative overflow-hidden" style={{ borderLeft: '4px solid #3B4B6B' }}>
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-[#1A1A1A]">
                      {req.requester_name} <span className="font-normal text-xs text-[#6B6558]">({req.requester_role})</span>
                    </p>
                    <p className="text-xs" style={{ color: '#6B6558' }}>
                      Requested change to <span className="font-bold uppercase font-mono">{req.field_name.replace('_', ' ')}</span>
                    </p>
                    <div className="flex items-center gap-2 text-xs pt-1.5 flex-wrap">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">Current: {req.current_value || 'None'}</span>
                      <span className="text-gray-400">→</span>
                      <span className="bg-[#EEF1F7] text-[#3B4B6B] px-2 py-0.5 rounded font-bold font-mono">Requested: {req.requested_value}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#6B6558] font-mono">
                    Submitted: {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>

                {rejectingRequestId === req.id ? (
                  <div className="p-3 bg-red-50/50 rounded-xl border border-red-200 space-y-3 animate-stagger-1">
                    <label className="block text-xs font-semibold text-red-800">Add an optional rejection reason:</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-red-200"
                      placeholder="e.g. Please enter your correct formal job title"
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setRejectingRequestId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-200 text-gray-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReviewRequest(req.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white cursor-pointer"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid #E8E2D6' }}>
                    <button
                      onClick={() => setRejectingRequestId(req.id)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleReviewRequest(req.id, 'approved')}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#3B4B6B] text-white hover:bg-[#5C7299] cursor-pointer transition-colors"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
