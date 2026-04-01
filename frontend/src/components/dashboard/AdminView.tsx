"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Server, 
  Cpu, 
  Database,
  Users,
  AlertTriangle,
  Activity,
  BarChart
} from 'lucide-react';
import api from '@/services/api';

export default function AdminView() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [patientStats, doctorStats, apptStats] = await Promise.allSettled([
          api.get('/patients/stats'),
          api.get('/doctors/admin/stats'),
          api.get('/appointments/stats')
        ]);

        setStats({
          patients: patientStats.status === 'fulfilled' ? patientStats.value.data : null,
          doctors: doctorStats.status === 'fulfilled' ? doctorStats.value.data : null,
          appointments: apptStats.status === 'fulfilled' ? apptStats.value.data : null,
        });
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const services = [
    { name: 'Auth Service', status: 'Healthy', latency: '12ms', load: '14%' },
    { name: 'Patient Service', status: 'Healthy', latency: '45ms', load: '22%' },
    { name: 'Doctor Service', status: 'Healthy', latency: '32ms', load: '18%' },
    { name: 'API Gateway', status: 'Healthy', latency: '8ms', load: '8%' },
    { name: 'Kafka Broker', status: 'Healthy', latency: '2ms', load: '3%' },
  ];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Synchronizing system metrics...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* System Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <AdminStat icon={<Users />} label="Total Patients" value={stats.patients?.count || '0'} sub="Registered in system" />
        <AdminStat icon={<Activity />} label="Total Doctors" value={stats.doctors?.count || '0'} sub="Active practitioners" />
        <AdminStat icon={<ShieldCheck />} label="Total Appointments" value={stats.appointments?.total || '0'} sub="All time scheduled" />
        <AdminStat icon={<Server />} label="Active Services" value="12 / 12" sub="Infrastructure health" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
        {/* Service Health */}
        <div className="glass" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Infrastructure Health</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {services.map((s) => (
              <div key={s.name} style={{ 
                padding: '16px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: s.status === 'Healthy' ? '#10b981' : '#f59e0b',
                    boxShadow: s.status === 'Healthy' ? '0 0 10px #10b981' : '0 0 10px #f59e0b'
                  }} />
                  <p style={{ fontWeight: '600' }}>{s.name}</p>
                </div>
                <div style={{ display: 'flex', gap: '30px', fontSize: '13px', opacity: 0.6 }}>
                  <p>Latency: {s.latency}</p>
                  <p>Load: {s.load}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Management */}
        <div className="glass" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Active User Sessions</h3>
            <button className="glass" style={{ padding: '8px 16px', fontSize: '13px' }}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <UserRow name="Dr. Sarah Johnson" role="Doctor" status="Online" />
            <UserRow name="John Doe" role="Patient" status="Active" />
            <UserRow name="Pharmacy Central" role="Pharmacy" status="Idle" />
          </div>
        </div>

        {/* System Performance */}
        <div className="glass" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Global Performance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <MetricBar label="CPU Load" percent={45} />
            <MetricBar label="Memory Usage" percent={62} />
            <MetricBar label="Network IO" percent={28} />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserRow({ name, role, status }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px' }}>
      <div>
        <p style={{ fontWeight: '600', fontSize: '14px' }}>{name}</p>
        <p style={{ fontSize: '12px', opacity: 0.5 }}>{role}</p>
      </div>
      <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>{status}</span>
    </div>
  );
}

function MetricBar({ label, percent }: any) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', opacity: 0.7 }}>
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }} />
      </div>
    </div>
  );
}

function AdminStat({ icon, label, value, sub }: any) {
  return (
    <div className="glass" style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{ 
        width: '50px', 
        height: '50px', 
        background: 'rgba(255,255,255,0.03)', 
        borderRadius: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        margin: '0 auto 16px',
        color: 'var(--primary)'
      }}>
        {icon}
      </div>
      <p style={{ fontSize: '13px', opacity: 0.4, marginBottom: '4px' }}>{label}</p>
      <h3 style={{ fontSize: '26px', fontWeight: '800' }}>{value}</h3>
      <p style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px' }}>{sub}</p>
    </div>
  );
}

function AlertItem({ type, message, time }: any) {
  const colors = {
    warning: '#f59e0b',
    info: 'var(--primary)',
    success: '#10b981'
  };
  
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <AlertTriangle size={16} style={{ marginTop: '3px', color: (colors as any)[type] }} />
      <div>
        <p style={{ fontSize: '14px', fontWeight: '500' }}>{message}</p>
        <p style={{ fontSize: '12px', opacity: 0.4 }}>{time}</p>
      </div>
    </div>
  );
}
