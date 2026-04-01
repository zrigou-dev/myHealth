"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  FileText,
  Download
} from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const [resAppts, resPresc] = await Promise.all([
        api.get('/appointments/my-appointments'),
        api.get('/prescriptions/my-prescriptions').catch(() => ({ data: { prescriptions: [] } }))
      ]);
      setAppointments(resAppts.data.appointments || []);
      setPrescriptions(resAppts.data.prescriptions || resPresc.data.prescriptions || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (prescriptionId: string) => {
    setLoadingPdf(true);
    try {
      const res = await api.get(`/prescriptions/${prescriptionId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${prescriptionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setLoadingPdf(false);
    }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading your appointments...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }} className="stack-mobile">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800' }}>My Appointments</h1>
          <p style={{ opacity: 0.8 }}>Review all your medical consultations and bookings.</p>
        </div>
        <Link href="/dashboard/doctors" className="full-width-mobile">
          <button className="btn-primary full-width-mobile" style={{ padding: '12px 24px' }}>
            <Plus size={20} /> New Appointment
          </button>
        </Link>
      </header>

      <section style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          All Bookings <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'var(--primary)', color: 'white', fontSize: '12px' }}>{appointments.length}</span>
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {appointments.length > 0 ? (
            // appointments are already sorted from newest to oldest by the backend API
            appointments.map((appt, idx) => {
              const pending = ['scheduled'].includes(appt.status);
              return <AppointmentCard key={appt.id} appt={appt} index={idx} isPending={pending} onClick={() => { setSelectedAppt(appt); setShowDetailsModal(true); }} />
            })
          ) : (
            <div className="glass" style={{ padding: '40px', textAlign: 'center', opacity: 0.8 }}>
              No appointments found.
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {showDetailsModal && selectedAppt && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content glass" style={{ padding: '30px' }}>
              <button onClick={() => setShowDetailsModal(false)} className="close-button"><X size={20} /></button>
              
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Request Details</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700', marginBottom: '8px' }}>Appointment Overview</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Calendar size={18} color="var(--primary)" />
                      <span style={{ fontSize: '16px', fontWeight: '600' }}>{new Date(selectedAppt.appointment_date).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Clock size={18} color="var(--primary)" />
                      <span style={{ fontSize: '16px', fontWeight: '600' }}>{selectedAppt.start_time} ({selectedAppt.duration_minutes} min)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <User size={18} color="var(--primary)" />
                      <span style={{ fontSize: '16px', fontWeight: '600' }}>Dr. {selectedAppt.doctor_id}</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700', marginBottom: '8px' }}>Reason & Status</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{selectedAppt.reason || 'Routine Checkup'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', background: selectedAppt.status === 'confirmed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', color: selectedAppt.status === 'confirmed' ? '#10b981' : 'inherit', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>
                      {selectedAppt.status}
                    </span>
                  </div>
                  {selectedAppt.notes && (
                    <p style={{ marginTop: '12px', fontSize: '14px', opacity: 0.8, background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                      {selectedAppt.notes}
                    </p>
                  )}
                </div>

                {/* Prescription Section */}
                {(() => {
                  const apptPrescription = prescriptions.find(p => p.appointment_id === selectedAppt.id);
                  if (apptPrescription) {
                    return (
                      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <p style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={16} /> Attached Prescription
                          </p>
                          <button onClick={() => handleDownloadPDF(apptPrescription.id)} disabled={loadingPdf} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Download size={14} /> {loadingPdf ? '...' : 'PDF'}
                          </button>
                        </div>
                        
                        {apptPrescription.notes && (
                          <p style={{ fontSize: '14px', marginBottom: '12px', opacity: 0.8 }}><strong>Notes:</strong> {apptPrescription.notes}</p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {apptPrescription.items?.map((item: any, i: number) => (
                            <div key={i} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                              <div>
                                <p style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700' }}>Medication</p>
                                <p style={{ fontSize: '14px', fontWeight: '700' }}>{item.medication_name}</p>
                              </div>
                              <div>
                                <p style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700' }}>Dosage</p>
                                <p style={{ fontSize: '14px' }}>{item.instructions || item.dosage_value || 'N/A'}</p>
                              </div>
                              <div style={{ gridColumn: 'span 2' }}>
                                <p style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700' }}>Instructions</p>
                                <p style={{ fontSize: '13px', opacity: 0.8 }}>{item.frequency_detail || item.frequency_value || 'N/A'} for {item.duration_value} days</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                      <p style={{ fontSize: '13px', opacity: 0.5 }}>No prescription attached to this request yet.</p>
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppointmentCard({ appt, index, isPending, onClick }: any) {
  const statusColors: any = {
    scheduled: 'var(--accent)',
    confirmed: '#10b981',
    completed: 'rgba(255,255,255,0.2)',
    cancelled: '#ef4444',
    rejected: '#ef4444'
  };

  return (
    <motion.div 
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass hover-card" 
      style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap' }}
    >
      <div style={{ textAlign: 'center', padding: '12px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>
          {new Date(appt.appointment_date).toLocaleString('default', { month: 'short' })}
        </p>
        <p style={{ fontSize: '24px', fontWeight: '800' }}>
          {new Date(appt.appointment_date).getDate()}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[appt.status] }} />
          <h4 style={{ fontSize: '18px', fontWeight: '700' }}>{appt.reason}</h4>
          <span style={{ fontSize: '11px', fontWeight: '700', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>{appt.status}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '24px', fontSize: '14px', opacity: 0.6 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Dr. {appt.doctor_id}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {appt.start_time} ({appt.duration_minutes} min)</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        {isPending && (
          <button className="glass" style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>
            Cancel
          </button>
        )}
        <button className="glass" style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MoreVertical size={18} />
        </button>
      </div>
    </motion.div>
  );
}
