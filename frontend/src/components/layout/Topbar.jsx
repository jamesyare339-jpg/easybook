import React, { useState } from 'react';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';

export default function Topbar({ title, notifications = [], onMarkRead }) {
  const [showNotif, setShowNotif] = useState(false);
  const { lang } = useLang();
  const { user } = useAuth();
  const unread = notifications.filter(n => !n.is_read);

  return (
    <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
      <div style={{ fontSize: '16px', fontWeight: '600', color: '#111' }}>{title}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Branch badge */}
        {user?.branch_name && (
          <span style={{ background: '#E1F5EE', color: '#0F6E56', fontSize: '12px', padding: '4px 10px', borderRadius: '99px', fontWeight: '500' }}>
            🏪 {user.branch_name}
          </span>
        )}

        {/* Notifications bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotif(v => !v)}
            style={{ background: unread.length > 0 ? '#fef3c7' : '#f9fafb', border: `1px solid ${unread.length > 0 ? '#fcd34d' : '#e5e7eb'}`, borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          >
            🔔
            {unread.length > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '10px', borderRadius: '99px', padding: '1px 5px', fontWeight: '600' }}>
                {unread.length}
              </span>
            )}
          </button>

          {showNotif && (
            <div style={{ position: 'absolute', right: 0, top: '44px', width: '300px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: '600', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                <span>🔔 {lang === 'so' ? 'Ogeysiisyada' : 'Notifications'}</span>
                <span style={{ fontSize: '12px', color: '#1D9E75', cursor: 'pointer' }} onClick={() => setShowNotif(false)}>✕</span>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                  {lang === 'so' ? 'Ogeysiis lama helin' : 'No notifications'}
                </div>
              ) : (
                notifications.slice(0, 8).map(n => (
                  <div
                    key={n.id}
                    onClick={() => { onMarkRead && onMarkRead(n.id); }}
                    style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: n.is_read ? 'transparent' : '#fffbeb' }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>{n.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{n.message}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
