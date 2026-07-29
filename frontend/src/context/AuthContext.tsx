import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // For now, still fetch from the local backend API or direct from Supabase
      // It's safer to fetch from the local API to ensure matching types, but we'll fetch from Supabase JS client directly for simplicity
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching user data:', error);
      } else if (data) {
        setCurrentUser(data as User);
      }
    } catch (err) {
      console.error('Failed to fetch user', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
