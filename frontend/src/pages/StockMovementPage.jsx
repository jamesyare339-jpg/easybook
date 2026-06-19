import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function StockMovementPage() {
  const { lang } = useLang();
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ product_id: '', branch_id: '', type: '', date_from: '', date_to: '' });

  useEffect(() => { fetchFilters(); }, []);
  useEffect(() => { fetchMovements(); }, [filters]);

  const fetchFilters = async () => {
    try {
      const [p, b] = await Promise.all([API.get('/products'), API.get('/branches')]);
      setProducts(p.data.data || []);
      setBranches(b.data.data || []);
    } catch (e) {}
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const r = await API.get('/stock/movements?' + params);
      setMovements(r.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const typeInfo = {
    sale: { icon: '🛒', en: 'Sale', so: 'Iib', color: '#ef4444' },
    purchase: { icon: '🚚', en: 'Purchase', so: 'Iibsi', color: '#15803d' },
    transfer_in: { icon: '⬇️', en: 'Transfer In', so: 'Soo Galay', color: '#1d4ed8' },
    transfer_out: { icon: '⬆️', en: 'Transfer Out', so: 'Baxay', color: '#f59e0b' },
  };

  return (
    <Layout title={lang === 'so' ? '📜 Taariikhda Dhaqdhaqaaqa Stock-ga' : '📜 Stock Movement History'}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select className="form-input" style={{ maxWidth: '200px' }} value={filters.product_id} onChange={e => setFilters(f => ({ ...f, product_id: e.target.value }))}>
          <option value="">{lang === 'so' ? 'Dhammaan Alaabta' : 'All Products'}</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="form-input" style={{ maxWidth: '180px' }} value={filters.branch_id} onChange={e => setFilters(f => ({ ...f, branch_id: e.target.value }))}>
          <option value="">{lang === 'so' ? 'Dhammaan Xaruumaha' : 'All Branches'}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="form-input" style={{ maxWidth: '160px' }} value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
          <option value="">{lang === 'so' ? 'Dhammaan Noocyada' : 'All Types'}</option>
          <option value="sale">{lang === 'so' ? 'Iib' : 'Sale'}</option>
          <option value="purchase">{lang === 'so' ? 'Iibsi' : 'Purchase'}</option>
          <option value="transfer">{lang === 'so' ? 'Wareejin' : 'Transfer'}</option>
        </select>
        <input className="form-input" type="date" style={{ maxWidth: '160px' }} value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
        <input className="form-input" type="date" style={{ maxWidth: '160px' }} value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', gap: '10px' }}>
              <div className="spinner"></div><span style={{ color: '#6b7280' }}>{lang === 'so' ? 'La soo rarayo...' : 'Loading...'}</span>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>{lang === 'so' ? 'Nooca' : 'Type'}</th>
                <th>{lang === 'so' ? 'Alaabta' : 'Product'}</th>
                <th>{lang === 'so' ? 'Xarunta' : 'Branch'}</th>
                <th>{lang === 'so' ? 'Tirada' : 'Quantity'}</th>
                <th>{lang === 'so' ? 'Tixraaca' : 'Reference'}</th>
                <th>{lang === 'so' ? 'Qofka' : 'User'}</th>
                <th>{lang === 'so' ? 'Taariikhda' : 'Date'}</th>
              </tr></thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>{lang === 'so' ? 'Dhaqdhaqaaq lama helin' : 'No movements found'}</td></tr>
                ) : movements.map(m => {
                  const info = typeInfo[m.movement_type] || { icon: '📦', en: m.movement_type, so: m.movement_type, color: '#6b7280' };
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className="badge" style={{ background: info.color + '20', color: info.color }}>
                          {info.icon} {lang === 'so' ? info.so : info.en}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>{m.product_name}</td>
                      <td style={{ color: '#6b7280', fontSize: '12px' }}>{m.branch_name}</td>
                      <td style={{ fontWeight: '700', color: m.direction === 'in' ? '#15803d' : '#ef4444' }}>
                        {m.direction === 'in' ? '+' : '−'}{m.quantity}
                      </td>
                      <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{m.reference}</code></td>
                      <td style={{ color: '#6b7280', fontSize: '12px' }}>{m.user_name || '—'}</td>
                      <td style={{ color: '#6b7280', fontSize: '12px' }}>{new Date(m.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
