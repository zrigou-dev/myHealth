"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Search,
  Plus,
  User,
  Check,
  X,
  MessageSquare
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'react-hot-toast';

export default function PharmacistView() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    try {
      const res = await api.get('/prescriptions/pharmacy/inbox');
      setQueue(res.data.prescriptions || []);
    } catch (err) {
      console.error('Error fetching pharmacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (id: number, status: 'accepted' | 'rejected') => {
    try {
      await api.patch(`/prescriptions/${id}/respond-to-pharmacy`, {
        status,
        reason: status === 'rejected' ? rejectionReason : undefined
      });
      toast.success(`Prescription ${status === 'accepted' ? 'accepted' : 'rejected'} successfully`);
      setRespondingTo(null);
      setRejectionReason('');
      fetchInbox();
    } catch (err) {
      console.error('Error responding to prescription:', err);
      toast.error('Operation failed');
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Accessing pharmacy system...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Pharmacy Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <PharmStat icon={<ClipboardList />} label="Incoming Requests" value={queue.filter(p => p.status === 'sent_to_pharmacy').length.toString()} color="var(--primary)" />
        <PharmStat icon={<CheckCircle2 />} label="Accepted Today" value={queue.filter(p => p.status === 'accepted').length.toString()} color="#10b981" />
        <PharmStat icon={<AlertTriangle />} label="Needs Action" value={queue.filter(p => p.status === 'sent_to_pharmacy').length.toString()} color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '30px' }}>
        {/* Prescription Queue */}
        <div className="glass" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Prescription Inbox</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {queue.length > 0 ? (
              queue.map((order) => (
                <QueueItem 
                  key={order.id} 
                  order={order} 
                  onAccept={() => handleResponse(order.id, 'accepted')}
                  onReject={() => setRespondingTo(order)}
                />
              ))
            ) : (
              <p style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Your inbox is empty.</p>
            )}
          </div>
        </div>

        {/* Inventory Management (Placeholder as before) */}
        <div className="glass" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h4 style={{ fontWeight: '700' }}>Quick Inventory</h4>
            <Search size={18} style={{ opacity: 0.5 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <InventoryItem name="Paracetamol" stock="1,200 units" status="Healthy" />
            <InventoryItem name="Amoxicillin" stock="15 units" status="Critical" />
            <InventoryItem name="Lisinopril" stock="450 units" status="Warning" />
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {respondingTo && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass" 
            style={{ width: '400px', padding: '30px', background: 'rgba(20,20,25,0.95)' }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px' }}>Reject Prescription</h3>
            <p style={{ opacity: 0.6, fontSize: '14px', marginBottom: '20px' }}> Please provide a reason for rejecting the request from {respondingTo.patient_first_name} {respondingTo.patient_last_name}.</p>
            
            <textarea 
              autoFocus
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Medication out of stock, dosage clarification needed..."
              className="glass"
              style={{ 
                width: '100%', 
                height: '120px', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                padding: '15px',
                color: 'white',
                marginBottom: '20px',
                resize: 'none'
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setRespondingTo(null)}
                className="glass" 
                style={{ flex: 1, padding: '12px', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleResponse(respondingTo.id, 'rejected')}
                disabled={!rejectionReason.trim()}
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', background: '#ef4444', opacity: rejectionReason.trim() ? 1 : 0.5 }}
              >
                Confirm Rejection
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function QueueItem({ order, onAccept, onReject }: any) {
  const isPending = order.status === 'sent_to_pharmacy';
  
  return (
    <div style={{ 
      padding: '20px', 
      background: 'rgba(255,255,255,0.02)', 
      borderRadius: '16px', 
      border: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} opacity={0.7} />
          </div>
          <div>
            <p style={{ fontWeight: '700', fontSize: '16px' }}>{order.patient_first_name} {order.patient_last_name}</p>
            <p style={{ fontSize: '12px', opacity: 0.5 }}>Ref: {order.prescription_number}</p>
          </div>
        </div>
        <div style={{ 
          padding: '4px 10px', 
          borderRadius: '20px', 
          fontSize: '11px', 
          fontWeight: '800', 
          textTransform: 'uppercase',
          background: isPending ? 'rgba(99, 102, 241, 0.1)' : order.status === 'accepted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: isPending ? 'var(--primary)' : order.status === 'accepted' ? '#10b981' : '#ef4444'
        }}>
          {order.status.replace(/_/g, ' ')}
        </div>
      </div>

      <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', fontSize: '14px' }}>
        <p style={{ opacity: 0.8 }}><span style={{ fontWeight: '700' }}>Medications:</span> {order.items?.[0]?.medication_name || 'Treatment plan'}</p>
        <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '4px' }}>Prescribed by Dr. {order.doctor_first_name} {order.doctor_last_name}</p>
      </div>

      {isPending && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={onAccept}
            className="btn-primary" 
            style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Check size={16} /> Accept Order
          </button>
          <button 
            onClick={onReject}
            className="glass" 
            style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ef4444' }}
          >
            <X size={16} /> Reject
          </button>
        </div>
      )}
    </div>
  );
}

function InventoryItem({ name, stock, status }: { name: string, stock: string, status: string }) {
  const color = status === 'Healthy' ? '#10b981' : status === 'Warning' ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ fontSize: '14px', fontWeight: '500' }}>{name}</p>
        <p style={{ fontSize: '12px', opacity: 0.4 }}>{stock}</p>
      </div>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
    </div>
  );
}

function PharmStat({ icon, label, value, color }: any) {
  return (
    <div className="glass" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
      <div style={{ 
        width: '50px', 
        height: '50px', 
        borderRadius: '15px', 
        background: `${color}15`, 
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div>
        <p style={{ fontSize: '13px', opacity: 0.5 }}>{label}</p>
        <h3 style={{ fontSize: '24px', fontWeight: '800' }}>{value}</h3>
      </div>
    </div>
  );
}
