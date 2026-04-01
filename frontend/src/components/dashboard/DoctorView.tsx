"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, Clock, PlusCircle, Search, MoreVertical, Activity, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';

export default function DoctorView() {
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const [patientsRes, apptsRes, statsRes] = await Promise.allSettled([
          api.get('/doctors/patients'),
          api.get(`/appointments/doctors/${user.id}`),
          api.get('/doctors/admin/stats')
        ]);

        if (patientsRes.status === 'fulfilled') setPatients(Array.isArray(patientsRes.value.data) ? patientsRes.value.data : []);
        if (apptsRes.status === 'fulfilled') setAppointments(apptsRes.value.data.appointments || []);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      } catch (err) {
        console.error('Error fetching doctor data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div style={{ height: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <Activity size={40} className="floating-icon" color="var(--primary)" />
      <p style={{ opacity: 0.8, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '13px', fontWeight: '800' }}>Initializing Clinical Desk</p>
    </div>
  );

  const displayStats = [
    { icon: <Calendar size={24} color="var(--primary)" />, label: "Total Appointments", value: String(appointments?.length || 0), sub: "Scheduled for today" },
    { icon: <Users size={24} color="var(--accent)" />, label: "Active Patients", value: String(patients?.length || 0), sub: "Under your care" },
    { icon: <Activity size={24} color="var(--secondary)" />, label: "Health Insights", value: "Online", sub: "Monitoring active" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Quick Access Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <Link href="/dashboard/patients" style={{ textDecoration: 'none' }}>
          <QuickAction label="Patient Records" icon={<Users />} color="#38bdf8" delay={0.1} />
        </Link>
        <Link href="/dashboard/patients" style={{ textDecoration: 'none' }}>
          <QuickAction label="Write Prescription" icon={<FileText />} color="#a78bfa" delay={0.2} />
        </Link>
      </div>

      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {displayStats.map((stat, idx) => (
          <StatCard key={idx} {...stat} delay={idx * 0.15} />
        ))}
      </div>

      {/* Main Grid: Adapts strictly to what is available */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px' }}>
        
        {/* Patient Table */}
        <div className="glass hover-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users color="var(--primary)" /> 
              Patient Directory
            </h3>
            <Link href="/dashboard/patients" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              View All <ChevronRight size={16} />
            </Link>
          </div>

          <div style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '16px 12px', fontSize: '13px', opacity: 0.7, textTransform: 'uppercase', fontWeight: '700' }}>Patient</th>
                  <th style={{ padding: '16px 12px', fontSize: '13px', opacity: 0.7, textTransform: 'uppercase', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '16px 12px', fontSize: '13px', opacity: 0.7, textTransform: 'uppercase', fontWeight: '700' }}>Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {patients.length > 0 ? (
                  patients.slice(0, 5).map((p: any, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', color: 'var(--primary)' }}>
                            {p.firstName?.[0]}{p.lastName?.[0]}
                          </div>
                          <div>
                            <p style={{ fontWeight: '700', fontSize: '15px' }}>{p.firstName} {p.lastName}</p>
                            <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', fontSize: '12px', fontWeight: '700' }}>
                          {p.condition || 'Observation'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', fontSize: '14px', opacity: 0.7, fontWeight: '600' }}>
                        {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : 'New Patient'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ padding: '60px', textAlign: 'center', opacity: 0.7 }}>
                      <p style={{ fontWeight: '600' }}>No active patients.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Schedule Sidebar */}
        <div className="glass hover-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <Clock color="var(--accent)" /> 
               Today's Agenda
            </h3>
            <Link href="/dashboard/schedule" style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Full Calendar <ChevronRight size={16} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {appointments.length > 0 ? (
              appointments.slice(0, 4).map((appt: any, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', gap: '16px', padding: '16px', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '16px', border: '1px solid var(--glass-border)',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: appt.status === 'scheduled' ? 'var(--accent)' : '#10b981' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '8px' }}>
                    <p style={{ fontSize: '15px', fontWeight: '800', color: appt.status === 'scheduled' ? 'var(--accent)' : '#10b981' }}>
                      {appt.start_time || appt.time || 'TBD'}
                    </p>
                    <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px', fontWeight: '600' }}>{appt.duration_minutes || 30} min</p>
                  </div>
                  <div style={{ flex: 1, paddingLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '15px', fontWeight: '700' }}>Patient {appt.patientName || appt.patient_id}</p>
                    <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={12} color="var(--primary)" /> {appt.reason || 'Checkup Consultation'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, gap: '12px' }}>
                <Calendar size={48} />
                <p style={{ fontWeight: '600' }}>Your schedule is clear today.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

function QuickAction({ label, icon, color, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }}
      whileHover={{ y: -5, background: 'rgba(255,255,255,0.05)', borderColor: color }}
      className="glass" 
      style={{ 
        padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', 
        gap: '16px', color: 'white', border: '1px solid var(--glass-border)',
        borderRadius: '20px', transition: 'all 0.3s ease', cursor: 'pointer'
      }}
    >
      <div style={{ 
        width: '48px', height: '48px', borderRadius: '14px', 
        background: `linear-gradient(135deg, ${color}33, ${color}11)`,
        color: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${color}33`
      }}>
        {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
      </div>
      <p style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' }}>{label}</p>
    </motion.div>
  );
}

function StatCard({ icon, label, value, sub, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="glass hover-card" 
      style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'center', borderRadius: '20px' }}>
      <div style={{ 
        width: '64px', height: '64px', borderRadius: '18px', 
        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '13px', opacity: 0.8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{label}</p>
        <h3 style={{ fontSize: '32px', fontWeight: '800', lineHeight: 1 }}>{value}</h3>
        <p style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '8px', fontWeight: '600' }}>{sub}</p>
      </div>
    </motion.div>
  );
}
