"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Pill, 
  Clock, 
  User, 
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Search,
  ChevronRight,
  Send,
  XCircle,
  HelpCircle
} from 'lucide-react';
import api from '@/services/api';
import PharmacistSelector from '@/components/prescriptions/PharmacistSelector';
import { toast } from 'react-hot-toast';

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await api.get('/prescriptions/my-prescriptions');
      setPrescriptions(res.data.prescriptions || []);
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToPharmacy = async (pharmacistId: number) => {
    if (!selectedPrescription) return;

    try {
      await api.patch(`/prescriptions/${selectedPrescription.id}/send-to-pharmacy`, {
        pharmacy_id: pharmacistId
      });
      toast.success('Prescription sent to pharmacist successfully!');
      setShowSelector(false);
      fetchPrescriptions();
    } catch (err) {
      console.error('Error sending prescription:', err);
      toast.error('Failed to send prescription. Please try again.');
    }
  };

  const active = prescriptions.filter(p => !['expired', 'cancelled', 'dispensed'].includes(p.status));
  const past = prescriptions.filter(p => ['expired', 'cancelled', 'dispensed'].includes(p.status));

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Syncing with healthcare network...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800' }}>Prescriptions</h1>
          <p style={{ opacity: 0.6 }}>Manage your medications and pharmaceutical orders.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="glass" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '700' }}>
            <Download size={18} /> History PDF
          </button>
        </div>
      </header>

      <section style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Active & Pending <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'var(--primary)', color: 'white', fontSize: '12px' }}>{active.length}</span>
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {active.length > 0 ? (
            active.map((p, idx) => (
              <PrescriptionCard 
                key={p.id} 
                prescription={p} 
                index={idx} 
                isSecondary={false} 
                onSend={() => {
                  setSelectedPrescription(p);
                  setShowSelector(true);
                }}
              />
            ))
          ) : (
            <div className="glass" style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
              No active prescriptions found.
            </div>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', opacity: 0.6 }}>History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {past.map((p, idx) => (
              <PrescriptionCard key={p.id} prescription={p} index={idx} isSecondary={true} />
            ))}
          </div>
        </section>
      )}

      {showSelector && (
        <PharmacistSelector 
          onSelect={handleSendToPharmacy}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}

function PrescriptionCard({ prescription, index, isSecondary, onSend }: any) {
  console.log(prescription);
  
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle2 size={16} /> };
      case 'sent_to_pharmacy': return { color: 'var(--primary)', bg: 'rgba(99, 102, 241, 0.1)', icon: <Clock size={16} /> };
      case 'accepted': return { color: 'var(--accent)', bg: 'rgba(6, 182, 212, 0.1)', icon: <CheckCircle2 size={16} /> };
      case 'rejected': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: <XCircle size={16} /> };
      default: return { color: 'white', bg: 'rgba(255,255,255,0.05)', icon: <HelpCircle size={16} /> };
    }
  };

  const statusStyle = getStatusStyle(prescription.status);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass" 
      style={{ 
        padding: '24px', 
        display: 'flex', 
        gap: '24px', 
        alignItems: 'flex-start', 
        opacity: isSecondary ? 0.6 : 1,
        borderLeft: prescription.status === 'active' ? '4px solid #10b981' : '1px solid var(--glass-border)'
      }}
    >
      <div style={{ 
        padding: '16px', 
        borderRadius: '16px', 
        background: isSecondary ? 'rgba(255,255,255,0.05)' : statusStyle.bg, 
        color: statusStyle.color 
      }}>
        <Pill size={24} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: '700' }}>
            {prescription.items?.[0]?.medication_name || 'Treatment Plan'}
            {prescription.items?.length > 1 && <span style={{ fontSize: '12px', opacity: 0.5, marginLeft: '8px' }}>+{(prescription.items.length - 1)} more</span>}
          </h4>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '11px', 
            fontWeight: '800', 
            textTransform: 'uppercase', 
            color: statusStyle.color, 
            background: statusStyle.bg, 
            padding: '4px 10px', 
            borderRadius: '20px' 
          }}>
            {statusStyle.icon}
            {prescription.status.replace(/_/g, ' ')}
          </div>
        </div>
        
        <p style={{ fontSize: '14px', opacity: 0.6, marginBottom: '16px', lineHeight: '1.6' }}>
          {prescription.items?.[0]?.instructions || 'Please follow your doctor\'s instructions carefully.'}
          {prescription.rejection_reason && (
            <span style={{ display: 'block', marginTop: '10px', color: '#ef4444', fontWeight: '600' }}>
              Reason for rejection: {prescription.rejection_reason}
            </span>
          )}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', fontSize: '13px', opacity: 0.5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Valid until {new Date(prescription.expiry_date).toLocaleDateString()}</span>
          {prescription.pharmacy_id && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
              <Clock size={14} /> Assigned Pharmacist: #{prescription.pharmacy_id}
            </span>
          )}
        </div>
      </div>

      {!isSecondary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {prescription.status === 'active' && (
            <button 
              onClick={onSend}
              className="btn-primary" 
              style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '10px' }}
            >
              <Send size={14} /> Send to Pharmacy
            </button>
          )}
          <button className="glass" style={{ padding: '10px', borderRadius: '10px' }}>
            <Download size={18} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
