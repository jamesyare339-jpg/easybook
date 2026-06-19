import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const fmt = (n) => '$' + Number(n || 0).toFixed(2);

export default function CustomersPage() {
  const { lang } = useLang();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const r = await API.get('/customers' + params);
      setCustomers(r.data.data || []);
    } catch (e) {}
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  const openAdd = () => { setEditCustomer(null); setForm({ name: '', phone: '', address: '' }); setShowModal(true); };
  const openEdit = (c) => { setEditCustomer(c); setForm({ name: c.name, phone: c.phone || '', address: c.address || '' }); setShowModal(true); };

  const viewDetail = async (c) => {
    try {
      const r = await API.get(`/customers/${c.id}`);
      setDetailCustomer(r.data.data);
    } catch (e) { showMsg('error', 'Error loading details'); }
  };

  const saveCustomer = async () => {
    if (!form.name) return showMsg('error', lang === 'so' ? 'Magaca ku buuxi' : 'Name is required');
    setSaving(true);
    try {
      if (editCustomer) {
        await API.put(`/customers/${editCustomer.id}`, form);
        showMsg('success', lang === 'so' ? 'Macaamilka waa la cusbooneysiiyay ✓' : 'Customer updated ✓');
      } else {
        await API.post('/customers', form);
        showMsg('success', lang === 'so' ? 'Macaamil cusub waa la daray ✓' : 'Customer added ✓');
      }
      setShowModal(false);
      fetchCustomers();
    } catch (e) { showMsg('error', e.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const deleteCustomer = async (c) => {
    if (!window.confirm(lang === 'so' ? `Ma hubtaa inaad tirtirto ${c.name}?` : `Delete ${c.name}?`)) return;
    try {
      await API.delete(`/customers/${c.id}`);
      showMsg('success', lang === 'so' ? 'Macaamilka waa la tirtiray ✓' : 'Customer deleted ✓');
      fetchCustomers();
    } catch (e) { showMsg('error', e.response?.data?.message || 'Cannot delete'); }
  };

  const totalDebt = customers.reduce((s, c) => s + parseFloat(c.total_debt || 0), 0);

  return (
    <Layout title={lang === 'so' ? '🧑‍💼 Macaamiisha' : '🧑‍💼 Customers'}>
      {msg && (
        <div style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 200, background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, color: msg.type === 'success' ? '#15803d' : '#b91c1c', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid #1D9E75' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{lang === 'so' ? 'Wadarta Macaamiisha' : 'Total Customers'}</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#1D9E75' }}>{customers.length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{lang === 'so' ? 'Wadarta Deymaha' : 'Total Debt Owed'}</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#ef4444' }}>{fmt(totalDebt)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: '280px' }} placeholder={lang === 'so' ? '🔍 Raadso macaamiil...' : '🔍 Search customers...'} value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn-primary" onClick={openAdd}>➕ {lang === 'so' ? 'Macaamil Cusub' : 'Add Customer'}</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>{lang === 'so' ? 'Magaca' : 'Name'}</th>
                <th>{lang === 'so' ? 'Telefoon' : 'Phone'}</th>
                <th>{lang === 'so' ? 'Cinwaanka' : 'Address'}</th>
                <th>{lang === 'so' ? 'Dalabyada' : 'Orders'}</th>
                <th>{lang === 'so' ? 'Deynta' : 'Debt'}</th>
                <th>{lang === 'so' ? 'Hawlaha' : 'Actions'}</th>
              </tr></thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>{lang === 'so' ? 'Macaamil lama helin' : 'No customers found'}</td></tr>
                ) : customers.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: '600' }} onClick={() => viewDetail(c)}>{c.name}</td>
                    <td style={{ color: '#6b7280', fontSize: '13px' }}>{c.phone || '—'}</td>
                    <td style={{ color: '#9ca3af', fontSize: '12px' }}>{c.address || '—'}</td>
                    <td>{c.total_orders || 0}</td>
                    <td style={{ fontWeight: '700', color: parseFloat(c.total_debt) > 0 ? '#ef4444' : '#9ca3af' }}>{fmt(c.total_debt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => viewDetail(c)}>👁️</button>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => openEdit(c)}>✏️</button>
                        <button style={{ padding: '4px 10px', fontSize: '12px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#b91c1c' }} onClick={() => deleteCustomer(c)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700' }}>
              {editCustomer ? (lang === 'so' ? '✏️ Tafatir Macaamil' : '✏️ Edit Customer') : (lang === 'so' ? '➕ Macaamil Cusub' : '➕ Add Customer')}
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label className="form-label">{lang === 'so' ? 'Magaca *' : 'Name *'}</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={lang === 'so' ? 'Magaca macaamilka...' : 'Customer name...'} />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Telefoonka' : 'Phone'}</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+252..." />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Cinwaanka' : 'Address'}</label>
                <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={lang === 'so' ? 'Cinwaanka (ikhtiyaari)...' : 'Address (optional)...'} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>{lang === 'so' ? 'Jooji' : 'Cancel'}</button>
              <button className="btn-primary" onClick={saveCustomer} disabled={saving}>{saving ? '...' : (lang === 'so' ? '💾 Keydi' : '💾 Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailCustomer && (
        <div className="modal-backdrop" onClick={() => setDetailCustomer(null)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>{detailCustomer.name}</h3>
              <button onClick={() => setDetailCustomer(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{lang === 'so' ? 'Telefoonka' : 'Phone'}</div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{detailCustomer.phone || '—'}</div>
              </div>
              <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{lang === 'so' ? 'Deynta' : 'Total Debt'}</div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#b91c1c' }}>{fmt(detailCustomer.total_debt)}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>🛒 {lang === 'so' ? 'Iibka Dambe' : 'Recent Sales'}</h4>
            <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '16px' }}>
              {(detailCustomer.recent_sales || []).length === 0 ? (
                <div style={{ fontSize: '13px', color: '#9ca3af', padding: '8px 0' }}>{lang === 'so' ? 'Iib lama helin' : 'No sales yet'}</div>
              ) : detailCustomer.recent_sales.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                  <span style={{ fontWeight: '600', color: '#1D9E75' }}>{fmt(s.total_amount)}</span>
                </div>
              ))}
            </div>

            {(detailCustomer.debts || []).length > 0 && (
              <>
                <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>💳 {lang === 'so' ? 'Deymaha Furan' : 'Open Debts'}</h4>
                {detailCustomer.debts.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                    <span>{lang === 'so' ? 'Bixinta:' : 'Due:'} {d.due_date ? new Date(d.due_date).toLocaleDateString() : '—'}</span>
                    <span style={{ fontWeight: '600', color: '#ef4444' }}>{fmt(d.remaining)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
