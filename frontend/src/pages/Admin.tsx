import React from 'react';
import { Settings, Shield, Building2 } from 'lucide-react';

export default function Admin() {
  return (
    <div className="space-y-8 font-sans animate-stagger-1">
      <div className="flex justify-between items-center flex-wrap gap-5">
        <div>
          <h1 style={{ fontSize: 40 }}>
            Admin <span className="gradient-text">Settings</span>
          </h1>
          <p className="mt-1 text-base" style={{ color: '#6B6558' }}>Configure company-wide strategic pillars and settings.</p>
        </div>
        <div className="icon-badge icon-badge-orange" style={{ width: 44, height: 44, borderRadius: 12 }}>
          <Settings size={22} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="card card-top-orange p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-orange"><Building2 size={18} /></div>
            <h3 className="text-lg font-bold" style={{ color: '#1A1A1A', fontFamily: 'Clash Display, Inter, sans-serif' }}>Strategic Pillars</h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#6B6558' }}>
            Pillar configuration options will go here. Admin management functionality is currently read-only for this demo profile.
          </p>
          <div className="pt-2">
            <span className="pill-orange">Coming Soon</span>
          </div>
        </div>

        <div className="card card-top-blue p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="icon-badge icon-badge-blue"><Shield size={18} /></div>
            <h3 className="text-lg font-bold" style={{ color: '#1A1A1A', fontFamily: 'Clash Display, Inter, sans-serif' }}>Role Management</h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#6B6558' }}>
            Manage user roles and access control. Assign managers, configure team hierarchies.
          </p>
          <div className="pt-2">
            <span className="pill-blue">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
