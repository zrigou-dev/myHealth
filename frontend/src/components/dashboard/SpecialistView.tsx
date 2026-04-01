"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Clipboard, 
  FlaskConical, 
  Package, 
  AlertCircle,
  Clock,
  CheckCircle2,
  FileSearch,
  Activity,
  FileText,
  ClipboardList,
  Calendar,
  PlusCircle
} from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';

export default function SpecialistView({ role }: { role: string }) {
  const isLab = role === 'lab';
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecialistData = async () => {
      try {
        if (isLab) {
          const [statsRes, tasksRes] = await Promise.allSettled([
            api.get('/laboratory/requests/stats'),
            api.get('/laboratory/requests/urgent') 
          ]);
          if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
          if (tasksRes.status === 'fulfilled') {
            setTasks(tasksRes.value.data.requests || []);
          }
        } else {
          const [statsRes, tasksRes] = await Promise.allSettled([
            api.get('/pharmacy/prescriptions/stats'),
            api.get('/pharmacy/prescriptions/my-prescriptions')
          ]);
          if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
          if (tasksRes.status === 'fulfilled') {
            setTasks(tasksRes.value.data.prescriptions || []);
          }
        }
      } catch (err) {
        console.error('Error fetching specialist data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialistData();
  }, [isLab]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading your worklist...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <Link href={isLab ? "/dashboard/worklist" : "/dashboard/queue"} style={{ textDecoration: 'none' }}>
          <SpecStat icon={isLab ? <FileText /> : <ClipboardList />} label={isLab ? "Pending Tests" : "Pharmacy Queue"} value={stats?.pending || "0"} color="var(--primary)" />
        </Link>
        <Link href={isLab ? "/dashboard/reports" : "/dashboard/inventory"} style={{ textDecoration: 'none' }}>
          <SpecStat icon={isLab ? <ClipboardList /> : <Activity />} label={isLab ? "Lab Reports" : "Drug Inventory"} value={stats?.total || "0"} color="var(--accent)" />
        </Link>
        <Link href="/dashboard/schedule" style={{ textDecoration: 'none' }}>
          <SpecStat icon={<Calendar />} label="Schedule" value="Today" color="var(--secondary)" />
        </Link>
      </div>

      <div className="glass" style={{ padding: '30px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>
          {isLab ? 'Laboratory Worklist' : 'Pharmacy Order Queue'}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.length > 0 ? (
            tasks.map((task, idx) => (
              <div key={idx} className="glass" style={{ 
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
                    color: isLab ? 'var(--primary)' : 'var(--secondary)'
                  }}>
                    {isLab ? <FlaskConical size={24} /> : <Clipboard size={24} />}
                  </div>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '16px' }}>{task.patientName || task.p || 'Anonymous'}</p>
                    <p style={{ fontSize: '13px', opacity: 0.5 }}>{task.testName || task.medicationName || 'Clinical Request'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', opacity: 0.4, marginBottom: '4px' }}>Status</p>
                    <p style={{ fontSize: '13px', fontWeight: '600' }}>{task.status || 'Pending'}</p>
                  </div>
                  <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '13px' }}>
                    Open Task
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No active tasks in your worklist.</p>
          )}
        </div>
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
