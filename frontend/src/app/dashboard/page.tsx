"use client";

import React, { useEffect, useState } from 'react';
import PatientView from '@/components/dashboard/PatientView';
import DoctorView from '@/components/dashboard/DoctorView';
import PharmacistView from '@/components/dashboard/PharmacistView';
import LabView from '@/components/dashboard/LabView';
import AdminView from '@/components/dashboard/AdminView';

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setRole(user.role);
    }
  }, []);

  if (!role) return <div>Loading dashboard...</div>;

  switch (role) {
    case 'patient':
      return <PatientView />;
    case 'doctor':
      return <DoctorView />;
    case 'admin':
      return <AdminView />;
    case 'pharmacy':
      return <PharmacistView />;
    case 'lab':
      return <LabView />;
    default:
      return <div>Role not recognized. Please contact support.</div>;
  }
}
