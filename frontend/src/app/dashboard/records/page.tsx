"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Clipboard, 
  Activity, 
  Shield, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Download,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Heart,
  Droplets,
  Thermometer
} from 'lucide-react';
import api from '@/services/api';

export default function RecordsPage() {
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecord();
  }, []);

  const fetchRecord = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await api.get(`/medical-records/patient/${user.id}/complete`);
      setRecord(res.data);
    } catch (err) {
      console.error('Error fetching medical record:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Retrieving your medical history...</div>;

  const summary = record?.summary || {};
  const local = record?.local_data || {};

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800' }}>Medical Records</h1>
          <p style={{ opacity: 0.6 }}>Your complete clinical history and health metrics.</p>
        </div>
        <button className="glass" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: '700' }}>
          <Download size={18} /> Export PDF
        </button>
      </header>

      {/* Health Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <RecordStat 
          label="Blood Group" 
          value={record?.external_data?.patient?.blood_type || 'Unknown'} 
          icon={<Droplets />} 
          color="#ef4444" 
        />
        <RecordStat 
          label="Height / Weight" 
          value={`${record?.external_data?.patient?.height || '--'}cm / ${record?.external_data?.patient?.weight || '--'}kg`} 
          icon={<Activity />} 
          color="var(--primary)" 
        />
        <RecordStat 
          label="BMI Status" 
          value={record?.summary?.bmi ? record.summary.bmi.toString() : '--'} 
          icon={<Heart />} 
          color="#10b981" 
          sub={record?.summary?.bmi ? (
            record.summary.bmi < 18.5 ? 'Underweight' : 
            record.summary.bmi < 25 ? 'Normal Range' : 
            record.summary.bmi < 30 ? 'Overweight' : 'Obesity'
          ) : 'N/A'} 
        />
        <RecordStat 
          label="Last Checkup" 
          value={record?.summary?.last_visit ? new Date(record.summary.last_visit).toLocaleDateString() : 'No recent visits'} 
          icon={<Calendar />} 
          color="var(--accent)" 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Vitals History */}
          <div className="glass" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Vital Signs History</h3>
              <button style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '700' }}>View Trends</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {local.vital_signs?.length > 0 ? (
                local.vital_signs.map((v: any, idx: number) => (
                  <VitalRow key={idx} {...v} />
                ))
              ) : (
                <p style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>No vitals recorded yet.</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="glass" style={{ padding: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Medical Timeline</h3>
            <div style={{ position: 'relative', paddingLeft: '30px', borderLeft: '2px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {record?.timeline?.length > 0 ? (
                record.timeline.map((event: any, idx: number) => (
                  <TimelineItem key={idx} {...event} />
                ))
              ) : (
                <p style={{ opacity: 0.5 }}>Your medical timeline is being compiled...</p>
              )}
            </div>
          </div>

          {/* Laboratory Results */}
          <div className="glass" style={{ padding: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Laboratory & Diagnostic Results</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {record?.external_data?.laboratory?.length > 0 ? (
                record.external_data.laboratory.map((lab: any, idx: number) => (
                  <LabRow key={idx} {...lab} />
                ))
              ) : (
                <p style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>No laboratory results found.</p>
              )}
            </div>
          </div>

          {/* Prescriptions */}
          <div className="glass" style={{ padding: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Prescription History</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {record?.external_data?.prescriptions?.length > 0 ? (
                record.external_data.prescriptions.map((p: any, idx: number) => (
                  <PrescriptionCard key={idx} {...p} />
                ))
              ) : (
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>No prescriptions recorded.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Allergies */}
          <div className="glass" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4 style={{ fontWeight: '700' }}>Allergies</h4>
              <Shield size={18} color="#ef4444" />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                ...(local.allergies?.map((a: any) => a.allergen) || []),
                ...(record?.external_data?.patient?.allergies || [])
              ].filter((v, i, a) => v && a.indexOf(v) === i).length > 0 ? (
                [
                  ...(local.allergies?.map((a: any) => a.allergen) || []),
                  ...(record?.external_data?.patient?.allergies || [])
                ].filter((v, i, a) => v && a.indexOf(v) === i).map((allergen: string, idx: number) => (
                  <span key={idx} style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', fontWeight: '700' }}>
                    {allergen}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '13px', opacity: 0.5 }}>No known allergies</span>
              )}
            </div>
          </div>

          {/* Vaccinations */}
          <div className="glass" style={{ padding: '24px' }}>
            <h4 style={{ fontWeight: '700', marginBottom: '16px' }}>Vaccinations</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                ...(local.vaccinations || []),
                ...(record?.external_data?.patient?.vaccinations?.map((v: string) => ({ vaccine_name: v, administered_date: new Date() })) || [])
              ].length > 0 ? (
                [
                  ...(local.vaccinations || []),
                  ...(record?.external_data?.patient?.vaccinations?.map((v: string) => ({ vaccine_name: v, administered_date: null })) || [])
                ].map((v: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600' }}>{v.vaccine_name}</p>
                    {v.administered_date && <p style={{ fontSize: '12px', opacity: 0.5 }}>{new Date(v.administered_date).toLocaleDateString()}</p>}
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', opacity: 0.5 }}>No records found</p>
              )}
            </div>
          </div>

          {/* Chronic Conditions */}
          <div className="glass" style={{ padding: '24px' }}>
            <h4 style={{ fontWeight: '700', marginBottom: '16px' }}>Chronic Conditions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ...(local.conditions?.map((c: any) => c.condition_name) || []),
                ...(record?.external_data?.patient?.chronic_conditions || [])
              ].filter((v, i, a) => v && a.indexOf(v) === i).length > 0 ? (
                [
                  ...(local.conditions?.map((c: any) => c.condition_name) || []),
                  ...(record?.external_data?.patient?.chronic_conditions || [])
                ].filter((v, i, a) => v && a.indexOf(v) === i).map((conditionName: string, idx: number) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <AlertCircle size={14} color="var(--accent)" />
                    <p style={{ fontSize: '14px' }}>{conditionName}</p>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', opacity: 0.5 }}>Healthy status confirmed</p>
              )}
            </div>
          </div>

          {/* Clinical Notes */}
          <div className="glass" style={{ padding: '24px' }}>
            <h4 style={{ fontWeight: '700', marginBottom: '16px' }}>Clinical Notes</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {local.notes?.length > 0 ? (
                local.notes.map((note: any, idx: number) => (
                  <div key={idx} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontSize: '11px', opacity: 0.4, marginBottom: '4px' }}>{new Date(note.created_at).toLocaleDateString()} • {note.note_type}</p>
                    <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>{note.title}</p>
                    <p style={{ fontSize: '12px', opacity: 0.6 }}>{note.content}</p>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', opacity: 0.5 }}>No shared clinical notes.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function RecordStat({ label, value, icon, color, sub }: any) {
  return (
    <div className="glass" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div style={{ padding: '12px', borderRadius: '12px', background: `${color}15`, color: color }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '12px', opacity: 0.5, marginBottom: '2px' }}>{label}</p>
        <h4 style={{ fontSize: '18px', fontWeight: '800' }}>{value}</h4>
        {sub && <p style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>{sub}</p>}
      </div>
    </div>
  );
}

function VitalRow({ recorded_at, heart_rate, systolic_bp, diastolic_bp, temperature }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 40px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Clock size={16} opacity={0.3} />
        <span style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(recorded_at).toLocaleDateString()}</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '11px', opacity: 0.4 }}>BPM</p>
        <p style={{ fontWeight: '700' }}>{heart_rate}</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '11px', opacity: 0.4 }}>BP</p>
        <p style={{ fontWeight: '700' }}>{systolic_bp}/{diastolic_bp}</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '11px', opacity: 0.4 }}>TEMP</p>
        <p style={{ fontWeight: '700' }}>{temperature}°C</p>
      </div>
      <ChevronRight size={18} opacity={0.3} />
    </div>
  );
}

function LabRow({ performed_at, test_name, result_value, unit, status }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 1fr', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Calendar size={16} opacity={0.3} />
        <span style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(performed_at).toLocaleDateString()}</span>
      </div>
      <div>
        <h5 style={{ fontSize: '14px', fontWeight: '700' }}>{test_name}</h5>
        <p style={{ fontSize: '12px', opacity: 0.4 }}>{status || 'Completed'}</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>{result_value} <span style={{ fontSize: '12px', opacity: 0.6 }}>{unit}</span></p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Shield size={16} color="#10b981" />
      </div>
    </div>
  );
}

function PrescriptionCard({ prescription_date, doctor_name, medications, status }: any) {
  return (
    <div className="glass" style={{ padding: '16px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '12px', opacity: 0.4 }}>{new Date(prescription_date).toLocaleDateString()}</p>
        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: '700' }}>{status || 'Active'}</span>
      </div>
      <h5 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Dr. {doctor_name}</h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {medications?.map((m: any, idx: number) => (
          <p key={idx} style={{ fontSize: '12px', opacity: 0.6 }}>• {m.medication_name || m}</p>
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ date, title, description, type }: any) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ 
        position: 'absolute', 
        left: '-37px', 
        top: '4px', 
        width: '12px', 
        height: '12px', 
        borderRadius: '50%', 
        background: type === 'appointment' ? 'var(--primary)' : type === 'laboratory' ? 'var(--accent)' : '#ef4444',
        border: '3px solid var(--bg-primary)',
        boxShadow: `0 0 10px ${type === 'appointment' ? 'var(--primary)' : type === 'laboratory' ? 'var(--accent)' : '#ef4444'}40`
      }} />
      <p style={{ fontSize: '12px', fontWeight: '700', opacity: 0.4, marginBottom: '6px' }}>{new Date(date).toLocaleDateString()}</p>
      <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{title}</h4>
      <p style={{ fontSize: '14px', opacity: 0.6 }}>{description}</p>
    </div>
  );
}
