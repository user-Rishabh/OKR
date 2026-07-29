import React from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { LogOut } from 'lucide-react'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', roles: ['employee', 'manager', 'admin'] },
    { name: 'Team', path: '/team', roles: ['manager', 'admin'] },
    { name: 'Admin', path: '/admin', roles: ['admin', 'manager'] },
  ].filter(item => !currentUser || item.roles.includes(currentUser.role))

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                PulseOKR
              </span>
              <nav className="hidden md:flex gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname.startsWith(item.path)
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-medium">
                {currentUser?.job_title?.charAt(0) || 'U'}
              </div>
              <button 
                onClick={handleSignOut}
                className="text-zinc-400 hover:text-white p-1.5 rounded-md hover:bg-zinc-800/50 transition-colors"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
