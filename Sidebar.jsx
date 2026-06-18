import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';

const navItems = [
  { to: '/dashboard', icon: '📊', key: 'dashboard' },
  { to: '/inventory', icon: '📦', key: 'inventory', badge: 'lowStock' },
  { to: '/stock-movements', icon: '📜', key: 'stockHistory' },
  { divider: true },
  { to: '/sales', icon: '🛒', key: 'sales' },
  { to: '/purchases', icon: '🚚', key: 'purchases' },
  { to: '/customers', icon: '🧑‍💼', key: 'customers' },
  { to: '/suppliers', icon: '🏭', key: 'suppliers' },
  { to: '/credit', icon: '💳', key: 'credit' },
  { divider: true },
  { to: '/staff', icon: '👥', key: 'staff' },
  { to: '/expenses', icon: '🧾', key: 'expenses' },
  { to: '/reports', icon: '📈', key: 'reports' },
  { to: '/profit-loss', icon: '💹', key: 'profitLoss' },
  { divider: true },
  { to: '/stores', icon: '🏪', key: 'stores' },
  { to: '/cash', icon: '💵', key: 'cash' },
  { to: '/users', icon: '👤', key: 'users' },
  { to: '/backup', icon: '💾', key: 'backup' },
];

const roleLabels = {
  admin: { en: 'Administrator', so: 'Maamulaha' },
  manager: { en: 'Manager', so: 'Direktarka' },
  cashier: { en: 'Cashier', so: 'Kaasiirka' },
  storekeeper: { en: 'Store Keeper', so: 'Difaaca Bakhaarka' },
};

export default function Sidebar({ lowStockCount = 0 }) {
  const { user, logout } = useAuth();
  const { lang, toggleLang, t } = useLang();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: '#1D9E75', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📚</div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#1D9E75' }}>EasyBook</div>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>
              {lang === 'so' ? 'Maamulka Ganacsi' : 'Business Manager'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        <div style={{ padding: '10px 14px 4px', fontSize: '10px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {lang === 'so' ? 'Guud' : 'Overview'}
        </div>

        {navItems.map((item, i) => {
          if (item.divider) {
            return <div key={i} style={{ height: '1px', background: '#f3f4f6', margin: '6px 12px' }}></div>;
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive ? 'nav-active' : ''}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 16px',
                fontSize: '13px',
                color: isActive ? '#0F6E56' : '#4b5563',
                textDecoration: 'none',
                borderLeft: isActive ? '3px solid #1D9E75' : '3px solid transparent',
                background: isActive ? '#E1F5EE' : 'transparent',
                fontWeight: isActive ? '600' : '400',
                transition: 'all 0.15s',
                cursor: 'pointer',
              })}
            >
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{t(item.key)}</span>
              {item.badge === 'lowStock' && lowStockCount > 0 && (
                <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', borderRadius: '999px', padding: '1px 6px', fontWeight: '600' }}>
                  {lowStockCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px' }}>
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', fontSize: '12px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}
        >
          🌐 {lang === 'so' ? 'Switch to English' : 'Ku Beddel Soomaali'}
        </button>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', background: '#E1F5EE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: '#0F6E56', flexShrink: 0 }}>
            {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>{roleLabels[user?.role]?.[lang] || user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            title={t('logout')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', flexShrink: 0 }}
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
}
