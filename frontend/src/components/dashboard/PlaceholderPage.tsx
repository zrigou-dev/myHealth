"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Construction, 
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';

export default function PlaceholderPage({ title, description }: { title: string, description: string }) {
  return (
    <div style={{ maxWidth: '800px', margin: '100px auto', textAlign: 'center' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass" 
        style={{ padding: '60px' }}
      >
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '50%', 
          background: 'rgba(99, 102, 241, 0.1)', 
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 30px'
        }}>
          <Construction size={40} />
        </div>
        
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>{title}</h1>
        <p style={{ opacity: 0.6, fontSize: '18px', marginBottom: '40px', lineHeight: '1.6' }}>{description}</p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/dashboard">
            <button className="btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LayoutDashboard size={18} /> Back to Overview
            </button>
          </Link>
          <button onClick={() => window.history.back()} className="glass" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={18} /> Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
