import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const ROLE_INFO = {
  admin: { en: 'Administrator', so: 'Maamulaha', color: '#7c3aed', icon: '👑' },
  manager: { en: 'Manager', so: 'Maareeyaha', color: '#185FA5', icon: '💼' },
  cashier: { en: 'Cashier', so: 'Kaasiirka', color: '#1D9E75', icon: '🛒' },
  storekeeper: { en: 'Store Keeper', so: 'Difaaca Bakhaarka', color: '#BA7517', icon: '📦' },
};

export default function UsersPage() {
  const { lang } = useLang();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier', phone: '', branch_id: '' });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchUsers(); fetchBranches(); }, []);

  const fetchUsers = async () => {
    try { const r = await API.get('/users'); setUsers(r.data.data || []); } catch (e) {}
  };
  const fetchBranches = async () => {
    try { const r = await API.get('/branches'); setBranches(r.data.data || []); } catch (e) {}
  };

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  const openAdd = () => { setEditUser(null); setForm({ name: '', email: '', password: '', role: 'cashier', phone: '', branch_id: '' }); setShowModal(true); };
  const openEdit = (u) => { setEditUser(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', branch_id: u.branch_id || '' }); setShowModal(true); };

  const saveUser = async () => {
    if (!form.name || !form.email || (!editUser && !form.password)) {
      return showMsg('error', lang === 'so' ? 'Buuxi dhammaan goobaha waajibka ah' : 'Fill in all required fields');
    }
    setSaving(true);
    try {
      if (editUser) {
        await API.put(`/users/${editUser.id}`, form);
        showMsg('success', lang === 'so' ? 'Isticmaalaha waa la cusbooneysiiyay ✓' : 'User updated ✓');
      } else {
        await API.post('/users', form);
        showMsg('success', lang === 'so' ? 'Isticmaale cusub waa la abuuray ✓' : 'User created ✓');
      }
      setShowModal(false);
      fetchUsers();
    } catch (e) { showMsg('error', e.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const toggleActive = async (u) => {
    try {
      const r = await API.put(`/users/${u.id}/toggle-active`);
      showMsg('success', r.data.message);
      fetchUsers();
    } catch (e) { showMsg('error', e.response?.data?.message || 'Error'); }
  };

  const doResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return showMsg('error', lang === 'so' ? 'Password-ku waa inuu ka badan yahay 6 xaraf' : 'Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      await API.put(`/users/${showResetModal.id}/reset-password`, { new_password: newPassword });
      showMsg('success', lang === 'so' ? 'Password-ka waa la beddelay ✓' : 'Password reset ✓');
      setShowResetModal(null);
      setNewPassword('');
    } catch (e) { showMsg('error', e.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  return (
    <Layout title={lang === 'so' ? '👤 Isticmaalayaasha' : '👤 User Management'}>
      {msg && (
        <div style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 200, background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, color: msg.type === 'success' ? '#15803d' : '#b91c1c', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>{lang === 'so' ? 'Isticmaalayaasha Nidaamka' : 'System Users'}</h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>{users.length} {lang === 'so' ? 'isticmaale' : 'users'}</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>➕ {lang === 'so' ? 'Isticmaale Cusub' : 'Add User'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
        {users.map(u => {
          const roleInfo = ROLE_INFO[u.role] || { en: u.role, so: u.role, color: '#6b7280', icon: '👤' };
          const isSelf = currentUser?.id === u.id;
          return (
            <div key={u.id} className="card" style={{ opacity: u.is_active ? 1 : 0.6, borderLeft: `4px solid ${roleInfo.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: roleInfo.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    {roleInfo.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{u.name} {isSelf && <span style={{ fontSize: '11px', color: '#9ca3af' }}>({lang === 'so' ? 'Adiga' : 'You'})</span>}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{u.email}</div>
                  </div>
                </div>
                <span className="badge" style={{ background: roleInfo.color + '20', color: roleInfo.color }}>{lang === 'so' ? roleInfo.so : roleInfo.en}</span>
              </div>

              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                📱 {u.phone || '—'} · 🏪 {u.branch_name || (lang === 'so' ? 'Dhammaan' : 'All branches')}
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>
                  {u.is_active ? (lang === 'so' ? 'Firfircoon' : 'Active') : (lang === 'so' ? 'Joojis' : 'Inactive')}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => openEdit(u)}>✏️</button>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setShowResetModal(u)}>🔑</button>
                  {!isSelf && (
                    <button
                      style={{ padding: '4px 10px', fontSize: '12px', background: u.is_active ? '#fee2e2' : '#dcfce7', border: 'none', borderRadius: '6px', cursor: 'pointer', color: u.is_active ? '#b91c1c' : '#15803d' }}
                      onClick={() => toggleActive(u)}
                    >
                      {u.is_active ? '🚫' : '✅'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700' }}>
              {editUser ? (lang === 'so' ? '✏️ Tafatir Isticmaalaha' : '✏️ Edit User') : (lang === 'so' ? '➕ Isticmaale Cusub' : '➕ Add New User')}
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label className="form-label">{lang === 'so' ? 'Magaca Buuxa *' : 'Full Name *'}</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={lang === 'so' ? 'Magaca...' : 'Full name...'} />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@easybook.so" />
              </div>
              {!editUser && (
                <div>
                  <label className="form-label">{lang === 'so' ? 'Password *' : 'Password *'}</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">{lang === 'so' ? 'Doorka' : 'Role'}</label>
                  <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="admin">{lang === 'so' ? 'Maamulaha' : 'Admin'}</option>
                    <option value="manager">{lang === 'so' ? 'Maareeyaha' : 'Manager'}</option>
                    <option value="cashier">{lang === 'so' ? 'Kaasiirka' : 'Cashier'}</option>
                    <option value="storekeeper">{lang === 'so' ? 'Difaaca Bakhaarka' : 'Store Keeper'}</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">{lang === 'so' ? 'Telefoonka' : 'Phone'}</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+252..." />
                </div>
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Xarunta' : 'Branch'}</label>
                <select className="form-input" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">{lang === 'so' ? 'Dhammaan xaruumaha' : 'All branches'}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>{lang === 'so' ? 'Jooji' : 'Cancel'}</button>
              <button className="btn-primary" onClick={saveUser} disabled={saving}>{saving ? '...' : (lang === 'so' ? '💾 Keydi' : '💾 Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="modal-backdrop" onClick={() => setShowResetModal(null)}>
          <div className="modal" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>🔑 {lang === 'so' ? 'Beddel Password' : 'Reset Password'}</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '14px' }}>{showResetModal.name} ({showResetModal.email})</p>
            <label className="form-label">{lang === 'so' ? 'Password Cusub' : 'New Password'}</label>
            <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => { setShowResetModal(null); setNewPassword(''); }}>{lang === 'so' ? 'Jooji' : 'Cancel'}</button>
              <button className="btn-primary" onClick={doResetPassword} disabled={saving}>{saving ? '...' : (lang === 'so' ? '🔑 Beddel' : '🔑 Reset')}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
