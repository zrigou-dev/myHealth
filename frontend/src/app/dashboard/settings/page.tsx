"use client";

import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Eye, 
  Globe, 
  Palette,
  ChevronRight,
  Save,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');

  const tabs = [
    { id: 'account', label: 'Account', icon: <User size={18} /> },
    { id: 'security', label: 'Security', icon: <Lock size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield size={18} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px' }}>Settings</h1>
        <p style={{ opacity: 0.6 }}>Manage your account preferences and system configuration.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '40px' }}>
        {/* Navigation Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="glass"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 20px',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                border: activeTab === tab.id ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.6)',
                fontWeight: activeTab === tab.id ? '700' : '400',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ color: activeTab === tab.id ? 'var(--primary)' : 'inherit' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass" 
          style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800' }}>{tabs.find(t => t.id === activeTab)?.label} Settings</h2>
            <button className="btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} /> Save Changes
            </button>
          </div>

          <div style={{ height: '1px', background: 'var(--glass-border)' }} />

          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <SettingField label="Language" value="English (United States)" icon={<Globe size={18} />} />
              <SettingField label="Time Zone" value="UTC-05:00 Eastern Time" icon={<Clock size={18} />} />
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontWeight: '700', color: '#ef4444', marginBottom: '10px' }}>Danger Zone</h4>
                <p style={{ fontSize: '14px', opacity: 0.5, marginBottom: '20px' }}>Once you delete your account, there is no going back. Please be certain.</p>
                <button style={{ border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '700' }}>
                  Deactivate Account
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'account' && (
            <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
              <Settings size={48} style={{ margin: '0 auto 20px', opacity: 0.2 }} />
              <p>Advanced {activeTab} preferences will be available in the next system update.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function SettingField({ label, value, icon }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ opacity: 0.4 }}>{icon}</div>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '700', opacity: 0.4, textTransform: 'uppercase' }}>{label}</p>
          <p style={{ fontWeight: '600' }}>{value}</p>
        </div>
      </div>
      <ChevronRight size={18} opacity={0.3} />
    </div>
  );
}
