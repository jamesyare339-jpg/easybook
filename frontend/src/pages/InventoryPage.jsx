import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

const fmt = (n) => '$' + Number(n || 0).toFixed(2);

const statusBadge = (qty, threshold) => {
  if (qty <= 0) return { label: 'Out', cls: 'badge-red' };
  if (qty <= threshold * 0.5) return { label: 'Critical', labelSo: 'Aad U Yar', cls: 'badge-red' };
  if (qty <= threshold) return { label: 'Low', labelSo: 'Yar', cls: 'badge-amber' };
  return { label: 'OK', labelSo: 'Wanaag', cls: 'badge-green' };
};

export default function InventoryPage() {
  const { t, lang } = useLang();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: '', barcode: '', category_id: '', sale_price: '', cost_price: '', low_stock_threshold: 10, description: '', initial_stock: '', branch_id: '' });
  const [transfer, setTransfer] = useState({ product_id: '', from_branch_id: '', to_branch_id: '', quantity: 1, notes: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState(null); // 'search' | 'form'
  const [showCategories, setShowCategories] = useState(false);
  const [catForm, setCatForm] = useState({ name_en: '', name_so: '' });
  const [editCat, setEditCat] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterBranch) params.append('branch_id', filterBranch);
      if (filterCat) params.append('category_id', filterCat);
      if (filterLow) params.append('low_stock', 'true');
      const [pRes, cRes, bRes] = await Promise.all([
        API.get('/products?' + params),
        API.get('/products/categories'),
        API.get('/branches'),
      ]);
      setProducts(pRes.data.data || []);
      setCategories(cRes.data.data || []);
      setBranches(bRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterBranch, filterCat, filterLow]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', barcode: '', category_id: '', sale_price: '', cost_price: '', low_stock_threshold: 10, description: '', initial_stock: '', branch_id: '' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({ name: p.name, barcode: p.barcode || '', category_id: p.category_id || '', sale_price: p.sale_price, cost_price: p.cost_price, low_stock_threshold: p.low_stock_threshold, description: p.description || '', initial_stock: '', branch_id: '' });
    setShowModal(true);
  };

  const saveProduct = async () => {
    if (!form.name || !form.sale_price || !form.cost_price) {
      setMsg({ type: 'error', text: lang === 'so' ? 'Magaca iyo qiimayaasha ku buuxi' : 'Fill in name and prices' });
      return;
    }
    setSaving(true);
    try {
      if (editProduct) {
        await API.put(`/products/${editProduct.id}`, form);
        setMsg({ type: 'success', text: lang === 'so' ? 'Alaabta waa la cusbooneysiiyay ✓' : 'Product updated ✓' });
      } else {
        await API.post('/products', form);
        setMsg({ type: 'success', text: lang === 'so' ? 'Alaabta cusub waa la daray ✓' : 'Product added ✓' });
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error' });
    } finally { setSaving(false); setTimeout(() => setMsg(null), 3000); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm(lang === 'so' ? 'Ma hubtaa inaad tirtirto alaabtan?' : 'Delete this product?')) return;
    try {
      await API.delete(`/products/${id}`);
      setMsg({ type: 'success', text: lang === 'so' ? 'Alaabta waa la tirtiray ✓' : 'Product deleted ✓' });
      fetchData();
    } catch (e) { setMsg({ type: 'error', text: 'Delete failed' }); }
    setTimeout(() => setMsg(null), 3000);
  };

  const doTransfer = async () => {
    if (!transfer.product_id || !transfer.from_branch_id || !transfer.to_branch_id || !transfer.quantity) return;
    setSaving(true);
    try {
      await API.post('/stock/transfer', transfer);
      setMsg({ type: 'success', text: lang === 'so' ? 'Alaabta si guul leh ayaa loo wareejiyay ✓' : 'Stock transferred ✓' });
      setShowTransfer(false);
      fetchData();
    } catch (e) { setMsg({ type: 'error', text: e.response?.data?.message || 'Transfer failed' }); }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const getStockForBranch = (p) => {
    if (filterBranch && p.branch_stock !== undefined) return parseInt(p.branch_stock) || 0;
    return parseInt(p.total_stock) || 0;
  };

  const handleScan = (code) => {
    setShowScanner(false);
    if (scannerTarget === 'search') {
      setSearch(code);
    } else if (scannerTarget === 'form') {
      setForm(f => ({ ...f, barcode: code }));
    }
    setScannerTarget(null);
  };

  const saveCategory = async () => {
    if (!catForm.name_en || !catForm.name_so) {
      setMsg({ type: 'error', text: lang === 'so' ? 'Labada magac ku buuxi (EN + SO)' : 'Fill in both names (EN + SO)' });
      return;
    }
    try {
      if (editCat) await API.put(`/products/categories/${editCat.id}`, catForm);
      else await API.post('/products/categories', catForm);
      setCatForm({ name_en: '', name_so: '' });
      setEditCat(null);
      fetchData();
      setMsg({ type: 'success', text: lang === 'so' ? 'Nooca waa la kaydiyay ✓' : 'Category saved ✓' });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error' });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const deleteCategory = async (id) => {
    if (!window.confirm(lang === 'so' ? 'Ma hubtaa inaad tirtirto nooca?' : 'Delete this category?')) return;
    try {
      await API.delete(`/products/categories/${id}`);
      fetchData();
      setMsg({ type: 'success', text: lang === 'so' ? 'Nooca waa la tirtiray ✓' : 'Category deleted ✓' });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || (lang === 'so' ? 'Lama tirtirin karo — alaab baa isticmaalaysa' : 'Cannot delete — in use by products') });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <Layout title={lang === 'so' ? '📦 Maamulka Alaabta' : '📦 Inventory Management'}>
      {msg && (
        <div style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 200, background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, color: msg.type === 'success' ? '#15803d' : '#b91c1c', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{lang === 'so' ? 'Alaabta Kaydka' : 'Stock Inventory'}</h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>{products.length} {lang === 'so' ? 'nooc oo alaab ah' : 'products'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={() => setShowCategories(true)}>🏷️ {lang === 'so' ? 'Noocyada' : 'Categories'}</button>
          <button className="btn-secondary" onClick={() => setShowTransfer(true)}>🔄 {lang === 'so' ? 'Wareeji Stock' : 'Transfer Stock'}</button>
          <button className="btn-primary" onClick={openAdd}>➕ {t('addProduct')}</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          className="form-input" style={{ maxWidth: '220px' }}
          placeholder={lang === 'so' ? '🔍 Raadso alaab...' : '🔍 Search product...'}
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <button className="btn-secondary" onClick={() => { setScannerTarget('search'); setShowScanner(true); }} title={lang === 'so' ? 'Iskaan Barcode' : 'Scan Barcode'}>
          📷
        </button>
        <select className="form-input" style={{ maxWidth: '180px' }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
          <option value="">{lang === 'so' ? 'Dhammaan Xaruumaha' : 'All Branches'}</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="form-input" style={{ maxWidth: '160px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">{lang === 'so' ? 'Noocyada Dham' : 'All Categories'}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{lang === 'so' ? c.name_so : c.name_en}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={filterLow} onChange={e => setFilterLow(e.target.checked)} />
          {lang === 'so' ? 'Kuwa Stock Yar Kaliya' : 'Low Stock Only'}
        </label>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '10px' }}>
              <div className="spinner"></div> <span style={{ color: '#6b7280' }}>{t('loading')}</span>
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
              📦 {lang === 'so' ? 'Alaab lama helin' : 'No products found'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('productName')}</th>
                  <th>{t('barcode')}</th>
                  <th>{t('category')}</th>
                  <th>{t('salePrice')}</th>
                  <th>{t('costPrice')}</th>
                  <th>{lang === 'so' ? 'Faa\'iido' : 'Margin'}</th>
                  <th>{t('stock')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const qty = getStockForBranch(p);
                  const badge = statusBadge(qty, p.low_stock_threshold);
                  const margin = ((p.sale_price - p.cost_price) / p.sale_price * 100).toFixed(0);
                  return (
                    <tr key={p.id}>
                      <td style={{ color: '#9ca3af', fontSize: '12px' }}>{i + 1}</td>
                      <td style={{ fontWeight: '600', color: '#111' }}>{p.name}</td>
                      <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{p.barcode || '—'}</code></td>
                      <td style={{ color: '#6b7280', fontSize: '13px' }}>{lang === 'so' ? p.category_so : p.category_en || '—'}</td>
                      <td style={{ fontWeight: '600', color: '#1D9E75' }}>{fmt(p.sale_price)}</td>
                      <td style={{ color: '#6b7280' }}>{fmt(p.cost_price)}</td>
                      <td><span style={{ color: parseInt(margin) > 30 ? '#15803d' : '#f59e0b', fontWeight: '600' }}>{margin}%</span></td>
                      <td style={{ fontWeight: '700', color: qty <= p.low_stock_threshold ? '#ef4444' : '#111' }}>{qty}</td>
                      <td><span className={`badge ${badge.cls}`}>{lang === 'so' && badge.labelSo ? badge.labelSo : badge.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => openEdit(p)}>✏️</button>
                          <button style={{ padding: '4px 10px', fontSize: '12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', color: '#b91c1c' }} onClick={() => deleteProduct(p.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700' }}>
              {editProduct ? (lang === 'so' ? '✏️ Tafatir Alaabta' : '✏️ Edit Product') : (lang === 'so' ? '➕ Alaab Cusub Ku Dar' : '➕ Add New Product')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">{t('productName')} *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={lang === 'so' ? 'Magaca alaabta...' : 'Product name...'} />
              </div>
              <div>
                <label className="form-label">{t('barcode')}</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input className="form-input" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="e.g. 101-NIK" />
                  <button type="button" className="btn-secondary" style={{ flexShrink: 0 }} onClick={() => { setScannerTarget('form'); setShowScanner(true); }}>📷</button>
                </div>
              </div>
              <div>
                <label className="form-label">{t('category')}</label>
                <select className="form-input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">{lang === 'so' ? 'Dooro nooca' : 'Select category'}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{lang === 'so' ? c.name_so : c.name_en}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">{t('salePrice')} *</label>
                <input className="form-input" type="number" step="0.01" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} placeholder="$0.00" />
              </div>
              <div>
                <label className="form-label">{t('costPrice')} *</label>
                <input className="form-input" type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} placeholder="$0.00" />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Xaddiga Digniinta' : 'Low Stock Alert At'}</label>
                <input className="form-input" type="number" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} />
              </div>
              {!editProduct && (
                <>
                  <div>
                    <label className="form-label">{lang === 'so' ? 'Stock-ga Bilaabista' : 'Initial Stock'}</label>
                    <input className="form-input" type="number" value={form.initial_stock} onChange={e => setForm(f => ({ ...f, initial_stock: e.target.value }))} placeholder="0" />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">{lang === 'so' ? 'Xarunta Bilaabista' : 'Starting Branch'}</label>
                    <select className="form-input" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                      <option value="">{lang === 'so' ? 'Dooro xarunta' : 'Select branch'}</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">{lang === 'so' ? 'Faahfaahin' : 'Description'}</label>
                <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={lang === 'so' ? 'Sharaxaad (ikhtiyaari)...' : 'Optional description...'} />
              </div>
            </div>
            {form.sale_price && form.cost_price && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', marginTop: '14px', fontSize: '13px', color: '#15803d' }}>
                💰 {lang === 'so' ? 'Faa\'iidada hal alaab:' : 'Profit per unit:'} <strong>{fmt(form.sale_price - form.cost_price)}</strong>
                {' '}({((form.sale_price - form.cost_price) / form.sale_price * 100).toFixed(1)}%)
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>{t('cancel')}</button>
              <button className="btn-primary" onClick={saveProduct} disabled={saving}>
                {saving ? '...' : (editProduct ? (lang === 'so' ? '💾 Keydi' : '💾 Save') : (lang === 'so' ? '➕ Ku Dar' : '➕ Add'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="modal-backdrop" onClick={() => setShowTransfer(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700' }}>🔄 {lang === 'so' ? 'Wareeji Alaab Bakhaar kale' : 'Transfer Stock Between Branches'}</h3>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label className="form-label">{lang === 'so' ? 'Alaabta' : 'Product'}</label>
                <select className="form-input" value={transfer.product_id} onChange={e => setTransfer(t => ({ ...t, product_id: e.target.value }))}>
                  <option value="">{lang === 'so' ? 'Dooro alaabta' : 'Select product'}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">{lang === 'so' ? 'Ka (Xarunta)' : 'From Branch'}</label>
                  <select className="form-input" value={transfer.from_branch_id} onChange={e => setTransfer(t => ({ ...t, from_branch_id: e.target.value }))}>
                    <option value="">{lang === 'so' ? 'Ka xarunta' : 'From...'}</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">{lang === 'so' ? 'Ku (Xarunta)' : 'To Branch'}</label>
                  <select className="form-input" value={transfer.to_branch_id} onChange={e => setTransfer(t => ({ ...t, to_branch_id: e.target.value }))}>
                    <option value="">{lang === 'so' ? 'Ku xarunta' : 'To...'}</option>
                    {branches.filter(b => b.id != transfer.from_branch_id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Tirada' : 'Quantity'}</label>
                <input className="form-input" type="number" min="1" value={transfer.quantity} onChange={e => setTransfer(t => ({ ...t, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Faallada' : 'Notes'}</label>
                <input className="form-input" value={transfer.notes} onChange={e => setTransfer(t => ({ ...t, notes: e.target.value }))} placeholder={lang === 'so' ? 'Faallad (ikhtiyaari)...' : 'Optional note...'} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowTransfer(false)}>{t('cancel')}</button>
              <button className="btn-primary" onClick={doTransfer} disabled={saving}>
                {saving ? '...' : (lang === 'so' ? '🔄 Wareeji' : '🔄 Transfer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScannerModal onDetected={handleScan} onClose={() => { setShowScanner(false); setScannerTarget(null); }} />
      )}

      {showCategories && (
        <div className="modal-backdrop" onClick={() => { setShowCategories(false); setEditCat(null); setCatForm({ name_en: '', name_so: '' }); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>🏷️ {lang === 'so' ? 'Maamulka Noocyada' : 'Manage Categories'}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label className="form-label">{lang === 'so' ? 'Magaca (English)' : 'Name (English)'}</label>
                <input className="form-input" value={catForm.name_en} onChange={e => setCatForm(f => ({ ...f, name_en: e.target.value }))} placeholder="e.g. Footwear" />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Magaca (Soomaali)' : 'Name (Somali)'}</label>
                <input className="form-input" value={catForm.name_so} onChange={e => setCatForm(f => ({ ...f, name_so: e.target.value }))} placeholder="tusaale: Kabo" />
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginBottom: '18px' }} onClick={saveCategory}>
              {editCat ? `💾 ${lang === 'so' ? 'Cusboonaysii' : 'Update'}` : `➕ ${lang === 'so' ? 'Ku Dar' : 'Add'}`}
            </button>

            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '14px', maxHeight: '240px', overflowY: 'auto' }}>
              {categories.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>{lang === 'so' ? 'Nooc lama helin' : 'No categories yet'}</p>
              ) : categories.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '13px' }}>{lang === 'so' ? c.name_so : c.name_en} <span style={{ color: '#9ca3af' }}>({lang === 'so' ? c.name_en : c.name_so})</span></span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-secondary" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={() => { setEditCat(c); setCatForm({ name_en: c.name_en, name_so: c.name_so }); }}>✏️</button>
                    <button style={{ padding: '3px 8px', fontSize: '11px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', color: '#b91c1c' }} onClick={() => deleteCategory(c.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button className="btn-secondary" onClick={() => { setShowCategories(false); setEditCat(null); setCatForm({ name_en: '', name_so: '' }); }}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
