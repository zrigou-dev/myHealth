"use client";

import React, { useEffect, useState } from 'react';
import { 
  Save, 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  User,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const userRes = await api.get('/auth/me');
        if (!isMounted) return;
        setUser(userRes.data);
        
        let rolePath = '';
        if (userRes.data?.role === 'patient') rolePath = '/patients/profile';
        else if (userRes.data?.role === 'doctor') rolePath = '/doctors/profile';

        if (rolePath) {
          try {
            const profileRes = await api.get(rolePath);
            if (!isMounted) return;
            setProfile(profileRes.data || {});
            setIsNewProfile(false);
          } catch (pErr: any) {
            if (pErr.response?.status === 404) {
              setProfile({});
              setIsNewProfile(true);
            } else {
              throw pErr;
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching profile:', err);
          if (err.response?.status === 429) {
            toast.error('Too many requests. Please slow down.');
          } else {
            toast.error('Failed to load profile.');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    e.preventDefault();
    setSaving(true);

    try {
      let rolePath = '';
      if (user?.role === 'patient') rolePath = '/patients/profile';
      else if (user?.role === 'doctor') rolePath = '/doctors/profile';

      const authUpdate = api.put('/auth/me', { 
        firstName: user?.first_name, 
        lastName: user?.last_name,
        phone: user?.phone 
      });

      // Clean profile data (convert empty strings/NaN/invalid values to null for optional fields)
      const cleanedProfile = { ...profile };
      Object.keys(cleanedProfile).forEach(key => {
        const val = cleanedProfile[key];
        if (val === "" || val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
          cleanedProfile[key] = null;
        } else if (typeof val === 'string' && val.trim() === "") {
          cleanedProfile[key] = null;
        }
      });

      let roleUpdate;
      if (rolePath) {
        if (isNewProfile) {
          roleUpdate = api.post(rolePath, cleanedProfile);
        } else {
          roleUpdate = api.put(rolePath, cleanedProfile);
        }
      } else {
        roleUpdate = Promise.resolve();
      }

      await Promise.all([authUpdate, roleUpdate]);

      toast.success('Profile updated successfully!');
      setIsNewProfile(false);
      // Refresh local storage
      localStorage.setItem('user', JSON.stringify({ ...user }));
    } catch (err: any) {
      console.error('Update error details:', err.response?.data);
      const errorDetail = err.response?.data?.errors?.[0]?.msg || err.response?.data?.errors?.[0]?.message;
      const errorMsg = errorDetail || err.response?.data?.error || 'Failed to update profile.';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '80px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading your profile...</div>;

  if (!user) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px' }}>Unable to load profile</h2>
        <p style={{ opacity: 0.7, marginBottom: '20px' }}>Please try again later.</p>
        <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: '10px 24px' }}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6, marginBottom: '24px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
        <div className="glass" style={{ 
          width: '100px', 
          height: '100px', 
          borderRadius: '30px', 
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontWeight: '900', color: 'white'
        }}>
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>{user?.first_name} {user?.last_name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.6 }}>
            <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
            <span>•</span>
            <span>{user?.email}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* Basic Info */}
        <div className="glass" style={{ padding: '30px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', opacity: 0.8 }}>
            <User size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Personal Information</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>First Name</label>
              <input 
                value={user?.first_name || ''} 
                onChange={(e) => setUser({...user, first_name: e.target.value})}
                className="glass" 
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Last Name</label>
              <input 
                value={user?.last_name || ''} 
                onChange={(e) => setUser({...user, last_name: e.target.value})}
                className="glass" 
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Phone Number</label>
              <input 
                value={user?.phone || ''} 
                onChange={(e) => setUser({...user, phone: e.target.value})}
                className="glass" 
                placeholder="+1 234 567 890"
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Email (Immutable)</label>
              <input 
                value={user?.email || ''} 
                disabled
                className="glass" 
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.02)', opacity: 0.5, color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px', cursor: 'not-allowed' }} 
              />
            </div>
          </div>
        </div>

        {/* Role Specific Info */}
        {user?.role === 'patient' && (
          <div className="glass" style={{ padding: '30px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', opacity: 0.8 }}>
              <Stethoscope size={20} color="var(--secondary)" />
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Medical File</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Date of Birth</label>
                <input 
                  type="date"
                  value={profile?.date_of_birth ? profile.date_of_birth.split('T')[0] : ''} 
                  onChange={(e) => setProfile({...profile, date_of_birth: e.target.value})}
                  className="glass" 
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Gender</label>
                <select 
                  value={profile?.gender || ''} 
                  onChange={(e) => setProfile({...profile, gender: e.target.value})}
                  className="glass" 
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Blood Type</label>
                <select 
                  value={profile?.blood_type || ''} 
                  onChange={(e) => setProfile({...profile, blood_type: e.target.value})}
                  className="glass" 
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                >
                  <option value="">Select...</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Height (cm)</label>
                <input 
                  type="number"
                  value={profile?.height || ''} 
                  onChange={(e) => setProfile({...profile, height: parseFloat(e.target.value)})}
                  className="glass" 
                  placeholder="175"
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Weight (kg)</label>
                <input 
                  type="number"
                  value={profile?.weight || ''} 
                  onChange={(e) => setProfile({...profile, weight: parseFloat(e.target.value)})}
                  className="glass" 
                  placeholder="70"
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>BMI Status</label>
                <div 
                  className="glass" 
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.02)', color: profile?.height && profile?.weight ? '#10b981' : 'rgba(255,255,255,0.3)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '14px', fontWeight: '700' }}
                >
                  {(() => {
                    if (!profile?.height || !profile?.weight) return 'Enter H/W';
                    const bmi = profile.weight / Math.pow(profile.height / 100, 2);
                    if (bmi < 18.5) return `BMI: ${bmi.toFixed(1)} (Underweight)`;
                    if (bmi < 25) return `BMI: ${bmi.toFixed(1)} (Normal)`;
                    if (bmi < 30) return `BMI: ${bmi.toFixed(1)} (Overweight)`;
                    return `BMI: ${bmi.toFixed(1)} (Obese)`;
                  })()}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Allergies (Comma separated)</label>
                <input 
                  value={Array.isArray(profile?.allergies) ? profile.allergies.join(', ') : profile?.allergies || ''} 
                  onChange={(e) => setProfile({...profile, allergies: e.target.value.split(',').map((s: string) => s.trim())})}
                  className="glass" 
                  placeholder="Peanuts, Penicillin..."
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Vaccinations (Comma separated)</label>
                <input 
                  value={Array.isArray(profile?.vaccinations) ? profile.vaccinations.join(', ') : profile?.vaccinations || ''} 
                  onChange={(e) => setProfile({...profile, vaccinations: e.target.value.split(',').map((s: string) => s.trim())})}
                  className="glass" 
                  placeholder="COVID-19, Flu..."
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Chronic Conditions (Comma separated)</label>
              <textarea 
                value={Array.isArray(profile?.chronic_conditions) ? profile.chronic_conditions.join(', ') : profile?.chronic_conditions || ''} 
                onChange={(e) => setProfile({...profile, chronic_conditions: e.target.value.split(',').map((s: string) => s.trim())})}
                className="glass" 
                placeholder="Diabetes, Hypertension..."
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', minHeight: '80px', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
              />
            </div>

            <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px' }}>Emergency Contact</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12px', opacity: 0.6, marginBottom: '5px', display: 'block' }}>Contact Name</label>
                  <input 
                    value={profile?.emergency_contact_name || ''} 
                    onChange={(e) => setProfile({...profile, emergency_contact_name: e.target.value})}
                    className="glass" 
                    placeholder="Jane Doe"
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '10px' }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '12px', opacity: 0.6, marginBottom: '5px', display: 'block' }}>Contact Phone</label>
                  <input 
                    value={profile?.emergency_contact_phone || ''} 
                    onChange={(e) => setProfile({...profile, emergency_contact_phone: e.target.value})}
                    className="glass" 
                    placeholder="+1 234..."
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '10px' }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '12px', opacity: 0.6, marginBottom: '5px', display: 'block' }}>Relation</label>
                  <input 
                    value={profile?.emergency_contact_relation || ''} 
                    onChange={(e) => setProfile({...profile, emergency_contact_relation: e.target.value})}
                    className="glass" 
                    placeholder="Spouse, Parent..."
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '10px' }} 
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px' }}>Insurance Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12px', opacity: 0.6, marginBottom: '5px', display: 'block' }}>Provider</label>
                  <input 
                    value={profile?.insurance_provider || ''} 
                    onChange={(e) => setProfile({...profile, insurance_provider: e.target.value})}
                    className="glass" 
                    placeholder="BlueShield, Aetna..."
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '10px' }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '12px', opacity: 0.6, marginBottom: '5px', display: 'block' }}>Policy Number</label>
                  <input 
                    value={profile?.insurance_policy_number || ''} 
                    onChange={(e) => setProfile({...profile, insurance_policy_number: e.target.value})}
                    className="glass" 
                    placeholder="POL-123456"
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '10px' }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '12px', opacity: 0.6, marginBottom: '5px', display: 'block' }}>Expiry Date</label>
                  <input 
                    type="date"
                    value={profile?.insurance_expiry_date ? profile.insurance_expiry_date.split('T')[0] : ''} 
                    onChange={(e) => setProfile({...profile, insurance_expiry_date: e.target.value})}
                    className="glass" 
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '10px' }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {user?.role === 'doctor' && (
          <div className="glass" style={{ padding: '30px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', opacity: 0.8 }}>
              <Briefcase size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Professional Profile</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>License Number *</label>
                <input 
                  value={profile?.license_number || ''} 
                  onChange={(e) => setProfile({...profile, license_number: e.target.value})}
                  required
                  className="glass" 
                  placeholder="MED-123456"
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Specialization *</label>
                <input 
                  value={profile?.specialization || ''} 
                  onChange={(e) => setProfile({...profile, specialization: e.target.value})}
                  required
                  className="glass" 
                  placeholder="Cardiology"
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Years of Experience</label>
                <input 
                  type="number"
                  value={profile?.years_experience || ''} 
                  onChange={(e) => setProfile({...profile, years_experience: parseInt(e.target.value) || 0})}
                  className="glass" 
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Consultation Fee ($)</label>
                <input 
                  type="number"
                  value={profile?.consultation_fee || ''} 
                  onChange={(e) => setProfile({...profile, consultation_fee: parseFloat(e.target.value) || 0})}
                  className="glass" 
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', display: 'block' }}>Biography</label>
              <textarea 
                value={profile?.bio || ''} 
                onChange={(e) => setProfile({...profile, bio: e.target.value})}
                className="glass" 
                placeholder="Briefly describe your medical background and expertise..."
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', minHeight: '100px', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px' }} 
              />
            </div>
          </div>
        )}

        {/* Messaging handled by toasts */}

        <button 
          type="submit" 
          disabled={saving}
          className="btn-primary" 
          style={{ width: '100%', padding: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: '700' }}
        >
          {saving ? 'Synchronizing with backend...' : <><Save size={20} /> Save All Changes</>}
        </button>
      </form>
    </div>
  );
}
