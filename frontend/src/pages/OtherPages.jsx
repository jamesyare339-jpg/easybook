import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { printPurchaseInvoice } from '../utils/invoicePrinter';

const fmt = (n) => '$' + Number(n || 0).toFixed(2);

const EXPENSE_TYPES = [
  { en: 'Electricity', so: 'Koronto', icon: '⚡' },
  { en: 'Water', so: 'Biyo', icon: '💧' },
  { en: 'Internet', so: 'Internet', icon: '📡' },
  { en: 'Rent', so: 'Kirada', icon: '🏠' },
  { en: 'Fuel', so: 'Shidaal', icon: '⛽' },
  { en: 'Maintenance', so: 'Dayactir', icon: '🔧' },
  { en: 'Transport', so: 'Gaadiid', icon: '🚗' },
  { en: 'Tax', so: 'Cashuur', icon: '🧾' },
  { en: 'Salaries', so: 'Mushaarada', icon: '💰' },
  { en: 'Other', so: 'Kale', icon: '📌' },
];

// ═══════════════════════════════════════
// EXPENSES PAGE
// ═══════════════════════════════════════
export function ExpensesPage() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'Electricity', type_so: 'Koronto', amount: '', branch_id: '', notes: '', expense_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchExpenses(); fetchBranches(); }, [filterMonth, filterYear]);
  const fetchExpenses = async () => { try { const r = await API.get(`/expenses?month=${filterMonth}&year=${filterYear}`); setExpenses(r.data.data || []); } catch (e) {} };
  const fetchBranches = async () => { try { const r = await API.get('/branches'); setBranches(r.data.data || []); } catch (e) {} };

  const saveExpense = async () => {
    if (!form.amount || !form.type) return;
    setSaving(true);
    try {
      await API.post('/expenses', { ...form, branch_id: form.branch_id || user?.branch_id });
      setMsg({ type: 'success', text: lang === 'so' ? 'Kharashka waa la keydiiyay ✓' : 'Expense saved ✓' });
      setShowModal(false);
      setForm({ type: 'Electricity', type_so: 'Koronto', amount: '', branch_id: '', notes: '', expense_date: new Date().toISOString().split('T')[0] });
      fetchExpenses();
    } catch (e) { setMsg({ type: 'error', text: 'Error' }); }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const byType = EXPENSE_TYPES.map(t => ({ ...t, total: expenses.filter(e => e.type === t.en).reduce((s, e) => s + parseFloat(e.amount), 0) })).filter(t => t.total > 0);
  const grandTotal = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <Layout title={lang === 'so' ? '🧾 Kharashaadka' : '🧾 Expenses'}>
      {msg && <div style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 200, background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, color: msg.type === 'success' ? '#15803d' : '#b91c1c', padding: '10px 18px', borderRadius: '10px', fontSize: '14px' }}>{msg.text}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select className="form-input" style={{ maxWidth: '120px' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="form-input" style={{ maxWidth: '90px' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>➕ {lang === 'so' ? 'Kharash Cusub' : 'Add Expense'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px' }}>
        {/* Summary sidebar */}
        <div className="card">
          <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '700' }}>📊 {lang === 'so' ? 'Koobid' : 'Summary'}</h3>
          {byType.map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
              <span>{t.icon} {lang === 'so' ? t.so : t.en}</span>
              <span style={{ fontWeight: '600', color: '#ef4444' }}>{fmt(t.total)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: '700', fontSize: '15px', borderTop: '2px solid #e5e7eb', marginTop: '4px' }}>
            <span>{lang === 'so' ? 'Wadarta:' : 'Total:'}</span>
            <span style={{ color: '#ef4444' }}>{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr>
                <th>{lang === 'so' ? 'Nooca' : 'Type'}</th>
                <th>{lang === 'so' ? 'Lacagta' : 'Amount'}</th>
                <th>{lang === 'so' ? 'Xarunta' : 'Branch'}</th>
                <th>{lang === 'so' ? 'Taariikhda' : 'Date'}</th>
                <th>{lang === 'so' ? 'Faallada' : 'Notes'}</th>
              </tr></thead>
              <tbody>
                {expenses.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>{lang === 'so' ? 'Kharash lama helin bishaas' : 'No expenses this month'}</td></tr> :
                  expenses.map(e => (
                    <tr key={e.id}>
                      <td>{EXPENSE_TYPES.find(t => t.en === e.type)?.icon || '📌'} {lang === 'so' ? (e.type_so || e.type) : e.type}</td>
                      <td style={{ fontWeight: '700', color: '#ef4444' }}>{fmt(e.amount)}</td>
                      <td style={{ color: '#6b7280', fontSize: '12px' }}>{e.branch_name || '—'}</td>
                      <td style={{ color: '#6b7280', fontSize: '12px' }}>{new Date(e.expense_date).toLocaleDateString()}</td>
                      <td style={{ color: '#9ca3af', fontSize: '12px' }}>{e.notes || '—'}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700' }}>➕ {lang === 'so' ? 'Kharash Cusub Geli' : 'Add New Expense'}</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label className="form-label">{lang === 'so' ? 'Nooca Kharashka' : 'Expense Type'}</label>
                <select className="form-input" value={form.type} onChange={e => { const t = EXPENSE_TYPES.find(t => t.en === e.target.value); setForm(f => ({ ...f, type: t.en, type_so: t.so })); }}>
                  {EXPENSE_TYPES.map(t => <option key={t.en} value={t.en}>{t.icon} {lang === 'so' ? t.so : t.en}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Lacagta ($)' : 'Amount ($)'}</label>
                <input className="form-input" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Xarunta' : 'Branch'}</label>
                <select className="form-input" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">{lang === 'so' ? 'Dooro xarunta' : 'Select branch'}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Taariikhda' : 'Date'}</label>
                <input className="form-input" type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Faallada (Ikhtiyaari)' : 'Notes (Optional)'}</label>
                <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={lang === 'so' ? 'Faallad...' : 'Notes...'} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>{lang === 'so' ? 'Jooji' : 'Cancel'}</button>
              <button className="btn-primary" onClick={saveExpense} disabled={saving}>{saving ? '...' : (lang === 'so' ? '💾 Keydi' : '💾 Save')}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ═══════════════════════════════════════
// CREDIT / DEBTS PAGE
// ═══════════════════════════════════════
export function CreditPage() {
  const { lang } = useLang();
  const [customerDebts, setCustomerDebts] = useState([]);
  const [supplierDebts, setSupplierDebts] = useState([]);
  const [tab, setTab] = useState('customer');

  useEffect(() => { fetchDebts(); }, []);
  const fetchDebts = async () => {
    try {
      const [c, s] = await Promise.all([API.get('/debts/customers'), API.get('/debts/suppliers')]);
      setCustomerDebts(c.data.data || []);
      setSupplierDebts(s.data.data || []);
    } catch (e) {}
  };

  const totalCust = customerDebts.reduce((s, d) => s + parseFloat(d.remaining || 0), 0);
  const totalSupp = supplierDebts.reduce((s, d) => s + parseFloat(d.remaining || 0), 0);

  const DebtTable = ({ debts, isCustomer }) => (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr>
            <th>{isCustomer ? (lang === 'so' ? 'Macaamiilka' : 'Customer') : (lang === 'so' ? 'Supplier-ka' : 'Supplier')}</th>
            <th>{lang === 'so' ? 'Telefoon' : 'Phone'}</th>
            <th>{lang === 'so' ? 'Lacagta' : 'Amount'}</th>
            <th>{lang === 'so' ? 'La Bixiyay' : 'Paid'}</th>
            <th>{lang === 'so' ? 'Hadhay' : 'Remaining'}</th>
            <th>{lang === 'so' ? 'Taariikhda Bixinta' : 'Due Date'}</th>
            <th>{lang === 'so' ? 'Xaaladda' : 'Status'}</th>
          </tr></thead>
          <tbody>
            {debts.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>{lang === 'so' ? 'Deyn lama helin' : 'No debts found'}</td></tr>
            ) : debts.map(d => {
              const overdue = d.due_date && new Date(d.due_date) < new Date();
              return (
                <tr key={d.id}>
                  <td style={{ fontWeight: '600' }}>{isCustomer ? d.customer_name : d.supplier_name}</td>
                  <td style={{ color: '#6b7280', fontSize: '12px' }}>{d.phone || '—'}</td>
                  <td>{fmt(d.amount)}</td>
                  <td style={{ color: '#1D9E75' }}>{fmt(d.paid_amount)}</td>
                  <td style={{ fontWeight: '700', color: '#ef4444' }}>{fmt(d.remaining)}</td>
                  <td style={{ color: overdue ? '#ef4444' : '#6b7280', fontSize: '12px', fontWeight: overdue ? '600' : '400' }}>
                    {d.due_date ? new Date(d.due_date).toLocaleDateString() : '—'}
                    {overdue && ' ⚠️'}
                  </td>
                  <td><span className={`badge ${overdue ? 'badge-red' : 'badge-blue'}`}>{overdue ? (lang === 'so' ? 'Dhaafay' : 'Overdue') : (lang === 'so' ? 'Firfircoon' : 'Active')}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <Layout title={lang === 'so' ? '💳 Deymaha' : '💳 Credit & Debts'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{lang === 'so' ? 'Macaamiisha Ku Leeyihiin' : 'Customers Owe Us'}</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#ef4444' }}>{fmt(totalCust)}</div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{customerDebts.length} {lang === 'so' ? 'macaamilka' : 'customers'}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>{lang === 'so' ? 'Supplier-ka Ku Leeyihiin' : 'We Owe Suppliers'}</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b' }}>{fmt(totalSupp)}</div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{supplierDebts.length} {lang === 'so' ? 'supplier' : 'suppliers'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f3f4f6', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[{ key: 'customer', icon: '🧑‍💼', en: 'Customer Debts', so: 'Deymaha Macaamiisha' }, { key: 'supplier', icon: '🏭', en: 'Supplier Debts', so: 'Deymaha Supplier' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 18px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: tab === t.key ? 'white' : 'transparent', color: tab === t.key ? '#1D9E75' : '#6b7280', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t.icon} {lang === 'so' ? t.so : t.en}
          </button>
        ))}
      </div>

      <DebtTable debts={tab === 'customer' ? customerDebts : supplierDebts} isCustomer={tab === 'customer'} />
    </Layout>
  );
}

// ═══════════════════════════════════════
// CASH PAGE
// ═══════════════════════════════════════
export function CashPage() {
  const { lang } = useLang();
  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => { fetchCash(); }, []);
  const fetchCash = async () => {
    try {
      const r = await API.get('/cash');
      setAccounts(r.data.data || []);
      setTotalBalance(r.data.total_balance || 0);
    } catch (e) {}
  };

  const typeInfo = {
    cash: { icon: '💵', en: 'Physical Cash', so: 'Lacag Cad', color: '#1D9E75' },
    bank: { icon: '🏦', en: 'Bank Account', so: 'Xisaabta Bangiga', color: '#185FA5' },
    evc_plus: { icon: '📱', en: 'EVC Plus', so: 'EVC Plus', color: '#854F0B' },
    sahal: { icon: '📲', en: 'Sahal Wallet', so: 'Sahal', color: '#534AB7' },
    premier: { icon: '💳', en: 'Premier Wallet', so: 'Premier', color: '#E24B4A' },
  };

  const byBranch = accounts.reduce((acc, a) => {
    const key = a.branch_id || 0;
    if (!acc[key]) acc[key] = { branch_name: a.branch_name || 'General', accounts: [] };
    acc[key].accounts.push(a);
    return acc;
  }, {});

  return (
    <Layout title={lang === 'so' ? '💵 Maamulka Lacagta' : '💵 Cash Management'}>
      {/* Grand total */}
      <div style={{ background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', borderRadius: '16px', padding: '28px 32px', color: 'white', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', opacity: 0.85 }}>{lang === 'so' ? 'Wadarta Lacagta Dhan' : 'Total Cash Position'}</div>
          <div style={{ fontSize: '40px', fontWeight: '800', marginTop: '6px' }}>{fmt(totalBalance)}</div>
          <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '4px' }}>{accounts.length} {lang === 'so' ? 'xisaab oo firfircoon' : 'active accounts'}</div>
        </div>
        <div style={{ fontSize: '60px', opacity: 0.3 }}>💰</div>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {Object.values(byBranch).map((branch, bi) => (
          <div key={bi}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>🏪 {branch.branch_name}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {branch.accounts.map(a => {
                const info = typeInfo[a.type] || { icon: '💰', en: a.type, so: a.type, color: '#374151' };
                return (
                  <div key={a.id} className="card" style={{ borderTop: `3px solid ${info.color}` }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{info.icon}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{lang === 'so' ? info.so : info.en}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: info.color }}>{fmt(a.balance)}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{lang === 'so' ? 'Cusbooneysiinta:' : 'Updated:'} {new Date(a.updated_at).toLocaleDateString()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

// ═══════════════════════════════════════
// STORES PAGE
// ═══════════════════════════════════════
export function StoresPage() {
  const { lang } = useLang();
  const [branches, setBranches] = useState([]);

  useEffect(() => { async function f() { try { const r = await API.get('/branches'); setBranches(r.data.data || []); } catch (e) {} } f(); }, []);

  const colors = ['#1D9E75', '#185FA5', '#BA7517', '#534AB7', '#E24B4A'];

  return (
    <Layout title={lang === 'so' ? '🏪 Bakhaarada & Xaruumaha' : '🏪 Stores & Branches'}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {branches.map((b, i) => (
          <div key={b.id} className="card" style={{ borderTop: `4px solid ${colors[i % colors.length]}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', background: colors[i % colors.length] + '20', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏪</div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>{b.name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{b.location}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: lang === 'so' ? 'Stock Wadarta' : 'Total Stock', value: parseInt(b.total_stock || 0).toLocaleString(), icon: '📦' },
                { label: lang === 'so' ? 'Shaqaalaha' : 'Staff', value: b.staff_count || 0, icon: '👥' },
              ].map((s, j) => (
                <div key={j} style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px' }}>{s.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>📞 {b.phone || '—'}</div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

// ═══════════════════════════════════════
// PURCHASES PAGE
// ═══════════════════════════════════════
export function PurchasesPage() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ supplier_name: '', branch_id: '', payment_method: 'cash', paid_amount: '', notes: '', items: [{ product_id: '', product_name: '', quantity: 1, unit_cost: '' }] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [p, pr, s, b] = await Promise.all([API.get('/purchases'), API.get('/products'), API.get('/suppliers'), API.get('/branches')]);
      setPurchases(p.data.data || []);
      setProducts(pr.data.data || []);
      setSuppliers(s.data.data || []);
      setBranches(b.data.data || []);
    } catch (e) {}
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', product_name: '', quantity: 1, unit_cost: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

  const total = form.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_cost) || 0), 0);

  const savePurchase = async () => {
    setSaving(true);
    try {
      const items = form.items.map(i => {
        const p = products.find(p => p.id == i.product_id);
        return { ...i, product_name: p?.name || i.product_name };
      });
      await API.post('/purchases', { ...form, branch_id: form.branch_id || user?.branch_id, items, paid_amount: form.paid_amount || total });
      setMsg({ type: 'success', text: lang === 'so' ? 'Iibsiga waa la keydiiyay ✓' : 'Purchase saved ✓' });
      setShowModal(false);
      fetchAll();
    } catch (e) { setMsg({ type: 'error', text: e.response?.data?.message || 'Error' }); }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <Layout title={lang === 'so' ? '🚚 Iibsiga Alaabta' : '🚚 Purchases'}>
      {msg && <div style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 200, background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, color: msg.type === 'success' ? '#15803d' : '#b91c1c', padding: '10px 18px', borderRadius: '10px', fontSize: '14px' }}>{msg.text}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn-primary" onClick={() => setShowModal(true)}>➕ {lang === 'so' ? 'Iibsi Cusub' : 'New Purchase'}</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              <th>{lang === 'so' ? 'Nambarka' : 'Purchase #'}</th>
              <th>{lang === 'so' ? 'Supplier-ka' : 'Supplier'}</th>
              <th>{lang === 'so' ? 'Xarunta' : 'Branch'}</th>
              <th>{lang === 'so' ? 'Wadarta' : 'Total'}</th>
              <th>{lang === 'so' ? 'La Bixiyay' : 'Paid'}</th>
              <th>{lang === 'so' ? 'Deynta' : 'Debt'}</th>
              <th>{lang === 'so' ? 'Taariikhda' : 'Date'}</th>
              <th>{lang === 'so' ? 'Xaaladda' : 'Status'}</th>
              <th>{lang === 'so' ? 'Qaansheeg' : 'Invoice'}</th>
            </tr></thead>
            <tbody>
              {purchases.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>{lang === 'so' ? 'Iibsi lama helin' : 'No purchases found'}</td></tr> :
                purchases.map(p => (
                  <tr key={p.id}>
                    <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{p.purchase_number}</code></td>
                    <td style={{ fontWeight: '500' }}>{p.supplier_name}</td>
                    <td style={{ color: '#6b7280', fontSize: '12px' }}>{p.branch_name}</td>
                    <td style={{ fontWeight: '700', color: '#111' }}>{fmt(p.total_amount)}</td>
                    <td style={{ color: '#1D9E75' }}>{fmt(p.paid_amount)}</td>
                    <td style={{ color: parseFloat(p.debt_amount) > 0 ? '#ef4444' : '#9ca3af' }}>{fmt(p.debt_amount)}</td>
                    <td style={{ color: '#6b7280', fontSize: '12px' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${parseFloat(p.debt_amount) === 0 ? 'badge-green' : parseFloat(p.paid_amount) > 0 ? 'badge-amber' : 'badge-red'}`}>
                        {parseFloat(p.debt_amount) === 0 ? (lang === 'so' ? 'La Bixiyay' : 'Paid') : parseFloat(p.paid_amount) > 0 ? (lang === 'so' ? 'Qayb' : 'Partial') : (lang === 'so' ? 'Aan La Bixin' : 'Unpaid')}
                      </span>
                    </td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => printPurchaseInvoice(p.id, lang)}>
                        🧾 {lang === 'so' ? 'Daabac' : 'Print'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700' }}>🚚 {lang === 'so' ? 'Iibsi Cusub Geli' : 'Record New Purchase'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">{lang === 'so' ? 'Supplier-ka' : 'Supplier'}</label>
                <input className="form-input" list="sup-list" value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} placeholder={lang === 'so' ? 'Supplier magaciisa...' : 'Supplier name...'} />
                <datalist id="sup-list">{suppliers.map(s => <option key={s.id} value={s.name} />)}</datalist>
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Xarunta' : 'Branch'}</label>
                <select className="form-input" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">{lang === 'so' ? 'Dooro' : 'Select'}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Habka Lacag Bixinta' : 'Payment Method'}</label>
                <select className="form-input" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="cash">Cash</option><option value="bank">Bank</option><option value="evc_plus">EVC Plus</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>{lang === 'so' ? 'Alaabta La Iibsaday' : 'Items Purchased'}</label>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={addItem}>+ {lang === 'so' ? 'Ku Dar' : 'Add Item'}</button>
              </div>
              {form.items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                  <select className="form-input" value={item.product_id} onChange={e => { const p = products.find(p => p.id == e.target.value); updateItem(i, 'product_id', e.target.value); updateItem(i, 'unit_cost', p?.cost_price || ''); updateItem(i, 'product_name', p?.name || ''); }}>
                    <option value="">{lang === 'so' ? 'Alaabta dooro' : 'Select product'}</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input className="form-input" type="number" placeholder={lang === 'so' ? 'Tirada' : 'Qty'} value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                  <input className="form-input" type="number" placeholder={lang === 'so' ? 'Qiimaha' : 'Cost'} step="0.01" value={item.unit_cost} onChange={e => updateItem(i, 'unit_cost', e.target.value)} />
                  <button onClick={() => removeItem(i)} style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#b91c1c' }}>✕</button>
                </div>
              ))}
              <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', fontWeight: '700', color: '#15803d', textAlign: 'right' }}>
                {lang === 'so' ? 'Wadarta:' : 'Total:'} {fmt(total)}
              </div>
            </div>

            <div>
              <label className="form-label">{lang === 'so' ? 'Lacagta La Bixiyay ($)' : 'Amount Paid ($)'}</label>
              <input className="form-input" type="number" step="0.01" value={form.paid_amount} onChange={e => setForm(f => ({ ...f, paid_amount: e.target.value }))} placeholder={fmt(total)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>{lang === 'so' ? 'Jooji' : 'Cancel'}</button>
              <button className="btn-primary" onClick={savePurchase} disabled={saving}>{saving ? '...' : (lang === 'so' ? '💾 Keydi' : '💾 Save')}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
