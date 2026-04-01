"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  ClipboardList, 
  Users, 
  Settings, 
  LogOut, 
  Bell,
  Heart,
  User
} from 'lucide-react';
import NotificationDropdown from '@/components/dashboard/NotificationDropdown';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const getMenuItems = (role: string) => {
    const common = [
      { name: 'Overview', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
      { name: 'Profile', icon: <User size={20} />, path: '/dashboard/profile' },
      { name: 'Settings', icon: <Settings size={20} />, path: '/dashboard/settings' },
    ];

    switch (role) {
      case 'patient':
        return [
          ...common,
          { name: 'Appointments', icon: <Calendar size={20} />, path: '/dashboard/appointments' },
          { name: 'Medical Records', icon: <FileText size={20} />, path: '/dashboard/records' },
          { name: 'Prescriptions', icon: <ClipboardList size={20} />, path: '/dashboard/prescriptions' },
        ];
      case 'doctor':
        return [
          { name: 'Clinical Overview', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
          { name: 'Patient List', icon: <Users size={20} />, path: '/dashboard/patients' },
          ...common.slice(1),
        ];
      case 'pharmacy':
        return [
          ...common,
          { name: 'Prescription Queue', icon: <ClipboardList size={20} />, path: '/dashboard/queue' },
          { name: 'Inventory', icon: <LayoutDashboard size={20} />, path: '/dashboard/inventory' },
        ];
      case 'lab':
        return [
          ...common,
          { name: 'Test Worklist', icon: <FileText size={20} />, path: '/dashboard/worklist' },
          { name: 'Lab Reports', icon: <ClipboardList size={20} />, path: '/dashboard/reports' },
        ];
      case 'admin':
        return [
          { name: 'System Status', icon: <Settings size={20} />, path: '/dashboard' },
          { name: 'App Management', icon: <LayoutDashboard size={20} />, path: '/dashboard/apps' },
          { name: 'User Control', icon: <Users size={20} />, path: '/dashboard/users' },
          ...common.slice(1),
        ];
      default:
        return common;
    }
  };

  const menuItems = user ? getMenuItems(user.role) : [];

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside className="glass" style={{ 
        width: '280px', 
        margin: '20px', 
        display: 'flex', 
        flexDirection: 'column',
        padding: '30px 20px',
        position: 'fixed',
        height: 'calc(100vh - 40px)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 10px' }}>
          <Heart size={28} color="var(--primary)" fill="var(--primary)" className="float" />
          <span style={{ fontSize: '20px', fontWeight: '800' }}>My<span className="gradient-text">Heart</span></span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                color: pathname === item.path ? 'white' : 'rgba(255,255,255,0.6)',
                background: pathname === item.path ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                transition: 'all 0.2s ease',
                fontWeight: pathname === item.path ? '600' : '400',
                border: pathname === item.path ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (pathname !== item.path) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                if (pathname !== item.path) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ color: pathname === item.path ? 'var(--primary)' : 'inherit' }}>{item.icon}</div>
              {item.name}
            </Link>
          ))}
        </nav>

        <button 
          onClick={handleLogout}
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            color: '#ef4444',
            opacity: 0.8,
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
        >
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '320px', padding: '40px 40px 40px 0' }}>
        {/* Top Header */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '40px',
          padding: '0 20px'
        }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: '800' }}>
              Welcome back, <span className="gradient-text">{user.first_name}</span>
            </h2>
            <p style={{ opacity: 0.5, fontSize: '14px' }}>Here is what's happening today in your health portal.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <NotificationDropdown />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '14px', fontWeight: '700' }}>{user.first_name} {user.last_name}</p>
                <p style={{ fontSize: '12px', opacity: 0.5 }}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
              </div>
              <div className="glass" style={{ 
                width: '45px', 
                height: '45px', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                fontWeight: '800',
                fontSize: '18px'
              }}>
                {user.first_name[0]}{user.last_name[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
