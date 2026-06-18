import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { API } from '../../context/AuthContext';

export default function Layout({ children, title }) {
  const [notifications, setNotifications] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchLowStockCount();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      if (res.data.success) setNotifications(res.data.data);
    } catch (e) {}
  };

  const fetchLowStockCount = async () => {
    try {
      const res = await API.get('/dashboard');
      if (res.data.success) setLowStockCount(res.data.data.totals.low_stock_count || 0);
    } catch (e) {}
  };

  const markNotifRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {}
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar lowStockCount={lowStockCount} />
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} notifications={notifications} onMarkRead={markNotifRead} />
        <main style={{ flex: 1, padding: '24px', maxWidth: '1400px', width: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
