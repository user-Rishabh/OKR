import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Target } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', roles: ['employee', 'manager', 'admin'] },
    { name: 'Team', path: '/team', roles: ['manager', 'admin'] },
    { name: 'Admin', path: '/admin', roles: ['admin', 'manager'] },
  ].filter(item => !currentUser || item.roles.includes(currentUser.role));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F4EE' }}>
      {/* Top navigation — white with warm bottom border */}
      <header style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E8E2D6' }} className="sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link to="/dashboard" className="flex items-center gap-2.5 font-display font-extrabold text-2xl tracking-tight" style={{ color: '#1A1A1A' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F2994A, #B5651D)' }}>
                  <Target size={18} color="white" />
                </div>
                <span>Pulse<span style={{ background: 'linear-gradient(135deg, #F2994A, #B5651D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OKR</span></span>
              </Link>

              {/* Nav links */}
              <nav className="hidden md:flex gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={isActive ? {
                        background: 'linear-gradient(135deg, rgba(242,153,74,0.12), rgba(181,101,29,0.12))',
                        color: '#B5651D',
                        border: '1px solid rgba(242,153,74,0.3)',
                      } : {
                        color: '#6B6558',
                        border: '1px solid transparent',
                      }}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right side: avatar + logout */}
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold font-mono"
                style={{ background: 'linear-gradient(135deg, #F2994A, #B5651D)', color: '#FFFFFF' }}
              >
                {currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              <span className="text-sm font-medium hidden sm:block" style={{ color: '#6B6558' }}>
                {currentUser?.full_name}
              </span>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg transition-colors cursor-pointer"
                style={{ color: '#6B6558' }}
                onMouseOver={e => (e.currentTarget.style.color = '#EF4444', e.currentTarget.style.background = '#FEF2F2')}
                onMouseOut={e => (e.currentTarget.style.color = '#6B6558', e.currentTarget.style.background = 'transparent')}
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-stagger-2">
        <Outlet />
      </main>
    </div>
  );
}
