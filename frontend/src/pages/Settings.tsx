import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, Loader2, RefreshCw, Send, Settings as SettingsIcon, User, Mail, Briefcase, Network } from 'lucide-react';

interface ChangeRequest {
  id: string;
  field_name: string;
  current_value: string | null;
  requested_value: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_note: string | null;
  created_at: string;
}

export default function Settings() {
  const { currentUser, session } = useAuth();
  
  // Data loading states
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline forms state
  const [activeEditField, setActiveEditField] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchRequestHistory = async () => {
    if (!currentUser || !session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/profile/change-requests?user_id=${currentUser.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) {
        // If table doesn't exist yet, just show empty state
        setRequests([]);
        return;
      }
      const data = await res.json();
      setRequests(data);
    } catch (err: any) {
      console.error('Settings fetch error:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestHistory();
  }, [currentUser?.id, session?.access_token]);

  const handleSubmitRequest = async (fieldName: string) => {
    if (!newValue.trim() || !session) return;
    setSubmittingRequest(true);
    setSuccessMessage(null);
    try {
      const res = await fetch('http://localhost:8000/api/profile/change-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          field_name: fieldName,
          requested_value: newValue
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to submit request');
      }

      setSuccessMessage('Change request submitted successfully!');
      setNewValue('');
      setActiveEditField(null);
      fetchRequestHistory(); // Refresh history list
      
      // Auto dismiss success alert
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'full_name': return 'Full Name';
      case 'email': return 'Email Address';
      case 'job_title': return 'Job Title';
      case 'department': return 'Department';
      default: return field;
    }
  };

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'full_name': return <User size={18} className="text-[#6B6558]" />;
      case 'email': return <Mail size={18} className="text-[#6B6558]" />;
      case 'job_title': return <Briefcase size={18} className="text-[#6B6558]" />;
      case 'department': return <Network size={18} className="text-[#6B6558]" />;
      default: return <User size={18} className="text-[#6B6558]" />;
    }
  };

  const profileFields = [
    { key: 'full_name', value: currentUser?.full_name || 'Not Available' },
    { key: 'email', value: session?.user?.email || 'Not Available' },
    { key: 'job_title', value: currentUser?.job_title || 'Not Assigned' },
    { key: 'department', value: currentUser?.department || 'Not Assigned' }
  ];

  if (loading) return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 style={{ fontSize: 40 }}>Profile <span className="gradient-text">Settings</span></h1>
        <p className="mt-1 text-base" style={{ color: '#6B6558' }}>Loading settings and requests history...</p>
      </div>
      <div className="flex justify-center items-center py-20">
        <Loader2 size={36} className="animate-spin" style={{ color: '#3B4B6B' }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-12 max-w-3xl mx-auto font-sans animate-stagger-1">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 40 }}>
          Profile <span className="gradient-text">Settings</span>
        </h1>
        <p className="mt-1 text-base" style={{ color: '#6B6558' }}>
          View your profile details and submit requests for formal profile changes.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] rounded-xl text-sm font-semibold flex items-center gap-2.5 animate-stagger-1">
          <Check size={16} />
          {successMessage}
        </div>
      )}

      {/* Profile Details Card */}
      <div className="card p-6 space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2 pb-3" style={{ color: '#1A1A1A', borderBottom: '1px solid #E8E2D6', fontFamily: 'Clash Display, Inter, sans-serif' }}>
          <SettingsIcon size={20} style={{ color: '#3B4B6B' }} />
          Current Profile Information
        </h2>

        <div className="divide-y divide-[#E8E2D6]">
          {profileFields.map((field) => {
            const isEditing = activeEditField === field.key;
            return (
              <div key={field.key} className="py-4 first:pt-0 last:pb-0 space-y-3">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    {getFieldIcon(field.key)}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6558' }}>
                        {getFieldLabel(field.key)}
                      </p>
                      <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">
                        {field.value}
                      </p>
                    </div>
                  </div>
                  
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setActiveEditField(field.key);
                        setNewValue(field.value);
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-[#E8E2D6] text-[#6B6558] hover:bg-[#F7F4EE] hover:text-[#3B4B6B] transition-all cursor-pointer"
                    >
                      Request Change
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="p-4 bg-[#F7F4EE]/50 border border-[#E8E2D6] rounded-xl space-y-3 animate-stagger-1">
                    <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#6B6558' }}>
                      Enter requested value for {getFieldLabel(field.key)}:
                    </label>
                    <input
                      type={field.key === 'email' ? 'email' : 'text'}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E8E2D6]"
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      required
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setActiveEditField(null);
                          setNewValue('');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-200 text-gray-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmitRequest(field.key)}
                        disabled={submittingRequest || !newValue.trim() || newValue === field.value}
                        className="gradient-button px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        {submittingRequest ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Submit Request
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Requests History list */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1A1A1A', fontFamily: 'Clash Display, Inter, sans-serif' }}>
          <RefreshCw size={20} style={{ color: '#3B4B6B' }} />
          My Pending & Past Requests
        </h2>

        {requests.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ border: '2px dashed #E8E2D6', background: '#FFFFFF' }}>
            <p className="text-sm font-medium" style={{ color: '#6B6558' }}>
              No profile change requests submitted yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const statusPills: Record<string, string> = {
                pending: 'pill-orange', // Slate blue tinted
                approved: 'pill-green',
                rejected: 'bg-red-50 text-red-700 border border-red-200'
              };

              return (
                <div key={req.id} className="card p-5 space-y-3 relative overflow-hidden" style={{ borderLeft: '4px solid #3B4B6B' }}>
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: '#6B6558' }}>
                      {getFieldLabel(req.field_name)} Change Request
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusPills[req.status] || 'pill-neutral'}`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs pt-1.5 flex-wrap">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">Current: {req.current_value || 'None'}</span>
                    <span className="text-gray-400">→</span>
                    <span className="bg-[#EEF1F7] text-[#3B4B6B] px-2 py-0.5 rounded font-bold font-mono">Requested: {req.requested_value}</span>
                  </div>

                  {req.reviewer_note && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs leading-relaxed" style={{ color: '#6B6558' }}>
                      <span className="font-bold text-xs block text-[#1A1A1A] mb-0.5">Reviewer Note:</span>
                      "{req.reviewer_note}"
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-center text-[10px] font-mono" style={{ color: '#6B6558', borderTop: '1px solid #E8E2D6' }}>
                    <span>Submitted: {new Date(req.created_at).toLocaleDateString()}</span>
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
