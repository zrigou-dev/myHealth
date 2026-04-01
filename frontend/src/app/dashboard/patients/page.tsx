"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Filter, Plus, Mail, Phone, Calendar as CalendarIcon, Check, X, FileText, Activity, Clock, MapPin
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    notes: '', items: [{ medicine_name: '', dosage: '', frequency: '', duration_days: 7 }]
  });
  const [doctorProfileId, setDoctorProfileId] = useState<number | null>(null);

  const [medicalRecord, setMedicalRecord] = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const patientsRes = await api.get('/doctors/patients');
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);

      try {
        const profileRes = await api.get('/doctors/profile');
        setDoctorProfileId(profileRes.data.id);
        const scheduleRes = await api.get(`/appointments/doctors/${profileRes.data.id}`);
        setAppointments(scheduleRes.data.appointments || []);
      } catch (err) {
        console.error('Could not fetch appointments for inline actions:', err);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const endpoint = status === 'confirmed' ? 'confirm' : status === 'cancelled' ? 'cancel' : 'reject';
      await api.put(`/appointments/${id}/${endpoint}`, {
        reason: status === 'cancelled' ? 'Doctor cancelled' : status === 'rejected' ? 'Doctor declined' : undefined
      });
      toast.success(`Booking ${status}!`);
      fetchData();
    } catch (err) {
      console.error('Error updating appointment:', err);
      toast.error('Failed to update booking');
    }
  };

  const fetchMedicalRecord = async (patientId: string) => {
    setLoadingRecord(true);
    setMedicalRecord(null);
    try {
      const res = await api.get(`/medical-records/patient/${patientId}/complete`);
      setMedicalRecord(res.data);
    } catch (err) {
      console.error('Error fetching medical record:', err);
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleAddMedicine = () => {
    setPrescriptionForm(prev => ({
      ...prev,
      items: [...prev.items, { medicine_name: '', dosage: '', frequency: '', duration_days: 7 }]
    }));
  };

  const handleMedicineChange = (index: number, field: string, value: string | number) => {
    const newItems = [...prescriptionForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setPrescriptionForm({ ...prescriptionForm, items: newItems });
  };

  const handleSendPrescription = async () => {
    if (!selectedPatient || !doctorProfileId) return;
    try {
      const appts = appointments.filter(a => String(a.patient_id) === String(selectedPatient.patient_id));
      const appt_id = appts.length > 0 ? appts[0].id : null;
      
      const payload = {
        patient_id: selectedPatient.patient_id,
        doctor_id: doctorProfileId,
        appointment_id: appt_id,
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        clinical_notes: prescriptionForm.notes,
        items: prescriptionForm.items.filter(i => i.medicine_name).map(i => ({
          medication_name: i.medicine_name,
          quantity: i.duration_days || 1,
          duration_value: i.duration_days,
          duration_unit: 'day',
          instructions: i.dosage,
          frequency_detail: i.frequency
        }))
      };

      await api.post('/prescriptions', payload);
      toast.success('Prescription sent successfully!');
      setShowPrescribeModal(false);
      setPrescriptionForm({ notes: '', items: [{ medicine_name: '', dosage: '', frequency: '', duration_days: 7 }] });
    } catch (error) {
      console.error('Error sending prescription:', error);
      toast.error('Failed to send prescription');
    }
  };

  const filteredPatients = patients.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading your patient panel...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }} className="stack-mobile">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800' }}>Patient Management</h1>
          <p style={{ opacity: 0.6 }}>Manage your patients, view details, and send prescriptions.</p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '30px' }} className="stack-mobile">
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.7 }} />
          <input 
            type="text" placeholder="Search patients..." className="glass full-width-mobile" 
            style={{ width: '100%', padding: '14px 14px 14px 48px' }}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '20px', fontSize: '14px', opacity: 0.5 }}>PATIENT</th>
              <th style={{ padding: '20px', fontSize: '14px', opacity: 0.5 }} className="hide-mobile">LAST VISIT</th>
              <th style={{ padding: '20px', fontSize: '14px', opacity: 0.5 }} className="hide-mobile">BOOKING STATUS</th>
              <th style={{ padding: '20px', fontSize: '14px', opacity: 0.5, textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient, idx) => {
                const appt = appointments.find(a => String(a.patient_id) === String(patient.patient_id) && ['scheduled', 'confirmed'].includes(a.status));

                return (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                    key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className="hover-card"
                  >
                    <td style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px' }}>
                          {patient.firstName?.[0]}{patient.lastName?.[0]}
                        </div>
                        <div>
                          <p style={{ fontWeight: '700', fontSize: '16px' }}>{patient.firstName} {patient.lastName}</p>
                          <p style={{ fontSize: '13px', opacity: 0.7 }}>{patient.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px', fontSize: '14px' }} className="hide-mobile">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                        <CalendarIcon size={14} />
                        {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td style={{ padding: '20px' }} className="hide-mobile">
                      {appt ? (
                        appt.status === 'scheduled' ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '700', marginRight: '8px' }}>Pending Request</span>
                            <button onClick={() => handleStatusUpdate(appt.id, 'confirmed')} className="glass" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> Accept</button>
                            <button onClick={() => handleStatusUpdate(appt.id, 'rejected')} className="glass" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><X size={14} /> Reject</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', marginRight: '8px' }}>Confirmed</span>
                            <button onClick={() => handleStatusUpdate(appt.id, 'cancelled')} className="glass" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', color: '#ef4444' }}>Cancel</button>
                          </div>
                        )
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', opacity: 0.5 }}>No Active Bookings</span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => { 
                            setSelectedPatient(patient); 
                            console.log("selected patient: ", patient);
                            setShowDetailsModal(true); 
                            fetchMedicalRecord(patient.patient_id);
                          }}
                          className="glass" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={14} /> Details
                        </button>
                        <button 
                          onClick={() => { setSelectedPatient(patient); setShowPrescribeModal(true); }}
                          className="btn-primary" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Plus size={14} /> Prescribe
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: '60px', textAlign: 'center', opacity: 0.7 }}>
                  <Users size={48} style={{ marginBottom: '16px', opacity: 0.2, margin: '0 auto' }} />
                  <p>No patients matching your search.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showDetailsModal && selectedPatient && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content glass" style={{ padding: '30px' }}>
              <button onClick={() => setShowDetailsModal(false)} className="close-button"><X size={20} /></button>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Patient Overview</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '24px' }}>
                  {selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700' }}>{selectedPatient.firstName} {selectedPatient.lastName}</h3>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                    <p style={{ opacity: 0.8, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} color="var(--primary)" /> {selectedPatient.email}</p>
                    <p style={{ opacity: 0.8, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} color="var(--primary)" /> {selectedPatient.phone || 'Contact Not Provided'}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto' }}>
                {(() => {
                  const activeAppt = appointments.find(a => String(a.patient_id) === String(selectedPatient.patient_id));
                  return (
                    <>
                      {activeAppt && (
                        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                          <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '12px' }}>Current Appointment Details</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <p style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700', marginBottom: '4px' }}>Patient's Note / Reason</p>
                              <p style={{ fontSize: '14px', fontWeight: '700' }}>{activeAppt.reason || 'Routine Checkup'}</p>
                              {activeAppt.notes && <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px', fontStyle: 'italic' }}>"{activeAppt.notes}"</p>}
                            </div>
                            <div>
                              <p style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700', marginBottom: '4px' }}>Location / Address</p>
                              <p style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>{activeAppt.type === 'video' ? 'Virtual (Teleconsultation)' : (activeAppt.location || 'Physical Clinic - Default Location')}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                        <p style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700', marginBottom: '8px' }}>Medical Condition</p>
                        <p style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={16} color="var(--primary)" /> {selectedPatient.condition || 'General Patient'}</p>
                      </div> */}
                    </>
                  );
                })()}
                
                {loadingRecord ? (
                  <div style={{ padding: '20px', textAlign: 'center', opacity: 0.6 }}>Loading full medical record...</div>
                ) : medicalRecord ? (
                  <>
                    {/* <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                        <p style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700', marginBottom: '8px' }}>Key Metrics</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ opacity: 0.8 }}>BMI</span>
                            <span style={{ fontWeight: '700' }}>{medicalRecord.summary?.bmi || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ opacity: 0.8 }}>Consultations</span>
                            <span style={{ fontWeight: '700' }}>{medicalRecord.summary?.consultations_count || 0}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ opacity: 0.8 }}>Prescriptions</span>
                            <span style={{ fontWeight: '700' }}>{medicalRecord.summary?.prescriptions_count || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                        <p style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700', marginBottom: '8px' }}>Recent Vitals</p>
                        {medicalRecord.local_data?.vital_signs?.[0] ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                              <span style={{ opacity: 0.8 }}>Blood Pressure</span>
                              <span style={{ fontWeight: '700' }}>{medicalRecord.local_data.vital_signs[0].systolic_bp}/{medicalRecord.local_data.vital_signs[0].diastolic_bp} mmHg</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                              <span style={{ opacity: 0.8 }}>Heart Rate</span>
                              <span style={{ fontWeight: '700' }}>{medicalRecord.local_data.vital_signs[0].heart_rate} bpm</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                              <span style={{ opacity: 0.8 }}>Recorded At</span>
                              <span style={{ fontWeight: '700', opacity: 0.6 }}>{new Date(medicalRecord.local_data.vital_signs[0].recorded_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontSize: '14px', opacity: 0.5 }}>No recent vitals found.</p>
                        )}
                      </div>
                    </div> */}

                    {medicalRecord.local_data?.allergies?.length > 0 && (
                      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                        <p style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700', marginBottom: '8px' }}>Allergies</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {medicalRecord.local_data.allergies.map((allergy: any, idx: number) => (
                            <span key={idx} style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>
                              {allergy.allergen} ({allergy.severity})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {medicalRecord.local_data?.conditions?.length > 0 && (
                      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                        <p style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700', marginBottom: '8px' }}>Conditions</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {medicalRecord.local_data.conditions.map((condition: any, idx: number) => (
                            <span key={idx} style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '13px', fontWeight: '600' }}>
                              {condition.condition_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}

                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.5, fontWeight: '700', marginBottom: '8px' }}>Booking History (Local)</p>
                  {appointments.filter(a => String(a.patient_id) === String(selectedPatient.patient_id)).slice(0, 3).map((appt: any, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < 2 ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>
                      <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> {new Date(appt.appointment_date).toLocaleDateString()}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: appt.status === 'confirmed' ? '#10b981' : appt.status === 'scheduled' ? 'var(--accent)' : 'inherit' }}>{appt.status}</span>
                    </div>
                  ))}
                  {appointments.filter(a => String(a.patient_id) === String(selectedPatient.patient_id)).length === 0 && (
                    <p style={{ fontSize: '14px', opacity: 0.5 }}>No recorded appointments.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showPrescribeModal && selectedPatient && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content glass" style={{ padding: '30px' }}>
              <button onClick={() => setShowPrescribeModal(false)} className="close-button"><X size={20} /></button>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText color="var(--primary)" /> Issue Prescription
              </h2>
              <p style={{ opacity: 0.6, marginBottom: '24px' }}>For {selectedPatient.firstName} {selectedPatient.lastName}</p>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Clinical Notes & Instructions</label>
                <textarea 
                  value={prescriptionForm.notes} onChange={e => setPrescriptionForm({...prescriptionForm, notes: e.target.value})}
                  className="glass" placeholder="Rest, physical therapy, follow-up..."
                  style={{ width: '100%', height: '100px', padding: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600' }}>Medications</label>
                </div>
                
                {prescriptionForm.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', marginBottom: '12px', border: '1px solid var(--glass-border)' }}>
                    <div>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6, fontWeight: '700' }}>Medicine Name</label>
                      <input type="text" value={item.medicine_name} onChange={e => handleMedicineChange(idx, 'medicine_name', e.target.value)} className="glass" style={{ width: '100%', padding: '10px', marginTop: '4px' }} placeholder="Amoxicillin 500mg" />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6, fontWeight: '700' }}>Dosage & Timing</label>
                      <input type="text" value={item.dosage} onChange={e => handleMedicineChange(idx, 'dosage', e.target.value)} className="glass" style={{ width: '100%', padding: '10px', marginTop: '4px' }} placeholder="1 tablet, twice daily" />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6, fontWeight: '700' }}>Frequency</label>
                      <input type="text" value={item.frequency} onChange={e => handleMedicineChange(idx, 'frequency', e.target.value)} className="glass" style={{ width: '100%', padding: '10px', marginTop: '4px' }} placeholder="Every 12 hours" />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6, fontWeight: '700' }}>Duration (Days)</label>
                      <input type="number" value={item.duration_days} onChange={e => handleMedicineChange(idx, 'duration_days', parseInt(e.target.value))} className="glass" style={{ width: '100%', padding: '10px', marginTop: '4px' }} />
                    </div>
                  </div>
                ))}
                
                <button onClick={handleAddMedicine} className="glass" style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                  <Plus size={16} /> Add Another Medication
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '40px' }}>
                <button onClick={() => setShowPrescribeModal(false)} className="glass" style={{ padding: '12px 24px' }}>Discard</button>
                <button onClick={handleSendPrescription} className="btn-primary" style={{ padding: '12px 24px' }}>Sign & Send Prescription</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
