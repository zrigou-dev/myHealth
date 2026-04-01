"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Stethoscope, 
  Calendar, 
  Clock, 
  Filter,
  Users,
  Star,
  ArrowRight,
  CheckCircle2,
  X
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [city, setCity] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [bookingStep, setBookingStep] = useState(0); // 0: Browse, 1: Details, 2: Success
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/doctors/search', { params });
      setDoctors(res.data || []);
      console.log("doctors: " , res.data);
      
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors({ specialization, city, name: search });
  };

  const handleBook = async () => {
    try {
      await api.post('/appointments', {
        doctor_id: selectedDoctor.id,
        appointment_date: bookingData.date,
        start_time: bookingData.time,
        duration_minutes: 30,
        reason: bookingData.reason || 'General Consultation',
        notes: bookingData.notes
      });
      setBookingStep(2);
      toast.success('Appointment booked successfully!');
    } catch (err) {
      toast.error('Error booking appointment. Please try again.');
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px' }}>Find Your Specialist</h1>
        <p style={{ opacity: 0.6 }}>Book appointments with top-rated healthcare professionals.</p>
      </header>

      {/* Search Filters */}
      <form onSubmit={handleSearch} className="glass" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px', gap: '16px', marginBottom: '40px', alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', opacity: 0.5 }}>NAME / LICENSE</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
            <input 
              type="text" 
              placeholder="Search doctor..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass" 
              style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', opacity: 0.5 }}>SPECIALIZATION</label>
          <select 
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className="glass" 
            style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: 'white' }}
          >
            <option value="">All Specialties</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Neurology">Neurology</option>
            <option value="Pediatrics">Pediatrics</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', opacity: 0.5 }}>CITY</label>
          <div style={{ position: 'relative' }}>
            <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
            <input 
              type="text" 
              placeholder="e.g. Paris" 
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="glass" 
              style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}
            />
          </div>
        </div>
        <button type="submit" className="btn-primary" style={{ padding: '13px' }}>
          <Filter size={20} />
        </button>
      </form>

      {/* Results Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>Searching our medical network...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {doctors.map((doc, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={doc.id} 
              className="glass hover-card" 
              style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800' }}>
                  {doc.specialization?.[0]}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Dr. {doc.firstName} {doc.lastName}</h3>
                  <p style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Stethoscope size={14} /> {doc.specialization}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '20px', fontSize: '13px', opacity: 0.6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {doc.office_city}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={14} color="#fbbf24" fill="#fbbf24" /> 4.9 (120+)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> 1k+ patients</span>
              </div>

              <p style={{ fontSize: '14px', lineHeight: '1.6', opacity: 0.8, height: '4.8em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {doc.bio || 'Experienced specialist providing comprehensive care in ' + doc.specialization + '. dedicated to patient wellbeing.'}
              </p>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '800', fontSize: '20px' }}>${doc.consultation_fee} <span style={{ fontSize: '12px', fontWeight: '400', opacity: 0.5 }}>/ visit</span></span>
                <button 
                  onClick={() => { setSelectedDoctor(doc); setBookingStep(1); }}
                  className="btn-primary" 
                  style={{ padding: '10px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Book Now <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedDoctor && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass" 
              style={{ width: '100%', maxWidth: '500px', padding: '40px', position: 'relative' }}
            >
              <button onClick={() => setSelectedDoctor(null)} style={{ position: 'absolute', right: '20px', top: '20px', opacity: 0.5, border: 'none', background: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={24} />
              </button>

              {bookingStep === 1 ? (
                <>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Book Appointment</h2>
                  <p style={{ opacity: 0.5, marginBottom: '30px' }}>With Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</p>

                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600' }}>Date</label>
                        <input 
                          type="date" 
                          min={new Date().toISOString().split('T')[0]}
                          value={bookingData.date}
                          onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                          className="glass" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }} 
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600' }}>Time</label>
                        <input 
                          type="time" 
                          value={bookingData.time}
                          onChange={(e) => setBookingData({...bookingData, time: e.target.value})}
                          className="glass" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }} 
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600' }}>Reason for Visit</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Annual Checkup" 
                        value={bookingData.reason}
                        onChange={(e) => setBookingData({...bookingData, reason: e.target.value})}
                        className="glass" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }} 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600' }}>Additional Notes</label>
                      <textarea 
                        rows={3} 
                        placeholder="Optional details..." 
                        value={bookingData.notes}
                        onChange={(e) => setBookingData({...bookingData, notes: e.target.value})}
                        className="glass" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', resize: 'none' }} 
                      />
                    </div>
                    <button 
                      onClick={handleBook}
                      disabled={!bookingData.date || !bookingData.time}
                      className="btn-primary" 
                      style={{ padding: '15px', marginTop: '10px', opacity: (!bookingData.date || !bookingData.time) ? 0.5 : 1 }}
                    >
                      Confirm Booking
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <CheckCircle2 size={64} color="#10b981" style={{ margin: '0 auto 24px' }} />
                  <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px' }}>Appointment Confirmed!</h2>
                  <p style={{ opacity: 0.6, marginBottom: '30px' }}>Your request has been successfully sent to Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}. You can find more details in your appointments list.</p>
                  <button onClick={() => setSelectedDoctor(null)} className="btn-primary" style={{ width: '100%', padding: '15px' }}>
                    Back to Search
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
