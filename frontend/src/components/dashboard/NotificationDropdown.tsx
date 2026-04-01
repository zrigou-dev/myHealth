"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Clock, Trash2, MailOpen } from 'lucide-react';
import api from '@/services/api';

interface Notification {
  id: number;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  type: string;
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log('🔔 Fetching notifications...');
      const res = await api.get('/notifications/my');
      console.log('🔔 Notifications received:', res.data);
      setNotifications(res.data || []);
    } catch (err) {
      console.error('🔔 Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => markAsRead(n.id)));
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        className="glass" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '10px', 
          borderRadius: '12px', 
          position: 'relative',
          transition: 'all 0.2s ease',
          background: isOpen ? 'rgba(255,255,255,0.15)' : undefined,
          border: isOpen ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--glass-border)'
        }}
      >
        <Bell size={20} style={{ color: unreadCount > 0 ? 'var(--primary)' : 'white' }} />
        {unreadCount > 0 && (
          <div style={{ 
            position: 'absolute', 
            top: '-2px', 
            right: '-2px', 
            width: '18px', 
            height: '18px', 
            background: 'var(--secondary)', 
            color: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            border: '2px solid #0a0a0c'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="glass dropdown-animation" style={{
          position: 'absolute',
          top: '55px',
          right: '0',
          width: '380px',
          maxHeight: '500px',
          borderRadius: '20px',
          overflow: 'hidden',
          zIndex: 1000,
          background: 'rgba(15, 15, 20, 0.98)', // Very opaque for readability
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ 
            padding: '15px 20px', 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Notifications</h3>
            {/* {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
              >
                Mark all as read
              </button>
            )} */}
          </div>

          <div style={{ 
            overflowY: 'auto', 
            flex: 1,
            padding: '10px 0'
          }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
                <Clock size={24} className="spin" style={{ marginBottom: '10px' }} />
                <p>Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '60px 40px', textAlign: 'center', opacity: 0.5 }}>
                <Bell size={32} style={{ marginBottom: '15px' }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  style={{
                    padding: '15px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s ease',
                    cursor: notification.is_read ? 'default' : 'pointer',
                    background: notification.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                    position: 'relative'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = notification.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.05)'}
                >
                  {!notification.is_read && (
                    <div style={{
                      position: 'absolute',
                      left: '8px',
                      top: '22px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--primary)'
                    }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: notification.is_read ? '500' : '700',
                      color: notification.is_read ? 'rgba(255,255,255,0.7)' : 'white'
                    }}>
                      {notification.subject}
                    </span>
                    <span style={{ fontSize: '11px', opacity: 0.4 }}>
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '13px', 
                    opacity: notification.is_read ? 0.5 : 0.8,
                    lineHeight: '1.4',
                    marginBottom: '8px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }} dangerouslySetInnerHTML={{ __html: notification.content }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', opacity: 0.3 }}>
                      {formatDate(notification.created_at)}
                    </span>
                    {!notification.is_read && (
                      <Check size={14} style={{ color: 'var(--primary)' }} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ 
            padding: '12px', 
            textAlign: 'center', 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <button style={{ 
              fontSize: '13px', 
              fontWeight: '600', 
              opacity: 0.6,
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
