import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Target, LayoutDashboard, Users, Settings, ChevronLeft, ChevronRight, Menu, X, Sparkles } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Navigation states
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'checkins'>('overview');

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', roles: ['employee', 'manager', 'admin'], icon: LayoutDashboard },
    { name: 'Team', path: '/team', roles: ['manager', 'admin'], icon: Users },
    { name: 'Admin', path: '/admin', roles: ['admin', 'manager'], icon: Settings },
  ].filter(item => !currentUser || item.roles.includes(currentUser.role));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isDashboardActive = location.pathname.startsWith('/dashboard');

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: '#F7F4EE' }}>
      
      {/* ── Mobile Top Bar ── */}
      <header className="md:hidden flex justify-between items-center px-4 h-14 bg-white border-b border-[#E8E2D6] sticky top-0 z-40 w-full flex-shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2 font-display font-extrabold text-base tracking-tight" style={{ color: '#1A1A1A' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#3B4B6B] to-[#5C7299]">
            <Target size={14} color="white" />
          </div>
          <span>Pulse<span style={{ background: 'linear-gradient(135deg, #3B4B6B, #5C7299)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OKR</span></span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-[#F7F4EE] text-[#6B6558] cursor-pointer">
          <Menu size={20} />
        </button>
      </header>

      {/* ── Mobile Off-Canvas Drawer Sidebar ── */}
      {mobileOpen && (
        <>
          {/* Backdrop Overlay */}
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 md:hidden" onClick={() => setMobileOpen(false)} />
          
          <aside className="fixed top-0 bottom-0 left-0 w-[260px] bg-white border-r border-[#E8E2D6] z-50 flex flex-col md:hidden shadow-2xl">
            {/* Logo Area */}
            <div className="p-4 flex items-center justify-between border-b border-[#E8E2D6] h-16 flex-shrink-0">
              <Link to="/dashboard" className="flex items-center gap-2.5 font-display font-extrabold text-lg tracking-tight" style={{ color: '#1A1A1A' }} onClick={() => setMobileOpen(false)}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#3B4B6B] to-[#5C7299]">
                  <Target size={18} color="white" />
                </div>
                <span>Pulse<span style={{ background: 'linear-gradient(135deg, #3B4B6B, #5C7299)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OKR</span></span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F7F4EE] text-[#6B6558] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-4 overflow-y-auto space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <div key={item.path} className="space-y-1">
                    <Link
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className="px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-3"
                      style={isActive ? {
                        background: 'linear-gradient(135deg, rgba(59,75,107,0.1), rgba(92,114,153,0.1))',
                        color: '#3B4B6B',
                        borderLeft: '3px solid #3B4B6B',
                      } : {
                        color: '#6B6558',
                        borderLeft: '3px solid transparent',
                      }}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>

                    {/* Sub-navigation */}
                    {item.name === 'Dashboard' && isActive && (
                      <div className="pl-7 pr-3 space-y-2 relative mt-1">
                        <div className="absolute left-6 top-1 bottom-1 w-0.5 bg-[#E8E2D6]" />
                        <div className="relative flex flex-col gap-2 py-1">
                          <div
                            className="absolute left-1 right-0 h-10 bg-gradient-to-r from-[#3B4B6B]/15 to-[#5C7299]/5 border-l-4 border-[#3B4B6B] rounded-r-lg transition-transform duration-200 ease-out pointer-events-none"
                            style={{
                              top: '4px',
                              transform: `translateY(${activeTab === 'overview' ? 0 : activeTab === 'goals' ? 48 : 96}px)`
                            }}
                          />
                          {(['overview', 'goals', 'checkins'] as const).map((tab) => {
                            const subLabel = tab === 'overview' ? 'Overview' : tab === 'goals' ? 'My Goals' : 'Check-ins';
                            const subIcon = tab === 'overview' ? LayoutDashboard : tab === 'goals' ? Target : Sparkles;
                            const isSubActive = activeTab === tab;
                            return (
                              <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setMobileOpen(false); }}
                                className={`w-full h-10 min-h-[40px] text-sm font-semibold transition-all cursor-pointer rounded-lg flex items-center justify-start pl-5 gap-2 relative ${isSubActive ? 'text-[#3B4B6B]' : 'text-[#6B6558] hover:text-[#3B4B6B] hover:bg-[#F7F4EE]/50'}`}
                              >
                                {React.createElement(subIcon, { size: 14 })}
                                <span>{subLabel}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Profile bottom section */}
            <div className="p-4 border-t border-[#E8E2D6] mt-auto flex-shrink-0 relative">
              <div className="flex items-center justify-between w-full">
                <div
                  onClick={() => setShowProfileMenu(prev => !prev)}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-[#F7F4EE] transition-colors cursor-pointer flex-1 min-w-0"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold font-mono bg-gradient-to-br from-[#3B4B6B] to-[#5C7299] text-white flex-shrink-0">
                    {currentUser?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-[#1A1A1A]" style={{ lineHeight: '1.2' }}>
                      {currentUser?.full_name}
                    </p>
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                      currentUser?.role === 'admin' ? 'bg-red-50 text-red-700 border border-red-200' :
                      currentUser?.role === 'manager' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Employee'}
                    </span>
                  </div>
                </div>
                <Link to="/settings" className="p-2 rounded-lg hover:bg-[#F7F4EE] text-[#6B6558] cursor-pointer" title="Profile Settings" onClick={() => setMobileOpen(false)}>
                  <Settings size={18} />
                </Link>
              </div>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute bottom-16 left-4 z-50 w-48 bg-white border border-[#E8E2D6] rounded-xl shadow-xl p-1.5">
                    <Link
                      to="/settings"
                      onClick={() => { setShowProfileMenu(false); setMobileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold rounded-lg hover:bg-[#F7F4EE] text-[#6B6558] cursor-pointer transition-colors"
                    >
                      <Settings size={16} />
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold rounded-lg hover:bg-red-50 hover:text-red-600 text-[#6B6558] cursor-pointer transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-45 bg-white border-r border-[#E8E2D6] transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        {/* Logo and Collapse Toggle */}
        {collapsed ? (
          <div className="p-4 flex items-center justify-center border-b border-[#E8E2D6] h-16 flex-shrink-0 relative">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#3B4B6B] to-[#5C7299]">
              <Target size={18} color="white" />
            </div>
            <button onClick={() => setCollapsed(false)} className="absolute -right-3 top-5 p-1 rounded-full bg-white border border-[#E8E2D6] text-[#6B6558] shadow-sm cursor-pointer z-50 hover:bg-[#F7F4EE] transition-colors">
              <ChevronRight size={12} />
            </button>
          </div>
        ) : (
          <div className="p-4 flex items-center justify-between border-b border-[#E8E2D6] h-16 flex-shrink-0">
            <Link to="/dashboard" className="flex items-center gap-2.5 font-display font-extrabold text-lg tracking-tight" style={{ color: '#1A1A1A' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#3B4B6B] to-[#5C7299]">
                <Target size={18} color="white" />
              </div>
              <span>Pulse<span style={{ background: 'gradient-to-br from-[#3B4B6B] to-[#5C7299]', color: '#3B4B6B' }}>OKR</span></span>
            </Link>
            <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg hover:bg-[#F7F4EE] text-[#6B6558] cursor-pointer transition-colors">
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 p-4 overflow-y-auto space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <div key={item.path} className="space-y-1">
                <div className="relative group">
                  <Link
                    to={item.path}
                    className="px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-3"
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(59,75,107,0.1), rgba(92,114,153,0.1))',
                      color: '#3B4B6B',
                      borderLeft: '3px solid #3B4B6B',
                    } : {
                      color: '#6B6558',
                      borderLeft: '3px solid transparent',
                    }}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                  {/* Collapsed Tooltip */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#1A1A1A] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg font-medium">
                      {item.name}
                    </div>
                  )}
                </div>

                {/* Indented Dashboard sub-navigation (PART 1 upgrades applied) */}
                {item.name === 'Dashboard' && isActive && (
                  <div className={`${collapsed ? 'pl-0' : 'pl-7'} pr-3 space-y-2 relative mt-1`}>
                    {!collapsed && (
                      <div className="absolute left-6 top-1 bottom-1 w-0.5 bg-[#E8E2D6]" />
                    )}

                    <div className="relative flex flex-col gap-2 py-1">
                      {/* Sliding active indicator */}
                      {!collapsed && (
                        <div
                          className="absolute left-1 right-0 h-10 bg-gradient-to-r from-[#3B4B6B]/15 to-[#5C7299]/5 border-l-4 border-[#3B4B6B] rounded-r-lg transition-transform duration-200 ease-out pointer-events-none"
                          style={{
                            top: '4px',
                            transform: `translateY(${activeTab === 'overview' ? 0 : activeTab === 'goals' ? 48 : 96}px)`
                          }}
                        />
                      )}

                      {(['overview', 'goals', 'checkins'] as const).map((tab) => {
                        const subLabel = tab === 'overview' ? 'Overview' : tab === 'goals' ? 'My Goals' : 'Check-ins';
                        const subIcon = tab === 'overview' ? LayoutDashboard : tab === 'goals' ? Target : Sparkles;
                        const isSubActive = activeTab === tab;
                        return (
                          <div key={tab} className="relative group/sub">
                            <button
                              onClick={() => setActiveTab(tab)}
                              className={`w-full h-10 min-h-[40px] text-sm font-semibold transition-all cursor-pointer rounded-lg flex items-center justify-start ${collapsed ? 'justify-center py-2.5' : 'pl-5 pr-4'} gap-2 ${isSubActive ? 'text-[#3B4B6B]' : 'text-[#6B6558] hover:text-[#3B4B6B] hover:bg-[#F7F4EE]/50'}`}
                            >
                              {collapsed ? (
                                <div className={`p-2 rounded-lg ${isSubActive ? 'bg-[#3B4B6B]/10 text-[#3B4B6B]' : ''}`}>
                                  {React.createElement(subIcon, { size: 16 })}
                                </div>
                              ) : (
                                <>
                                  {React.createElement(subIcon, { size: 14 })}
                                  <span>{subLabel}</span>
                                </>
                              )}
                            </button>
                            {/* Collapsed Sub Tooltip */}
                            {collapsed && (
                              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#1A1A1A] text-white text-xs rounded-lg opacity-0 group-hover/sub:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg font-medium">
                                {subLabel}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Profile Card and popover */}
        <div className="p-4 border-t border-[#E8E2D6] mt-auto flex-shrink-0 relative">
          <div className="flex items-center justify-between w-full gap-2">
            <div
              onClick={() => setShowProfileMenu(prev => !prev)}
              className={`flex items-center gap-3 p-1.5 rounded-xl hover:bg-[#F7F4EE] transition-colors cursor-pointer flex-1 min-w-0 ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold font-mono bg-gradient-to-br from-[#3B4B6B] to-[#5C7299] text-white flex-shrink-0 animate-pulse-subtle">
                {currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-[#1A1A1A]" style={{ lineHeight: '1.2' }}>
                    {currentUser?.full_name}
                  </p>
                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                    currentUser?.role === 'admin' ? 'bg-red-50 text-red-700 border border-red-200' :
                    currentUser?.role === 'manager' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Employee'}
                  </span>
                </div>
              )}
            </div>
            {!collapsed && (
              <Link to="/settings" className="p-2 rounded-lg hover:bg-[#F7F4EE] text-[#6B6558] cursor-pointer flex-shrink-0" title="Profile Settings">
                <Settings size={16} />
              </Link>
            )}
          </div>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className={`absolute bottom-16 ${collapsed ? 'left-14' : 'left-4'} z-50 w-48 bg-white border border-[#E8E2D6] rounded-xl shadow-xl p-1.5 animate-stagger-1`}>
                <Link
                  to="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold rounded-lg hover:bg-[#F7F4EE] text-[#6B6558] cursor-pointer transition-colors"
                >
                  <Settings size={16} />
                  Profile Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold rounded-lg hover:bg-red-50 hover:text-red-600 text-[#6B6558] cursor-pointer transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${collapsed ? 'md:pl-[72px]' : 'md:pl-[260px]'}`}
      >
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-stagger-2">
          <Outlet context={{ activeTab, setActiveTab }} />
        </main>
      </div>
    </div>
  );
}
