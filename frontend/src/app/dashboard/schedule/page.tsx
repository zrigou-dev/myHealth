"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  Activity,
  UserCheck
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function SchedulePage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      // 1. Get the actual Doctor Profile ID (not just the User ID)
      const profileRes = await api.get('/doctors/profile');
      const doctorProfileId = profileRes.data.id;

      // 2. Fetch appointments belonging to this doctor profile
      const res = await api.get(`/appointments/doctors/${doctorProfileId}`);
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      toast.error('Could not load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const endpoint = status === 'confirmed' ? 'confirm' : 'reject';
      await api.put(`/appointments/${id}/${endpoint}`, {
        reason: status === 'rejected' ? 'Doctor not available' : undefined
      });
      toast.success(`Appointment ${status === 'confirmed' ? 'confirmed' : 'rejected'} successfully!`);
      fetchSchedule();
    } catch (err) {
      console.error('Error updating appointment status:', err);
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Synchronizing clinical agenda...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800' }}>Clinical Schedule</h1>
          <p style={{ opacity: 0.6 }}>Manage your medical consultations and daily clinical roster.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="glass" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} /> Filters
          </button>
        </div>
      </header>

      {/* Date Navigator */}
      <div className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', marginBottom: '30px' }}>
        <button className="hover-card" style={{ padding: '8px', borderRadius: '50%' }}><ChevronLeft size={20} /></button>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Monday, March 30, 2026</h3>
          <p style={{ fontSize: '12px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Today</p>
        </div>
        <button className="hover-card" style={{ padding: '8px', borderRadius: '50%' }}><ChevronRight size={20} /></button>
      </div>

      {/* Appointment Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {appointments.length > 0 ? (
          appointments.map((appt, idx) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={appt.id} 
              className="glass" 
              style={{ padding: '24px', display: 'grid', gridTemplateColumns: '100px 1fr 180px auto', gap: '24px', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>{appt.start_time}</span>
                <span style={{ fontSize: '11px', opacity: 0.4, fontWeight: '700' }}>30 MIN</span>
              </div>

              <div>
                <h4 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '4px' }}>{appt.first_name ? `${appt.first_name} ${appt.last_name}` : `Patient ${appt.patient_id}`}</h4>
                <p style={{ fontSize: '13px', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={12} /> {appt.reason || 'General Follow-up'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '10px', width: 'fit-content' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: appt.status === 'confirmed' ? '#10b981' : appt.status === 'rejected' ? '#ef4444' : 'var(--accent)' }} />
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>{appt.status}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {appt.status === 'scheduled' && (
                  <>
                    <button 
                      onClick={() => handleStatusUpdate(appt.id, 'confirmed')}
                      className="glass" 
                      style={{ padding: '10px 16px', fontSize: '13px', fontWeight: '700', color: '#10b981' }}
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(appt.id, 'rejected')}
                      className="glass" 
                      style={{ padding: '10px 16px', fontSize: '13px', fontWeight: '700', color: '#ef4444' }}
                    >
                      Reject
                    </button>
                  </>
                )}
                {appt.status === 'confirmed' && (
                  <button className="btn-primary" style={{ padding: '10px 16px', fontSize: '13px', fontWeight: '700' }}>Start</button>
                )}
                <button className="glass" style={{ padding: '10px' }}><MoreVertical size={18} /></button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="glass" style={{ padding: '80px', textAlign: 'center', opacity: 0.4 }}>
            <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: '18px', fontWeight: '600' }}>No consultations scheduled for today.</p>
            <p style={{ fontSize: '14px' }}>Take some time to review patient records or update your availability.</p>
          </div>
        )}
      </div>

      {/* Afternoon/Evening indicators (if empty slots) */}
      {appointments.length > 0 && (
        <div style={{ marginTop: '40px', padding: '20px', textAlign: 'center', opacity: 0.3 }}>
           <p style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>EndOf Day</p>
        </div>
      )}
    </div>
  );
}
