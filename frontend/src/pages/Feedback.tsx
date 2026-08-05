import React, { useState, useEffect } from 'react';
import { API_URL } from "../config";
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  Send, 
  User, 
  Users, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  RefreshCw, 
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import type { User as UserType } from '../types';

interface FeedbackEntry {
  id: string;
  subject_user_id: string;
  author_user_id: string | null;
  author_name: string;
  feedback_type: 'self' | 'peer' | 'manager';
  cycle: string;
  content_text: string;
  created_at: string;
}

interface FeedbackSummary {
  id: string;
  subject_user_id: string;
  cycle: string;
  strengths: string;
  improvement_areas: string;
  recurring_themes: string;
  overall_tone: string;
  source_entry_count: number;
  generated_at: string;
}

export default function Feedback() {
  const { currentUser, session } = useAuth();
  
  // Navigation tabs for Managers/Admins
  const [activeTab, setActiveTab] = useState<'my-feedback' | 'team-feedback'>('my-feedback');
  
  // Data lists
  const [users, setUsers] = useState<UserType[]>([]);
  const [myFeedbackReceived, setMyFeedbackReceived] = useState<FeedbackEntry[]>([]);
  const [mySummary, setMySummary] = useState<FeedbackSummary | null>(null);
  
  // Form state
  const [submitTargetId, setSubmitTargetId] = useState<string>('');
  const [submitContent, setSubmitContent] = useState<string>('');
  const [submitCycle, setSubmitCycle] = useState<string>('Q3-2026');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Manager View state
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [reportFeedbackEntries, setReportFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [reportSummary, setReportSummary] = useState<FeedbackSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // General Loading/Errors
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [loadingMyFeedback, setLoadingMyFeedback] = useState<boolean>(true);
  const [loadingReportFeedback, setLoadingReportFeedback] = useState<boolean>(false);
  const [globalCycle, setGlobalCycle] = useState<string>('Q3-2026');

  const isManagerOrAdmin = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  // 1. Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!session) return;
      try {
        const res = await fetch(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [session]);

  // 2. Fetch My Feedback & My Summary
  const fetchMyFeedbackData = async () => {
    if (!currentUser || !session) return;
    setLoadingMyFeedback(true);
    try {
      // Fetch entries about me
      const resEntries = await fetch(
        `${API_URL}/api/feedback?subject_user_id=${currentUser.id}&cycle=${globalCycle}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (resEntries.ok) {
        const entriesData = await resEntries.json();
        setMyFeedbackReceived(entriesData);
      } else {
        setMyFeedbackReceived([]);
      }

      // Fetch summary about me
      const resSummary = await fetch(
        `${API_URL}/api/feedback/summary?subject_user_id=${currentUser.id}&cycle=${globalCycle}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (resSummary.ok) {
        const summaryData = await resSummary.json();
        setMySummary(summaryData);
      } else {
        setMySummary(null);
      }
    } catch (err) {
      console.error('Failed to load my feedback data:', err);
    } finally {
      setLoadingMyFeedback(false);
    }
  };

  useEffect(() => {
    fetchMyFeedbackData();
  }, [currentUser?.id, session?.access_token, globalCycle]);

  // 3. Fetch Selected Report Feedback & Summary
  const fetchReportData = async (reportId: string) => {
    if (!session || !reportId) return;
    setLoadingReportFeedback(true);
    setGenerationError(null);
    try {
      // Fetch entries about selected report
      const resEntries = await fetch(
        `${API_URL}/api/feedback?subject_user_id=${reportId}&cycle=${globalCycle}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (resEntries.ok) {
        const entriesData = await resEntries.json();
        setReportFeedbackEntries(entriesData);
      } else {
        setReportFeedbackEntries([]);
      }

      // Fetch summary about selected report
      const resSummary = await fetch(
        `${API_URL}/api/feedback/summary?subject_user_id=${reportId}&cycle=${globalCycle}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (resSummary.ok) {
        const summaryData = await resSummary.json();
        setReportSummary(summaryData);
      } else {
        setReportSummary(null);
      }
    } catch (err) {
      console.error('Failed to load report feedback data:', err);
    } finally {
      setLoadingReportFeedback(false);
    }
  };

  useEffect(() => {
    if (selectedReportId) {
      fetchReportData(selectedReportId);
    } else {
      setReportFeedbackEntries([]);
      setReportSummary(null);
    }
  }, [selectedReportId, globalCycle]);

  // 4. Handle Feedback Submission
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !submitTargetId || !submitContent.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    const isSelf = submitTargetId === currentUser?.id;
    const isManagerOrAdminUser = currentUser?.role === 'admin' || 
      (currentUser?.role === 'manager' && users.find(u => u.id === submitTargetId)?.team_id === currentUser?.team_id);
    
    // Auto-resolve feedback_type
    const feedbackType = isSelf ? 'self' : (isManagerOrAdminUser ? 'manager' : 'peer');

    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject_user_id: submitTargetId,
          feedback_type: feedbackType,
          cycle: submitCycle,
          content_text: submitContent
        })
      });

      if (res.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Feedback submitted successfully!'
        });
        setSubmitContent('');
        // Refresh feedback if submitted about self
        if (isSelf) {
          fetchMyFeedbackData();
        }
        // Refresh feedback if submitted about currently viewed report
        if (submitTargetId === selectedReportId) {
          fetchReportData(selectedReportId);
        }
      } else {
        const errData = await res.json();
        setSubmitStatus({
          type: 'error',
          message: errData.detail || 'Failed to submit feedback. Check your permissions.'
        });
      }
    } catch (err) {
      setSubmitStatus({
        type: 'error',
        message: 'A network error occurred while submitting feedback.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Handle AI Summary Generation
  const handleGenerateSummary = async () => {
    if (!session || !selectedReportId) return;

    setIsGeneratingSummary(true);
    setGenerationError(null);

    try {
      const res = await fetch(`${API_URL}/api/feedback/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject_user_id: selectedReportId,
          cycle: globalCycle
        })
      });

      if (res.ok) {
        const summaryData = await res.json();
        setReportSummary(summaryData);
        // Refresh report feedback entries too just in case
        fetchReportData(selectedReportId);
      } else {
        const errData = await res.json();
        setGenerationError(errData.detail || 'Failed to generate AI summary.');
      }
    } catch (err) {
      setGenerationError('A network error occurred while generating the summary.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Filter lists
  // Teammates for "Give Feedback" form:
  // Same team, excluding self. If user has no team, list everyone else.
  const teammateOptions = users.filter(u => {
    if (u.id === currentUser?.id) return false;
    if (currentUser?.team_id) {
      return u.team_id === currentUser.team_id;
    }
    return true; // fallback to all users if no team
  });

  // Direct reports or company employees for manager selector
  const reportOptions = users.filter(u => {
    if (currentUser?.role === 'admin') {
      return true; // admin can view everyone including themselves
    }
    if (currentUser?.role === 'manager') {
      return u.team_id === currentUser.team_id && u.role === 'employee'; // manager views their team employees
    }
    return false;
  });

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#E8E2D6] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3" style={{ color: '#1A1A1A' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#3B4B6B] to-[#5C7299]">
              <MessageSquare size={20} color="white" />
            </div>
            Performance Feedback
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B6558' }}>
            Submit evaluations, view constructive teammate advice, and review AI-powered summary insights.
          </p>
        </div>

        {/* Cycle selector */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B6558]">Cycle:</label>
          <select 
            value={globalCycle}
            onChange={(e) => {
              setGlobalCycle(e.target.value);
              setSubmitCycle(e.target.value);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#E8E2D6] rounded-xl cursor-pointer"
          >
            <option value="Q3-2026">Q3-2026</option>
            <option value="Q4-2026">Q4-2026</option>
            <option value="Q1-2027">Q1-2027</option>
          </select>
        </div>
      </div>

      {/* ── Role Tab Toggle (Manager/Admin only) ── */}
      {isManagerOrAdmin && (
        <div className="flex gap-2 p-1.5 bg-[#F0EDE6] rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('my-feedback')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'my-feedback' 
                ? 'bg-white shadow-sm text-[#3B4B6B]' 
                : 'text-[#6B6558] hover:text-[#3B4B6B]'
            }`}
          >
            <User size={16} />
            My Feedback
          </button>
          <button
            onClick={() => setActiveTab('team-feedback')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'team-feedback' 
                ? 'bg-white shadow-sm text-[#3B4B6B]' 
                : 'text-[#6B6558] hover:text-[#3B4B6B]'
            }`}
          >
            <Users size={16} />
            Team Feedback
          </button>
        </div>
      )}

      {/* ── Tab Content: MY FEEDBACK (Available to Everyone) ── */}
      {(!isManagerOrAdmin || activeTab === 'my-feedback') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Give Feedback Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card bg-white p-6 rounded-2xl border border-[#E8E2D6] shadow-sm">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4" style={{ color: '#1A1A1A' }}>
                <Send size={18} className="text-[#3B4B6B]" />
                Give Feedback
              </h2>
              
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>
                    Select Teammate
                  </label>
                  <select
                    required
                    value={submitTargetId}
                    onChange={(e) => setSubmitTargetId(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#F7F4EE] border border-[#E8E2D6] rounded-xl focus:border-[#3B4B6B] focus:ring-0 cursor-pointer"
                  >
                    <option value="">-- Choose Person --</option>
                    <option value={currentUser?.id}>Myself (Self evaluation)</option>
                    {teammateOptions.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.job_title})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>
                    Constructive Feedback
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={submitContent}
                    onChange={(e) => setSubmitContent(e.target.value)}
                    placeholder="Provide specific feedback, strengths, and areas for improvement..."
                    className="w-full px-4 py-2.5 text-sm bg-[#F7F4EE] border border-[#E8E2D6] rounded-xl focus:border-[#3B4B6B] focus:ring-0"
                  />
                </div>

                {submitStatus && (
                  <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2 ${
                    submitStatus.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {submitStatus.type === 'success' ? (
                      <CheckCircle size={16} className="flex-shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="flex-shrink-0 text-red-600 mt-0.5" />
                    )}
                    <span>{submitStatus.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !submitTargetId || !submitContent.trim()}
                  className="w-full gradient-button py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Feedback
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Feedback About Me & AI Summary */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* AI Summary Section */}
            <div className="card bg-white p-6 rounded-2xl border border-[#E8E2D6] shadow-sm relative overflow-hidden">
              {/* Slate blue decorative top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#3B4B6B] to-[#5C7299]" />
              
              <div className="flex items-center justify-between flex-wrap gap-2 mb-6 mt-1">
                <h2 className="text-xl font-bold flex items-center gap-2.5" style={{ color: '#1A1A1A' }}>
                  <Sparkles size={20} className="text-[#3B4B6B]" />
                  AI Performance Feedback Summary
                </h2>
                {mySummary && (
                  <span className="text-[10px] font-bold font-mono px-2 py-1 bg-[#F0EDE6] rounded text-[#6B6558]">
                    Generated from {mySummary.source_entry_count} entries
                  </span>
                )}
              </div>

              {loadingMyFeedback ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 size={32} className="animate-spin text-[#3B4B6B] mb-2" />
                  <p className="text-sm text-[#6B6558]">Loading your summary details...</p>
                </div>
              ) : mySummary ? (
                <div className="space-y-6">
                  {/* Overall Tone Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-[#3B4B6B]/5 to-[#5C7299]/5 border-l-4 border-[#3B4B6B]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#3B4B6B] mb-1">Overall Assessment</h4>
                    <p className="text-sm font-semibold italic text-[#1A1A1A] leading-relaxed">
                      "{mySummary.overall_tone}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {/* Strengths */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Strengths
                      </h4>
                      <div className="text-xs text-[#1A1A1A] prose prose-sm max-w-none leading-relaxed whitespace-pre-line pl-3">
                        {mySummary.strengths}
                      </div>
                    </div>

                    {/* Areas for Improvement */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Focus Areas
                      </h4>
                      <div className="text-xs text-[#1A1A1A] prose prose-sm max-w-none leading-relaxed whitespace-pre-line pl-3">
                        {mySummary.improvement_areas}
                      </div>
                    </div>

                    {/* Recurring Themes */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#3B4B6B] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B4B6B]" />
                        Key Themes
                      </h4>
                      <div className="text-xs text-[#1A1A1A] prose prose-sm max-w-none leading-relaxed whitespace-pre-line pl-3">
                        {mySummary.recurring_themes}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-8 bg-[#F7F4EE] border border-[#E8E2D6] text-center">
                  <FileText size={36} className="text-[#A89F92] mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-[#1A1A1A]">No AI Summary Available</h4>
                  <p className="text-xs text-[#6B6558] mt-1 max-w-md mx-auto">
                    Your manager has not generated a performance feedback summary for this cycle yet. Share this page link or check back after your reviews are completed.
                  </p>
                </div>
              )}
            </div>

            {/* List of Feedback Entries Received */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
                Feedback Entries Received
              </h3>

              {loadingMyFeedback ? (
                <div className="space-y-3">
                  <div className="h-24 bg-white rounded-2xl animate-pulse border border-[#E8E2D6]" />
                  <div className="h-24 bg-white rounded-2xl animate-pulse border border-[#E8E2D6]" />
                </div>
              ) : myFeedbackReceived.length === 0 ? (
                <div className="rounded-xl p-8 bg-white border border-[#E8E2D6] text-center shadow-sm">
                  <MessageSquare size={36} className="text-[#A89F92] mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[#1A1A1A]">No feedback entries received yet.</p>
                  <p className="text-xs text-[#6B6558] mt-1">Be the first to ask your teammates for feedback!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myFeedbackReceived.map((entry, index) => {
                    const isSelf = entry.feedback_type === 'self';
                    const isManager = entry.feedback_type === 'manager';
                    const isPeer = entry.feedback_type === 'peer';

                    // Anonymize peer index labeling
                    const displayTitle = isSelf 
                      ? 'Self Evaluation' 
                      : (isManager ? `Manager Feedback (${entry.author_name})` : `Peer Feedback #${index + 1}`);

                    return (
                      <div 
                        key={entry.id} 
                        className="card bg-white p-5 rounded-2xl border border-[#E8E2D6] shadow-sm space-y-2.5"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-bold text-sm text-[#1A1A1A]">{displayTitle}</h4>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isSelf ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            isManager ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}>
                            {entry.feedback_type}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B6558] leading-relaxed whitespace-pre-line">
                          {entry.content_text}
                        </p>
                        <div className="flex justify-end">
                          <span className="text-[10px] font-mono text-[#A89F92]">
                            Submitted: {new Date(entry.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ── Tab Content: TEAM FEEDBACK (Manager / Admin Only) ── */}
      {isManagerOrAdmin && activeTab === 'team-feedback' && (
        <div className="space-y-8">
          <div className="card bg-white p-6 rounded-2xl border border-[#E8E2D6] shadow-sm">
            <div className="max-w-md space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#6B6558' }}>
                Select Team Member
              </label>
              <select
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-[#F7F4EE] border border-[#E8E2D6] rounded-xl focus:border-[#3B4B6B] focus:ring-0 cursor-pointer"
              >
                <option value="">-- Choose Member --</option>
                {reportOptions.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.job_title})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#6B6558]">
                {currentUser?.role === 'admin' 
                  ? 'Showing all registered employees.' 
                  : 'Showing employees assigned to your engineering team.'}
              </p>
            </div>
          </div>

          {selectedReportId ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Direct Report Feedback Summary */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* AI Summary Generation Card */}
                <div className="card bg-white p-6 rounded-2xl border border-[#E8E2D6] shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#3B4B6B] to-[#5C7299]" />
                  
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-6 mt-1">
                    <h2 className="text-xl font-bold flex items-center gap-2.5" style={{ color: '#1A1A1A' }}>
                      <Sparkles size={20} className="text-[#3B4B6B]" />
                      AI Performance Feedback Summary
                    </h2>
                    
                    <button
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary || reportFeedbackEntries.length < 2}
                      className="gradient-button px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      {isGeneratingSummary ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Summarizing...
                        </>
                      ) : reportSummary ? (
                        <>
                          <RefreshCw size={12} />
                          Regenerate Summary
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          Generate AI Summary
                        </>
                      )}
                    </button>
                  </div>

                  {/* Summary content */}
                  {loadingReportFeedback ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                      <Loader2 size={32} className="animate-spin text-[#3B4B6B] mb-2" />
                      <p className="text-sm text-[#6B6558]">Loading report details...</p>
                    </div>
                  ) : reportSummary ? (
                    <div className="space-y-6">
                      {/* Overall Tone Banner */}
                      <div className="p-4 rounded-xl bg-[#F7F4EE] border-l-4 border-[#3B4B6B]">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#3B4B6B] mb-1">Overall Assessment</h4>
                        <p className="text-sm font-semibold italic text-[#1A1A1A] leading-relaxed">
                          "{reportSummary.overall_tone}"
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                        {/* Strengths */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Strengths
                          </h4>
                          <div className="text-xs text-[#1A1A1A] prose prose-sm max-w-none leading-relaxed whitespace-pre-line pl-3">
                            {reportSummary.strengths}
                          </div>
                        </div>

                        {/* Areas for Improvement */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Focus Areas
                          </h4>
                          <div className="text-xs text-[#1A1A1A] prose prose-sm max-w-none leading-relaxed whitespace-pre-line pl-3">
                            {reportSummary.improvement_areas}
                          </div>
                        </div>

                        {/* Recurring Themes */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#3B4B6B] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3B4B6B]" />
                            Key Themes
                          </h4>
                          <div className="text-xs text-[#1A1A1A] prose prose-sm max-w-none leading-relaxed whitespace-pre-line pl-3">
                            {reportSummary.recurring_themes}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl p-8 bg-[#F7F4EE] border border-[#E8E2D6] text-center">
                      <FileText size={36} className="text-[#A89F92] mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-[#1A1A1A]">No AI Summary Generated</h4>
                      <p className="text-xs text-[#6B6558] mt-1 max-w-md mx-auto">
                        There is no active cached summary for this report. 
                        {reportFeedbackEntries.length >= 2 
                          ? " Click 'Generate AI Summary' above to compile a feedback report." 
                          : " Collect at least 2 feedback entries for this cycle to enable AI summarization."}
                      </p>
                      {reportFeedbackEntries.length < 2 && (
                        <div className="mt-4 p-2 bg-amber-50 text-amber-800 border border-amber-200 text-xs rounded-xl inline-flex items-center gap-1.5 mx-auto">
                          <AlertCircle size={14} className="text-amber-600" />
                          <span>Currently: {reportFeedbackEntries.length} / 2 entries collected.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {generationError && (
                    <div className="mt-4 p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <span>{generationError}</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: All Feedback Entries (Full Visibility) */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
                  All Submitted Feedback
                </h3>

                {loadingReportFeedback ? (
                  <div className="space-y-3">
                    <div className="h-24 bg-white rounded-2xl animate-pulse border border-[#E8E2D6]" />
                    <div className="h-24 bg-white rounded-2xl animate-pulse border border-[#E8E2D6]" />
                  </div>
                ) : reportFeedbackEntries.length === 0 ? (
                  <div className="rounded-xl p-8 bg-white border border-[#E8E2D6] text-center shadow-sm">
                    <MessageSquare size={36} className="text-[#A89F92] mx-auto mb-3" />
                    <p className="text-sm font-semibold text-[#1A1A1A]">No feedback submitted yet.</p>
                    <p className="text-xs text-[#6B6558] mt-1">Submit feedback as their manager or wait for peers to contribute.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reportFeedbackEntries.map((entry) => {
                      const isSelf = entry.feedback_type === 'self';
                      const isManager = entry.feedback_type === 'manager';
                      
                      return (
                        <div 
                          key={entry.id} 
                          className="card bg-white p-5 rounded-2xl border border-[#E8E2D6] shadow-sm space-y-2"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-bold text-xs text-[#1A1A1A] truncate" title={entry.author_name}>
                              {entry.author_name}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                              isSelf ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              isManager ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}>
                              {entry.feedback_type}
                            </span>
                          </div>
                          <p className="text-xs text-[#6B6558] leading-relaxed whitespace-pre-line">
                            {entry.content_text}
                          </p>
                          <div className="text-[9px] font-mono text-[#A89F92] text-right">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="card bg-white p-14 rounded-2xl border border-[#E8E2D6] text-center shadow-sm">
              <Users size={48} className="text-[#A89F92] mx-auto mb-4" />
              <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>Select a Teammate</h3>
              <p className="text-sm text-[#6B6558] mt-1 max-w-sm mx-auto">
                Choose one of your direct report team members from the list above to view their performance reviews and manage AI summaries.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
