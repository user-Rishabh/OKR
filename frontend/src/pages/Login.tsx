import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Target, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session } = useAuth();

  if (session) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setError(signInError.message); setLoading(false); }
    else navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F7F4EE 0%, #EDE9E0 100%)' }}>
      <div className="w-full max-w-md animate-stagger-1">
        {/* Card */}
        <div className="card p-8 card-top-orange">
          {/* Header */}
          <div className="flex flex-col items-center mb-8 animate-stagger-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-md" style={{ background: 'linear-gradient(135deg, #3B4B6B, #5C7299)' }}>
              <Target size={28} color="white" />
            </div>
            <h1 className="text-3xl text-center" style={{ fontSize: '28px' }}>
              Welcome to{' '}
              <span className="gradient-text">PulseOKR</span>
            </h1>
            <p className="mt-2 text-sm text-center" style={{ color: '#6B6558' }}>
              Sign in to manage your goals and track team alignment.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div key={error} className="mb-5 p-3.5 rounded-xl flex items-start gap-3 animate-stagger-1" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
              <AlertCircle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
              <p className="text-sm font-medium" style={{ color: '#B91C1C' }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="animate-stagger-3">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>Email Address</label>
              <input
                type="email" required
                className="w-full px-4 py-2.5 text-sm"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@nimbustech.demo"
              />
            </div>

            <div className="animate-stagger-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6558' }}>Password</label>
              <input
                type="password" required
                className="w-full px-4 py-2.5 text-sm"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-button font-bold py-3 rounded-xl flex items-center justify-center gap-2 mt-2 animate-stagger-5 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-center mt-6 animate-stagger-5" style={{ color: '#6B6558' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold transition-colors" style={{ color: '#B5651D' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
