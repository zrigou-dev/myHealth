"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FlaskConical, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileSearch,
  Settings
} from 'lucide-react';
import api from '@/services/api';

export default function LabView() {
  const [worklist, setWorklist] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLabData = async () => {
      try {
        const [statsRes, listRes] = await Promise.allSettled([
          api.get('/laboratory/requests/stats'),
          api.get('/laboratory/requests/urgent')
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (listRes.status === 'fulfilled') setWorklist(listRes.value.data);
      } catch (err) {
        console.error('Error fetching lab data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLabData();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Synchronizing lab worklist...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Lab Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <SpecStat icon={<FlaskConical />} label="Total Pending Tests" value={worklist.length.toString()} color="var(--primary)" />
        <SpecStat icon={<Clock />} label="Avg Turnaround" value="1.2h" color="var(--accent)" />
        <SpecStat icon={<Settings />} label="Equipment Status" value="Online" color="#10b981" />
      </div>

      <div className="glass" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Laboratory Worklist</h3>
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Scan Barcode</button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {worklist.length > 0 ? (
            worklist.map((task, idx) => (
              <WorklistItem key={idx} task={task} />
            ))
          ) : (
            <p style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Worklist is clear. Good job!</p>
          )}
        </div>
      </div>
    </div>
  );
}

function WorklistItem({ task }: { task: any }) {
  return (
    <div className="glass" style={{ 
      padding: '20px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      background: 'rgba(255,255,255,0.01)'
    }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ 
          padding: '12px', 
          borderRadius: '12px', 
          background: 'rgba(255,255,255,0.03)',
          color: 'var(--primary)'
        }}>
          <FileSearch size={24} />
        </div>
        <div>
          <p style={{ fontWeight: '700', fontSize: '16px' }}>{task.patientName || 'Anonymous'}</p>
          <p style={{ fontSize: '13px', opacity: 0.5 }}>{task.testName || 'Standard Panel'}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '12px', opacity: 0.4, marginBottom: '4px' }}>Priority</p>
          <p style={{ fontSize: '13px', fontWeight: '600', color: task.priority === 'High' ? '#ef4444' : 'inherit' }}>{task.priority || 'Normal'}</p>
        </div>
        <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '13px' }}>Enter Results</button>
      </div>
    </div>
  );
}

function SpecStat({ icon, label, value, color }: any) {
  return (
    <div className="glass" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ fontSize: '14px', opacity: 0.5, marginBottom: '8px' }}>{label}</p>
        <h3 style={{ fontSize: '32px', fontWeight: '800' }}>{value}</h3>
      </div>
      <div style={{ 
        width: '60px', 
        height: '60px', 
        borderRadius: '20px', 
        background: `${color}15`, 
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {React.cloneElement(icon, { size: 30 })}
      </div>
    </div>
  );
}
