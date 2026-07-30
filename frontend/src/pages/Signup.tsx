import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Target, Loader2, AlertCircle } from 'lucide-react';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session } = useAuth();

  if (session) return <Navigate to="/dashboard" replace />;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, job_title: jobTitle, department })
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.detail || 'Signup failed. Please try again.');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: responseData.session.access_token,
        refresh_token: responseData.session.refresh_token
      });
      if (sessionError) throw new Error('Failed to set auth session: ' + sessionError.message);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Signup failed');
      setLoading(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12" style={{ background: 'linear-gradient(135deg, #F7F4EE 0%, #EDE9E0 100%)' }}>
      <div className="w-full max-w-md animate-stagger-1">
        <div className="card p-8 card-top-blue">
          <div className="flex flex-col items-center mb-7 animate-stagger-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-md" style={{ background: 'linear-gradient(135deg, #3B4B6B, #5C7299)' }}>
              <Target size={28} color="white" />
            </div>
            <h1 className="text-3xl text-center" style={{ fontSize: '28px' }}>
              Create an <span className="gradient-text">Account</span>
            </h1>
            <p className="mt-2 text-sm text-center" style={{ color: '#6B6558' }}>
              Sign up to PulseOKR to start tracking objectives and alignment.
            </p>
          </div>

          {error && (
            <div key={error} className="mb-5 p-3.5 rounded-xl flex items-start gap-3" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
              <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
              <p className="text-sm font-medium" style={{ color: '#B91C1C' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <Field label="Full Name">
              <input type="text" required className="w-full px-4 py-2.5 text-sm" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Rohan Verma" />
            </Field>
            <Field label="Email">
              <input type="email" required className="w-full px-4 py-2.5 text-sm" value={email} onChange={e => setEmail(e.target.value)} placeholder="rohan@nimbustech.demo" />
            </Field>
            <Field label="Password">
              <input type="password" required minLength={6} className="w-full px-4 py-2.5 text-sm" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            <Field label="Job Title">
              <input type="text" required className="w-full px-4 py-2.5 text-sm" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Software Engineer" />
            </Field>
            <Field label="Department">
              <input type="text" required className="w-full px-4 py-2.5 text-sm" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Engineering" />
            </Field>

            <button
              type="submit" disabled={loading}
              className="w-full gradient-button font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
            </button>
          </form>

          <p className="text-sm text-center mt-5" style={{ color: '#6B6558' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold" style={{ color: '#B5651D' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
