"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Activity, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      router.push('/dashboard');
    }
  }, [router]);
  const containerVars = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVars = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div style={{ padding: '0 5%', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Hero Section */}
      <motion.section 
        initial="hidden"
        animate="visible"
        variants={containerVars}
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center',
          padding: '100px 0' 
        }}
      >
        <motion.h1 
          variants={itemVars}
          style={{ fontSize: '72px', fontWeight: '900', lineHeight: 1.1, marginBottom: '24px' }}
        >
          Your Health, <br />
          <span className="gradient-text">Redefined by Technology</span>
        </motion.h1>
        
        <motion.p 
          variants={itemVars}
          style={{ fontSize: '20px', opacity: 0.7, maxWidth: '700px', marginBottom: '40px' }}
        >
          MyHeart is an advanced microservices-driven healthcare platform designed to connect patients, 
          doctors, and laboratories in a seamless, secure ecosystem.
        </motion.p>

        <motion.div variants={itemVars} style={{ display: 'flex', gap: '20px' }}>
          <Link href="/auth/register" className="btn-primary" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Get Started Now <ArrowRight size={20} />
          </Link>
          <button className="glass" style={{ padding: '12px 24px', fontWeight: '600' }}>
            Learn More
          </button>
        </motion.div>
      </motion.section>

      {/* Features Grid */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVars}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '30px',
          paddingBottom: '100px'
        }}
      >
        <FeatureCard 
          icon={<Shield size={32} color="var(--accent)" />}
          title="Secure Records"
          description="Your medical data is encrypted and stored using state-of-the-art security protocols."
        />
        <FeatureCard 
          icon={<Zap size={32} color="var(--primary)" />}
          title="Instant Notifications"
          description="Real-time updates for appointments, lab results, and prescriptions via Kafka."
        />
        <FeatureCard 
          icon={<Activity size={32} color="var(--secondary)" />}
          title="Live Monitoring"
          description="Connect with your doctors instantly for live health status updates and consultations."
        />
        <FeatureCard 
          icon={<Users size={32} color="#fbbf24" />}
          title="Collaborative Care"
          description="A shared ecosystem for doctors and pharmacies to ensure complete patient care."
        />
      </motion.section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <motion.div 
      variants={{
        hidden: { scale: 0.9, opacity: 0 },
        visible: { scale: 1, opacity: 1 }
      }}
      whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.05)' }}
      className="glass" 
      style={{ padding: '40px', transition: 'background-color 0.3s ease' }}
    >
      <div style={{ marginBottom: '20px' }}>{icon}</div>
      <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>{title}</h3>
      <p style={{ opacity: 0.6, fontSize: '16px', lineHeight: 1.6 }}>{description}</p>
    </motion.div>
  );
}
