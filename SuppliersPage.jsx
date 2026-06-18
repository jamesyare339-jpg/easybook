import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const fmt = (n) => '$' + Number(n || 0).toFixed(2);

export default function SuppliersPage() {
  const { lang } = useLang();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [detailSupplier, setDetailSupplier] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const r = await API.get('/suppliers' + params);
      setSuppliers(r.data.data || []);
    } catch (e) {}
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  const openAdd = () => { setEditSupplier(null); setForm({ name: '', phone: '', address: '' }); setShowModal(true); };
  const openEdit = (s) => { setEditSupplier(s); setForm({ name: s.name, phone: s.phone || '', address: s.address || '' }); setShowModal(true); };

  const viewDetail = async (s) => {
    try {
      const r = await API.get(`/suppliers/${s.id}`);
      setDetailSupplier(r.data.data);
    } catch (e) { showMsg('error', 'Error loading details'); }
  };

  const saveSupplier = async () => {
    if (!form.name) return showMsg('error', lang === 'so' ? 'Magaca ku buuxi' : 'Name is required');
    setSaving(true);
    try {
      if (editSupplier) {
        await API.put(`/suppliers/${editSupplier.id}`, form);
        showMsg('success', lang === 'so' ? 'Supplier-ka waa la cusbooneysiiyay ✓' : 'Supplier updated ✓');
      } else {
        await API.post('/suppliers', form);
        showMsg('success', lang === 'so' ? 'Supplier cusub waa la daray ✓' : 'Supplier added ✓');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (e) { showMsg('error', e.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const deleteSupplier = async (s) => {
    if (!window.confirm(lang === 'so' ? `Ma hubtaa inaad tirtirto ${s.name}?` : `Delete ${s.name}?`)) return;
    try {
      await API.delete(`/suppliers/${s.id}`);
      showMsg('success', lang === 'so' ? 'Supplier-ka waa la tirtiray ✓' : 'Supplier deleted ✓');
      fetchSuppliers();
    } catch (e) { showMsg('error', e.response?.data?.message || 'Cannot delete'); }
  };

  const totalDebt = suppliers.reduce((s, c) => s + parseFloat(c.total_debt || 0), 0);

  return (
    <Layout title={lang === 'so' ? '🏭 Saplaayaasha' : '🏭 Suppliers'}>
      {msg && (
        <div style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 200, background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, color: msg.type === 'success' ? '#15803d' : '#b91c1c', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid #185FA5' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{lang === 'so' ? 'Wadarta Saplaayaasha' : 'Total Suppliers'}</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#185FA5' }}>{suppliers.length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{lang === 'so' ? 'Wadarta Ku Lehenahay' : 'Total We Owe'}</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b' }}>{fmt(totalDebt)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: '280px' }} placeholder={lang === 'so' ? '🔍 Raadso supplier...' : '🔍 Search suppliers...'} value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn-primary" onClick={openAdd}>➕ {lang === 'so' ? 'Supplier Cusub' : 'Add Supplier'}</button>
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
                <th>{lang === 'so' ? 'Lacagta Lagu Leeyahay' : 'We Owe'}</th>
                <th>{lang === 'so' ? 'Hawlaha' : 'Actions'}</th>
              </tr></thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>{lang === 'so' ? 'Supplier lama helin' : 'No suppliers found'}</td></tr>
                ) : suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '600', cursor: 'pointer' }} onClick={() => viewDetail(s)}>{s.name}</td>
                    <td style={{ color: '#6b7280', fontSize: '13px' }}>{s.phone || '—'}</td>
                    <td style={{ color: '#9ca3af', fontSize: '12px' }}>{s.address || '—'}</td>
                    <td>{s.total_orders || 0}</td>
                    <td style={{ fontWeight: '700', color: parseFloat(s.total_debt) > 0 ? '#f59e0b' : '#9ca3af' }}>{fmt(s.total_debt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => viewDetail(s)}>👁️</button>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => openEdit(s)}>✏️</button>
                        <button style={{ padding: '4px 10px', fontSize: '12px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#b91c1c' }} onClick={() => deleteSupplier(s)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700' }}>
              {editSupplier ? (lang === 'so' ? '✏️ Tafatir Supplier' : '✏️ Edit Supplier') : (lang === 'so' ? '➕ Supplier Cusub' : '➕ Add Supplier')}
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label className="form-label">{lang === 'so' ? 'Magaca *' : 'Name *'}</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={lang === 'so' ? 'Magaca supplier-ka...' : 'Supplier name...'} />
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
              <button className="btn-primary" onClick={saveSupplier} disabled={saving}>{saving ? '...' : (lang === 'so' ? '💾 Keydi' : '💾 Save')}</button>
            </div>
          </div>
        </div>
      )}

      {detailSupplier && (
        <div className="modal-backdrop" onClick={() => setDetailSupplier(null)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>{detailSupplier.name}</h3>
              <button onClick={() => setDetailSupplier(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{lang === 'so' ? 'Telefoonka' : 'Phone'}</div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{detailSupplier.phone || '—'}</div>
              </div>
              <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{lang === 'so' ? 'Lagu Leeyahay' : 'We Owe'}</div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#92400e' }}>{fmt(detailSupplier.total_debt)}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>🚚 {lang === 'so' ? 'Iibsiga Dambe' : 'Recent Purchases'}</h4>
            <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '16px' }}>
              {(detailSupplier.recent_purchases || []).length === 0 ? (
                <div style={{ fontSize: '13px', color: '#9ca3af', padding: '8px 0' }}>{lang === 'so' ? 'Iibsi lama helin' : 'No purchases yet'}</div>
              ) : detailSupplier.recent_purchases.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  <span style={{ fontWeight: '600', color: '#185FA5' }}>{fmt(p.total_amount)}</span>
                </div>
              ))}
            </div>

            {(detailSupplier.debts || []).length > 0 && (
              <>
                <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>💳 {lang === 'so' ? 'Deymaha Furan' : 'Open Debts'}</h4>
                {detailSupplier.debts.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                    <span>{lang === 'so' ? 'Bixinta:' : 'Due:'} {d.due_date ? new Date(d.due_date).toLocaleDateString() : '—'}</span>
                    <span style={{ fontWeight: '600', color: '#f59e0b' }}>{fmt(d.remaining)}</span>
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
