import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { printSaleInvoice } from '../utils/invoicePrinter';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

const fmt = (n) => '$' + Number(n || 0).toFixed(2);

const PAYMENT_METHODS = [
  { value: 'cash', labelEn: 'Cash', labelSo: 'Lacag Cad', icon: '💵' },
  { value: 'evc_plus', labelEn: 'EVC Plus', labelSo: 'EVC Plus', icon: '📱' },
  { value: 'sahal', labelEn: 'Sahal', labelSo: 'Sahal', icon: '📲' },
  { value: 'premier', labelEn: 'Premier Wallet', labelSo: 'Premier', icon: '💳' },
  { value: 'bank', labelEn: 'Bank', labelSo: 'Bank', icon: '🏦' },
];

export default function SalesPage() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('pos'); // 'pos' | 'history'
  const [msg, setMsg] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchSales();
    fetchSummary();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await API.get('/products?branch_id=' + (user?.branch_id || ''));
      setProducts(res.data.data || []);
    } catch (e) {}
  };

  const fetchSales = async () => {
    try {
      const res = await API.get('/sales?limit=30');
      setSales(res.data.data || []);
    } catch (e) {}
  };

  const fetchSummary = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await API.get(`/sales/summary?date=${today}&branch_id=${user?.branch_id || ''}`);
      setSummary(res.data.data);
    } catch (e) {}
  };

  const printInvoice = async (saleId) => {
    try {
      await printSaleInvoice(saleId, lang);
    } catch (e) {
      setMsg({ type: 'error', text: lang === 'so' ? 'Daabacaadu wuu fashilmay' : 'Print failed' });
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)
  );

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: product.id, product_name: product.name, unit_price: parseFloat(product.sale_price), quantity: 1, max_stock: parseInt(product.total_stock) || 99 }];
    });
  };

  const updateQty = (pid, qty) => {
    if (qty <= 0) return removeFromCart(pid);
    setCart(prev => prev.map(i => i.product_id === pid ? { ...i, quantity: qty } : i));
  };

  const removeFromCart = (pid) => setCart(prev => prev.filter(i => i.product_id !== pid));

  const handleScan = (code) => {
    setShowScanner(false);
    const match = products.find(p => p.barcode === code);
    if (match) {
      addToCart(match);
      setMsg({ type: 'success', text: lang === 'so' ? `✅ ${match.name} waa lagu daray cart-ka` : `✅ ${match.name} added to cart` });
    } else {
      setSearch(code);
      setMsg({ type: 'error', text: lang === 'so' ? 'Barcode lama helin — raadinta waa la cusbooneysiiyay' : 'Barcode not found — search updated' });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const cartTotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const paid = parseFloat(paidAmount) || cartTotal;
  const change = paid - cartTotal;

  const completeSale = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      await API.post('/sales', {
        customer_name: customerName || (lang === 'so' ? 'Macaamilka Imaaday' : 'Walk-in Customer'),
        branch_id: user?.branch_id,
        items: cart,
        payment_method: payMethod,
        paid_amount: paid,
        notes: '',
      });
      setMsg({ type: 'success', text: lang === 'so' ? '✅ Iibka si guul leh ayaa loo diiwaangeliyay!' : '✅ Sale completed successfully!' });
      setCart([]);
      setCustomerName('');
      setPaidAmount('');
      setPayMethod('cash');
      fetchProducts();
      fetchSales();
      fetchSummary();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error completing sale' });
    }
    setLoading(false);
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <Layout title={lang === 'so' ? '🛒 Maamulka Iibka' : '🛒 Sales Management'}>
      {msg && (
        <div style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 200, background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, color: msg.type === 'success' ? '#15803d' : '#b91c1c', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f3f4f6', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[{ key: 'pos', icon: '🛒', en: 'New Sale', so: 'Iib Cusub' }, { key: 'history', icon: '📋', en: 'History', so: 'Taariikh' }].map(tab_ => (
          <button key={tab_.key} onClick={() => setTab(tab_.key)} style={{ padding: '8px 18px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: tab === tab_.key ? 'white' : 'transparent', color: tab === tab_.key ? '#1D9E75' : '#6b7280', boxShadow: tab === tab_.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {tab_.icon} {lang === 'so' ? tab_.so : tab_.en}
          </button>
        ))}
      </div>

      {tab === 'pos' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          {/* Product grid */}
          <div>
            {/* Summary bar */}
            {summary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: lang === 'so' ? 'Wadarta Iibka' : 'Total Sales', value: fmt(summary.total_sales), color: '#1D9E75' },
                  { label: lang === 'so' ? 'Macaamilada' : 'Transactions', value: summary.transaction_count, color: '#1d4ed8' },
                  { label: lang === 'so' ? 'Celceliska' : 'Avg Sale', value: fmt(summary.transaction_count > 0 ? summary.total_sales / summary.transaction_count : 0), color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input className="form-input" placeholder={lang === 'so' ? '🔍 Raadso alaabta...' : '🔍 Search products...'} value={search} onChange={e => setSearch(e.target.value)} />
              <button className="btn-secondary" style={{ flexShrink: 0 }} onClick={() => setShowScanner(true)} title={lang === 'so' ? 'Iskaan Barcode' : 'Scan Barcode'}>📷</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={parseInt(p.total_stock) <= 0}
                  style={{ background: 'white', border: `2px solid ${parseInt(p.total_stock) <= 0 ? '#e5e7eb' : '#e5e7eb'}`, borderRadius: '10px', padding: '12px', cursor: parseInt(p.total_stock) <= 0 ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'all 0.15s', opacity: parseInt(p.total_stock) <= 0 ? 0.5 : 1 }}
                  onMouseEnter={e => { if (parseInt(p.total_stock) > 0) e.currentTarget.style.borderColor = '#1D9E75'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>📦</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#111', marginBottom: '4px', lineHeight: '1.3' }}>{p.name}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1D9E75' }}>{fmt(p.sale_price)}</div>
                  <div style={{ fontSize: '11px', color: parseInt(p.total_stock) <= 5 ? '#ef4444' : '#9ca3af', marginTop: '2px' }}>
                    {lang === 'so' ? 'Hadhay:' : 'Left:'} {p.total_stock}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: 'fit-content', position: 'sticky', top: '80px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700' }}>🛒 {lang === 'so' ? 'Galinta Iibka' : 'Sale Cart'}</h3>

            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">{lang === 'so' ? 'Magaca Macaamiilka' : 'Customer Name'}</label>
              <input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={lang === 'so' ? 'Macaamilka imaaday...' : 'Walk-in customer...'} />
            </div>

            {/* Cart items */}
            <div style={{ flex: 1, minHeight: '120px', maxHeight: '260px', overflowY: 'auto', marginBottom: '14px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', padding: '30px 0' }}>
                  {lang === 'so' ? 'Alaab lama darin wali' : 'No items added yet'}
                </div>
              ) : cart.map(item => (
                <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product_name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{fmt(item.unit_price)} each</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => updateQty(item.product_id, item.quantity - 1)} style={{ width: '24px', height: '24px', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', background: 'white', fontWeight: '700' }}>−</button>
                    <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: '600', fontSize: '13px' }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.product_id, item.quantity + 1)} style={{ width: '24px', height: '24px', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', background: 'white', fontWeight: '700', color: '#1D9E75' }}>+</button>
                  </div>
                  <div style={{ fontWeight: '700', color: '#1D9E75', minWidth: '56px', textAlign: 'right' }}>{fmt(item.quantity * item.unit_price)}</div>
                  <button onClick={() => removeFromCart(item.product_id)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
              ))}
            </div>

            {/* Payment */}
            <div>
              <label className="form-label">{lang === 'so' ? 'Habka Lacag Bixinta' : 'Payment Method'}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.value} onClick={() => setPayMethod(pm.value)} style={{ padding: '7px', border: `1.5px solid ${payMethod === pm.value ? '#1D9E75' : '#e5e7eb'}`, borderRadius: '7px', cursor: 'pointer', background: payMethod === pm.value ? '#E1F5EE' : 'white', color: payMethod === pm.value ? '#0F6E56' : '#374151', fontSize: '12px', fontWeight: payMethod === pm.value ? '600' : '400' }}>
                    {pm.icon} {lang === 'so' ? pm.labelSo : pm.labelEn}
                  </button>
                ))}
              </div>

              <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280' }}>{lang === 'so' ? 'Wadarta:' : 'Total:'}</span>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: '#1D9E75' }}>{fmt(cartTotal)}</span>
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>{lang === 'so' ? 'Lacagta La Bixiyay:' : 'Amount Paid:'}</label>
                  <input className="form-input" type="number" step="0.01" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder={fmt(cartTotal)} />
                </div>
                {paidAmount && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: change >= 0 ? '#15803d' : '#ef4444', fontWeight: '600' }}>
                    <span>{lang === 'so' ? (change >= 0 ? 'Khamariga:' : 'Deynta:') : (change >= 0 ? 'Change:' : 'Remaining debt:')}</span>
                    <span>{fmt(Math.abs(change))}</span>
                  </div>
                )}
              </div>

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }} onClick={completeSale} disabled={cart.length === 0 || loading}>
                {loading ? '...' : (lang === 'so' ? '✅ Dhameystir Iibka' : '✅ Complete Sale')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'so' ? 'Nambarka' : 'Sale #'}</th>
                  <th>{lang === 'so' ? 'Macaamiilka' : 'Customer'}</th>
                  <th>{lang === 'so' ? 'Xarunta' : 'Branch'}</th>
                  <th>{lang === 'so' ? 'Wadarta' : 'Total'}</th>
                  <th>{lang === 'so' ? 'La Bixiyay' : 'Paid'}</th>
                  <th>{lang === 'so' ? 'Deynta' : 'Debt'}</th>
                  <th>{lang === 'so' ? 'Habka' : 'Method'}</th>
                  <th>{lang === 'so' ? 'Taariikhda' : 'Date'}</th>
                  <th>{lang === 'so' ? 'Qaansheeg' : 'Invoice'}</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>{lang === 'so' ? 'Iib lama helin' : 'No sales found'}</td></tr>
                ) : sales.map(s => (
                  <tr key={s.id}>
                    <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{s.sale_number}</code></td>
                    <td style={{ fontWeight: '500' }}>{s.customer_name}</td>
                    <td style={{ color: '#6b7280', fontSize: '12px' }}>{s.branch_name}</td>
                    <td style={{ fontWeight: '700', color: '#1D9E75' }}>{fmt(s.total_amount)}</td>
                    <td>{fmt(s.paid_amount)}</td>
                    <td style={{ color: parseFloat(s.debt_amount) > 0 ? '#ef4444' : '#9ca3af' }}>{fmt(s.debt_amount)}</td>
                    <td><span className="badge badge-blue" style={{ fontSize: '11px' }}>{s.payment_method?.toUpperCase()}</span></td>
                    <td style={{ color: '#6b7280', fontSize: '12px' }}>{new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => printInvoice(s.id)}>
                        🧾 {lang === 'so' ? 'Daabac' : 'Print'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScannerModal onDetected={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </Layout>
  );
}
