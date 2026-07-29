import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
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

  // If already logged in, redirect
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      // successful login, the AuthContext will pick it up
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
            <Target className="text-blue-400" size={28} />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Welcome to PulseOKR
          </h1>
          <p className="text-zinc-400 mt-2 text-sm text-center">
            Sign in to manage your goals and track team alignment.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@nimbustech.demo"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center mt-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
