"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, MapPin, Check, X, Loader2 } from 'lucide-react';
import api from '@/services/api';

interface Pharmacist {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface PharmacistSelectorProps {
  onSelect: (pharmacistId: number) => void;
  onClose: () => void;
}

export default function PharmacistSelector({ onSelect, onClose }: PharmacistSelectorProps) {
  const [pharmacists, setPharmacists] = useState<Pharmacist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchPharmacists = async () => {
      try {
        // We use the new endpoint in auth-service
        const res = await api.get('/auth/users/role/pharmacy');
        setPharmacists(res.data || []);
      } catch (err) {
        console.error('Error fetching pharmacists:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPharmacists();
  }, []);

  const filtered = pharmacists.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass"
        onClick={e => e.stopPropagation()}
        style={{ 
          width: '100%', 
          maxWidth: '500px', 
          padding: '30px', 
          background: 'rgba(15, 15, 20, 0.98)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Choose Pharmacist</h2>
            <p style={{ opacity: 0.6, fontSize: '14px' }}>Select a pharmacy professional to handle your order.</p>
          </div>
          <button onClick={onClose} className="close-button" style={{ position: 'static' }}>
            <X size={20} />
          </button>
        </div>

        <div className="glass" style={{ 
          background: 'rgba(255,255,255,0.03)', 
          padding: '4px 16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '20px'
        }}>
          <Search size={18} opacity={0.4} />
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              padding: '12px 0', 
              width: '100%',
              boxShadow: 'none'
            }}
          />
        </div>

        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          paddingRight: '4px',
          minHeight: '200px'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Loader2 className="animate-spin" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`glass ${selectedId === p.id ? 'active-pharmacist' : ''}`}
                style={{ 
                  padding: '16px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  background: selectedId === p.id ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                  borderColor: selectedId === p.id ? 'var(--primary)' : 'var(--glass-border)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={20} color={selectedId === p.id ? 'var(--primary)' : 'white'} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '700' }}>{p.first_name} {p.last_name}</p>
                  <p style={{ fontSize: '12px', opacity: 0.5 }}>{p.email}</p>
                </div>
                {selectedId === p.id && <Check size={18} color="var(--primary)" />}
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', opacity: 0.5, padding: '40px' }}>No pharmacists found matching your search.</p>
          )}
        </div>

        <button 
          disabled={!selectedId}
          onClick={() => selectedId && onSelect(selectedId)}
          className="btn-primary" 
          style={{ 
            width: '100%', 
            marginTop: '24px',
            opacity: selectedId ? 1 : 0.5,
            cursor: selectedId ? 'pointer' : 'not-allowed'
          }}
        >
          Confirm Recipient
        </button>
      </motion.div>

      <style jsx>{`
        .active-pharmacist {
          transform: translateX(5px);
        }
      `}</style>
    </div>
  );
}
