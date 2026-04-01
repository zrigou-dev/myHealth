"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserPlus, Phone, ArrowRight, AlertCircle, CheckCircle, Activity, Zap, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'patient'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/register', formData);
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        setError(errorData.errors[0].msg);
      } else {
        setError(errorData?.error || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass" style={{ padding: '40px', textAlign: 'center' }}>
          <CheckCircle size={64} color="var(--accent)" style={{ marginBottom: '20px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Registration Successful!</h2>
          <p style={{ opacity: 0.6, marginTop: '10px' }}>Redirecting you to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)', padding: '40px 20px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ width: '100%', maxWidth: '600px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Join MyHeart</h1>
          <p style={{ opacity: 0.6 }}>Complete the form below to create your account</p>
        </div>

        {error && (
          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <AuthInput label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} icon={<User size={18} />} placeholder="John" />
          <AuthInput label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} icon={<User size={18} />} placeholder="Doe" />
          
          <div style={{ gridColumn: '1 / -1' }}>
            <AuthInput label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} icon={<Mail size={18} />} placeholder="john@example.com" />
          </div>

          <AuthInput label="Password" name="password" type="password" value={formData.password} onChange={handleChange} icon={<Lock size={18} />} placeholder="••••••••" />
          <AuthInput label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} icon={<Phone size={18} />} placeholder="+1 (555) 000-0000" />

          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', opacity: 0.8 }}>Select Your Role</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
              gap: '12px' 
            }}>
              {[
                { id: 'patient', label: 'Patient', icon: <User size={20} /> },
                { id: 'doctor', label: 'Doctor', icon: <Activity size={20} /> },
                { id: 'pharmacy', label: 'Pharmacy', icon: <Zap size={20} /> },
                { id: 'lab', label: 'Lab', icon: <Shield size={20} /> },
                { id: 'admin', label: 'Admin', icon: <Lock size={20} /> }
              ].map((role) => (
                <div 
                  key={role.id}
                  onClick={() => setFormData({ ...formData, role: role.id })}
                  className="glass"
                  style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: formData.role === role.id ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                    background: formData.role === role.id ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{ color: formData.role === role.id ? 'var(--primary)' : 'inherit' }}>
                    {role.icon}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{role.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              {loading ? 'Creating Account...' : <>Create Account <UserPlus size={20} /></>}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', opacity: 0.6 }}>
          Already have an account? {' '}
          <Link href="/auth/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}

function AuthInput({ label, name, type = "text", value, onChange, icon, placeholder }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '14px', fontWeight: '600', opacity: 0.8 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>{icon}</span>
        <input 
          type={type} 
          name={name}
          required
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ width: '100%', paddingLeft: '40px' }} 
        />
      </div>
    </div>
  );
}
