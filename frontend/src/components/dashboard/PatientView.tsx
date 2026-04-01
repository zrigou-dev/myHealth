"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Clipboard, 
  Activity, 
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
  Pill
} from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';

export default function PatientView() {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptsRes, prescRes, profileRes] = await Promise.allSettled([
          api.get('/appointments/my-appointments'),
          api.get('/prescriptions/my-prescriptions'),
          api.get('/patients/profile')
        ]);

        if (apptsRes.status === 'fulfilled') {
          setAppointments(apptsRes.value.data.appointments || []);
        }
        if (prescRes.status === 'fulfilled') {
          setPrescriptions(prescRes.value.data.prescriptions || []);
        }
        if (profileRes.status === 'fulfilled') {
          setProfile(profileRes.value.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { label: 'Heart Rate', value: profile?.vitalSigns?.heartRate || '72 bpm', icon: <Activity color="#ef4444" />, trend: 'Synchronized' },
    { label: 'Blood Pressure', value: profile?.vitalSigns?.bloodPressure || '120/80', icon: <TrendingUp color="#10b981" />, trend: 'Normal' },
    { label: 'Upcoming Appts', value: (appointments?.length || 0).toString(), icon: <Calendar color="var(--primary)" />, trend: (appointments?.length || 0) > 0 ? 'Next: soon' : 'None scheduled' },
  ];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading your health data...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Quick Actions Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <Link href="/dashboard/doctors" style={{ textDecoration: 'none' }}>
          <QuickAction label="Book Appointment" icon={<Calendar />} color="var(--primary)" />
        </Link>
        <Link href="/dashboard/records" style={{ textDecoration: 'none' }}>
          <QuickAction label="View Records" icon={<Clipboard />} color="var(--accent)" />
        </Link>
        <Link href="/dashboard/prescriptions" style={{ textDecoration: 'none' }}>
          <QuickAction label="Prescriptions" icon={<Pill />} color="#10b981" />
        </Link>
        <Link href="/dashboard/appointments" style={{ textDecoration: 'none' }}>
          <QuickAction label="My Schedule" icon={<Clock />} color="var(--secondary)" />
        </Link>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {stats.map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label}
            className="glass" 
            style={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="glass" style={{ padding: '10px', borderRadius: '10px' }}>{stat.icon}</div>
              <ArrowUpRight size={16} opacity={0.4} />
            </div>
            <p style={{ opacity: 0.5, fontSize: '14px', marginBottom: '4px' }}>{stat.label}</p>
            <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>{stat.value}</h3>
            <p style={{ fontSize: '12px', color: stat.trend.includes('+') ? '#ef4444' : '#10b981' }}>{stat.trend}</p>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* Recent Activity / Appointments */}
        <div className="glass" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Upcoming Appointments</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {appointments.length > 0 ? (
              appointments.slice(0, 3).map((appt: any) => (
                <AppointmentItem 
                  key={appt.id}
                  doctor={appt.doctorName || 'General Staff'} 
                  specialty={appt.specialty || 'Consultation'} 
                  date={new Date(appt.date).toLocaleDateString()} 
                  time={appt.time} 
                  status={appt.status} 
                />
              ))
            ) : (
              <p style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>No upcoming appointments found.</p>
            )}
          </div>
        </div>

        {/* Quick Actions / Prescriptions */}
        <div className="glass" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Active Prescriptions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {prescriptions.length > 0 ? (
              prescriptions.slice(0, 3).map((presc: any) => (
                <PrescriptionItem 
                  key={presc.id}
                  name={presc.medicationName} 
                  dosage={presc.dosage} 
                  days={presc.status} 
                />
              ))
            ) : (
              <p style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>No active prescriptions.</p>
            )}
            <button className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Order Refills
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentItem({ doctor, specialty, date, time, status }: any) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '16px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '16px',
      border: '1px solid var(--glass-border)'
    }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          borderRadius: '12px', 
          background: 'rgba(99, 102, 241, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Clock size={24} color="var(--primary)" />
        </div>
        <div>
          <p style={{ fontWeight: '700' }}>{doctor}</p>
          <p style={{ fontSize: '13px', opacity: 0.5 }}>{specialty}</p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontWeight: '600', fontSize: '14px' }}>{date}</p>
        <p style={{ fontSize: '13px', opacity: 0.5 }}>{time}</p>
      </div>
      <div style={{ 
        padding: '6px 12px', 
        borderRadius: '20px', 
        fontSize: '12px', 
        fontWeight: '700',
        background: status === 'Confirmed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        color: status === 'Confirmed' ? '#10b981' : '#f59e0b'
      }}>
        {status}
      </div>
    </div>
  );
}

function PrescriptionItem({ name, dosage, days }: any) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div className="glass" style={{ padding: '10px', borderRadius: '10px' }}>
        <Clipboard size={18} color="var(--secondary)" />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: '700', fontSize: '15px' }}>{name}</p>
        <p style={{ fontSize: '12px', opacity: 0.6 }}>{dosage}</p>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600' }}>{days}</p>
    </div>
  );
}

function QuickAction({ label, icon, color }: any) {
  return (
    <motion.button 
      whileHover={{ y: -5, background: 'rgba(255,255,255,0.05)' }}
      className="glass" 
      style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '12px',
        cursor: 'pointer',
        border: 'none',
        color: 'white'
      }}
    >
      <div style={{ 
        padding: '12px', 
        borderRadius: '12px', 
        background: `${color}20`,
        color: color
      }}>
        {icon}
      </div>
      <span style={{ fontSize: '14px', fontWeight: '600', opacity: 0.8 }}>{label}</span>
    </motion.button>
  );
}
