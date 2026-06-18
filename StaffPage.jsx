import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const fmt = (n) => '$' + Number(n || 0).toFixed(2);

export default function StaffPage() {
  const { lang } = useLang();
  const [staff, setStaff] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [branches, setBranches] = useState([]);
  const [tab, setTab] = useState('staff');
  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState(null);
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', role: '', base_salary: '', branch_id: '', hire_date: '' });
  const [editPayroll, setEditPayroll] = useState(null);
  const [payForm, setPayForm] = useState({ bonus: 0, deductions: 0, status: 'pending', notes: '' });

  useEffect(() => { fetchStaff(); fetchBranches(); }, []);
  useEffect(() => { if (tab === 'payroll') fetchPayroll(); }, [tab, payMonth, payYear]);

  const fetchStaff = async () => { try { const r = await API.get('/staff'); setStaff(r.data.data || []); } catch (e) {} };
  const fetchBranches = async () => { try { const r = await API.get('/branches'); setBranches(r.data.data || []); } catch (e) {} };
  const fetchPayroll = async () => { try { const r = await API.get(`/payroll?month=${payMonth}&year=${payYear}`); setPayroll(r.data.data || []); } catch (e) {} };

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  const openAdd = () => { setEditStaff(null); setForm({ name: '', phone: '', role: '', base_salary: '', branch_id: '', hire_date: '' }); setShowModal(true); };
  const openEdit = (s) => { setEditStaff(s); setForm({ name: s.name, phone: s.phone || '', role: s.role || '', base_salary: s.base_salary, branch_id: s.branch_id, hire_date: s.hire_date ? s.hire_date.split('T')[0] : '' }); setShowModal(true); };

  const saveStaff = async () => {
    if (!form.name || !form.base_salary) return showMsg('error', lang === 'so' ? 'Magaca iyo mushaarada ku buuxi' : 'Fill in name and salary');
    setSaving(true);
    try {
      if (editStaff) { await API.put(`/staff/${editStaff.id}`, form); showMsg('success', lang === 'so' ? 'Shaqaalaha waa la cusbooneysiiyay ✓' : 'Staff updated ✓'); }
      else { await API.post('/staff', form); showMsg('success', lang === 'so' ? 'Shaqaalaha cusub waa la daray ✓' : 'Staff added ✓'); }
      setShowModal(false); fetchStaff();
    } catch (e) { showMsg('error', 'Error'); }
    setSaving(false);
  };

  const generatePayroll = async () => {
    setGenerating(true);
    try {
      await API.post('/payroll/generate', { month: payMonth, year: payYear });
      showMsg('success', lang === 'so' ? `Mushaarada ${payMonth}/${payYear} waa la diyaariyay ✓` : `Payroll ${payMonth}/${payYear} generated ✓`);
      fetchPayroll();
    } catch (e) { showMsg('error', 'Error generating payroll'); }
    setGenerating(false);
  };

  const savePayroll = async () => {
    setSaving(true);
    try {
      await API.put(`/payroll/${editPayroll.id}`, payForm);
      showMsg('success', lang === 'so' ? 'Mushaarada waa la cusbooneysiiyay ✓' : 'Payroll updated ✓');
      setEditPayroll(null); fetchPayroll();
    } catch (e) { showMsg('error', 'Error'); }
    setSaving(false);
  };

  const totalPayroll = payroll.reduce((s, p) => s + parseFloat(p.net_salary || 0), 0);
  const paidCount = payroll.filter(p => p.status === 'paid').length;

  const roles = [
    { en: 'Branch Manager', so: 'Maamulaha Xarunta' },
    { en: 'Cashier', so: 'Kaasiirka' },
    { en: 'Store Keeper', so: 'Difaaca Bakhaarka' },
    { en: 'Sales Staff', so: 'Shaqaalaha Iibka' },
    { en: 'Driver', so: 'Darawalkaha' },
    { en: 'Security', so: 'Ilaalinta' },
    { en: 'Other', so: 'Kale' },
  ];

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <Layout title={lang === 'so' ? '👥 Shaqaalaha & Mushaarada' : '👥 Staff & Payroll'}>
      {msg && (
        <div style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 200, background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, color: msg.type === 'success' ? '#15803d' : '#b91c1c', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '500' }}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f3f4f6', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[{ key: 'staff', icon: '👥', en: 'Staff List', so: 'Liiska Shaqaalaha' }, { key: 'payroll', icon: '💰', en: 'Payroll', so: 'Mushaarada' }].map(t_ => (
          <button key={t_.key} onClick={() => setTab(t_.key)} style={{ padding: '8px 18px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: tab === t_.key ? 'white' : 'transparent', color: tab === t_.key ? '#1D9E75' : '#6b7280', boxShadow: tab === t_.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t_.icon} {lang === 'so' ? t_.so : t_.en}
          </button>
        ))}
      </div>

      {tab === 'staff' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>{lang === 'so' ? 'Liiska Shaqaalaha' : 'Staff Members'}</h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>{staff.length} {lang === 'so' ? 'shaqaale oo firfircoon' : 'active staff'}</p>
            </div>
            <button className="btn-primary" onClick={openAdd}>➕ {lang === 'so' ? 'Shaqaale Ku Dar' : 'Add Staff'}</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {staff.map(s => (
              <div key={s.id} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '44px', height: '44px', background: '#E1F5EE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#0F6E56', fontSize: '15px' }}>
                      {s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{s.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.role}</div>
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => openEdit(s)}>✏️</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  <div><span style={{ color: '#9ca3af' }}>📱 </span>{s.phone || '—'}</div>
                  <div><span style={{ color: '#9ca3af' }}>🏪 </span>{s.branch_name || '—'}</div>
                  <div><span style={{ color: '#9ca3af' }}>📅 </span>{s.hire_date ? new Date(s.hire_date).toLocaleDateString() : '—'}</div>
                  <div style={{ fontWeight: '700', color: '#1D9E75' }}>💰 {fmt(s.base_salary)}{lang === 'so' ? '/bil' : '/mo'}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Payroll controls */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select className="form-input" style={{ maxWidth: '140px' }} value={payMonth} onChange={e => setPayMonth(e.target.value)}>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="form-input" style={{ maxWidth: '100px' }} value={payYear} onChange={e => setPayYear(e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn-primary" onClick={generatePayroll} disabled={generating}>
              {generating ? '...' : (lang === 'so' ? '⚙️ Samee Mushaarada' : '⚙️ Generate Payroll')}
            </button>

            {payroll.length > 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '13px' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '8px 14px' }}>
                  <span style={{ color: '#6b7280' }}>{lang === 'so' ? 'Wadarta:' : 'Total:'} </span>
                  <strong style={{ color: '#15803d' }}>{fmt(totalPayroll)}</strong>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '8px 14px' }}>
                  <span style={{ color: '#6b7280' }}>{lang === 'so' ? 'La Bixiyay:' : 'Paid:'} </span>
                  <strong style={{ color: '#1d4ed8' }}>{paidCount}/{payroll.length}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{lang === 'so' ? 'Shaqaalaha' : 'Staff'}</th>
                    <th>{lang === 'so' ? 'Jagada' : 'Role'}</th>
                    <th>{lang === 'so' ? 'Xarunta' : 'Branch'}</th>
                    <th>{lang === 'so' ? 'Mushaar Aasaasi' : 'Base'}</th>
                    <th>{lang === 'so' ? 'Gunno' : 'Bonus'}</th>
                    <th>{lang === 'so' ? 'Jarid' : 'Deduct'}</th>
                    <th>{lang === 'so' ? 'Mushaarka Net' : 'Net Salary'}</th>
                    <th>{lang === 'so' ? 'Xaaladda' : 'Status'}</th>
                    <th>{lang === 'so' ? 'Hawlaha' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>
                      {lang === 'so' ? "Mushaar lama diyaarinin bishaas. Guji 'Samee Mushaarada'" : "No payroll for this month. Click 'Generate Payroll'"}
                    </td></tr>
                  ) : payroll.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '600' }}>{p.staff_name}</td>
                      <td style={{ color: '#6b7280', fontSize: '12px' }}>{p.role}</td>
                      <td style={{ color: '#6b7280', fontSize: '12px' }}>{p.branch_name}</td>
                      <td>{fmt(p.base_salary)}</td>
                      <td style={{ color: '#15803d' }}>+{fmt(p.bonus)}</td>
                      <td style={{ color: '#ef4444' }}>-{fmt(p.deductions)}</td>
                      <td style={{ fontWeight: '700', fontSize: '15px', color: '#1D9E75' }}>{fmt(p.net_salary)}</td>
                      <td>
                        <span className={`badge ${p.status === 'paid' ? 'badge-green' : 'badge-amber'}`}>
                          {p.status === 'paid' ? (lang === 'so' ? 'La Bixiyay' : 'Paid') : (lang === 'so' ? 'Sugaya' : 'Pending')}
                        </span>
                      </td>
                      <td>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => { setEditPayroll(p); setPayForm({ bonus: p.bonus, deductions: p.deductions, status: p.status, notes: p.notes || '' }); }}>
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Staff Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700' }}>
              {editStaff ? (lang === 'so' ? '✏️ Tafatir Shaqaalaha' : '✏️ Edit Staff') : (lang === 'so' ? '➕ Shaqaale Cusub Ku Dar' : '➕ Add New Staff')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">{lang === 'so' ? 'Magaca Shaqaalaha *' : 'Full Name *'}</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={lang === 'so' ? 'Magaca dhammaystiran...' : 'Full name...'} />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Telefoonka' : 'Phone'}</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+252 6X..." />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Jagada' : 'Role'}</label>
                <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="">{lang === 'so' ? 'Dooro jagada' : 'Select role'}</option>
                  {roles.map(r => <option key={r.en} value={r.en}>{lang === 'so' ? r.so : r.en}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Mushaarka Aasaasiga ($)' : 'Base Salary ($)'}</label>
                <input className="form-input" type="number" step="0.01" value={form.base_salary} onChange={e => setForm(f => ({ ...f, base_salary: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Xarunta' : 'Branch'}</label>
                <select className="form-input" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">{lang === 'so' ? 'Dooro xarunta' : 'Select branch'}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Taariikhda Shaqada' : 'Hire Date'}</label>
                <input className="form-input" type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>{lang === 'so' ? 'Jooji' : 'Cancel'}</button>
              <button className="btn-primary" onClick={saveStaff} disabled={saving}>{saving ? '...' : (lang === 'so' ? '💾 Keydi' : '💾 Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payroll Modal */}
      {editPayroll && (
        <div className="modal-backdrop" onClick={() => setEditPayroll(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700' }}>
              💰 {lang === 'so' ? 'Cusboonaysii Mushaarada' : 'Update Payroll'} — {editPayroll.staff_name}
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
                <span style={{ color: '#6b7280' }}>{lang === 'so' ? 'Mushaar Aasaasi:' : 'Base Salary:'} </span>
                <strong>{fmt(editPayroll.base_salary)}</strong>
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Gunno (+$)' : 'Bonus (+$)'}</label>
                <input className="form-input" type="number" step="0.01" value={payForm.bonus} onChange={e => setPayForm(f => ({ ...f, bonus: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Lacag La Jaro (-$)' : 'Deductions (-$)'}</label>
                <input className="form-input" type="number" step="0.01" value={payForm.deductions} onChange={e => setPayForm(f => ({ ...f, deductions: e.target.value }))} />
              </div>
              <div style={{ background: '#E1F5EE', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', fontWeight: '700', color: '#0F6E56' }}>
                {lang === 'so' ? 'Mushaarka Net:' : 'Net Salary:'} {fmt(parseFloat(editPayroll.base_salary) + parseFloat(payForm.bonus || 0) - parseFloat(payForm.deductions || 0))}
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Xaaladda' : 'Status'}</label>
                <select className="form-input" value={payForm.status} onChange={e => setPayForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="pending">{lang === 'so' ? 'Sugaya' : 'Pending'}</option>
                  <option value="paid">{lang === 'so' ? 'La Bixiyay' : 'Paid'}</option>
                </select>
              </div>
              <div>
                <label className="form-label">{lang === 'so' ? 'Faallada' : 'Notes'}</label>
                <input className="form-input" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder={lang === 'so' ? 'Faallad...' : 'Notes...'} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setEditPayroll(null)}>{lang === 'so' ? 'Jooji' : 'Cancel'}</button>
              <button className="btn-primary" onClick={savePayroll} disabled={saving}>{saving ? '...' : (lang === 'so' ? '💾 Keydi' : '💾 Save')}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
