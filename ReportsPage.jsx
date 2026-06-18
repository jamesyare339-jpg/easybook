import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const fmt = (n) => '$' + Number(n || 0).toLocaleString();
const COLORS = ['#1D9E75', '#185FA5', '#EF9F27', '#E24B4A', '#534AB7'];

export default function ReportsPage() {
  const { lang } = useLang();
  const [reportType, setReportType] = useState('daily');
  const [dailyData, setDailyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [annualData, setAnnualData] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchReport(); }, [reportType, date, month, year]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'daily') {
        const r = await API.get(`/reports/daily?date=${date}`);
        setDailyData(r.data.data);
      } else if (reportType === 'monthly') {
        const r = await API.get(`/reports/monthly?month=${month}&year=${year}`);
        setMonthlyData(r.data.data);
      } else {
        const r = await API.get(`/reports/annual?year=${year}`);
        setAnnualData(r.data.data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const StatCard = ({ label, value, color, icon }) => (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '800', color }}>{value}</div>
    </div>
  );

  const currentData = reportType === 'daily' ? dailyData : reportType === 'monthly' ? monthlyData : annualData;

  return (
    <Layout title={lang === 'so' ? '📈 Warbixinnada' : '📈 Reports'}>
      {/* Report type tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f3f4f6', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[
          { key: 'daily', icon: '📅', en: 'Daily', so: 'Maanta' },
          { key: 'monthly', icon: '📆', en: 'Monthly', so: 'Bisha' },
          { key: 'annual', icon: '🗓️', en: 'Annual', so: 'Sanadka' },
        ].map(t => (
          <button key={t.key} onClick={() => setReportType(t.key)} style={{ padding: '8px 20px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: reportType === t.key ? 'white' : 'transparent', color: reportType === t.key ? '#1D9E75' : '#6b7280', boxShadow: reportType === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t.icon} {lang === 'so' ? t.so : t.en}
          </button>
        ))}
      </div>

      {/* Date selectors */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        {reportType === 'daily' && (
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ maxWidth: '180px' }} />
        )}
        {reportType !== 'daily' && (
          <>
            {reportType === 'monthly' && (
              <select className="form-input" style={{ maxWidth: '140px' }} value={month} onChange={e => setMonth(e.target.value)}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            )}
            <select className="form-input" style={{ maxWidth: '100px' }} value={year} onChange={e => setYear(e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
        <button className="btn-primary" onClick={fetchReport}>🔄 {lang === 'so' ? 'Cusboonaysii' : 'Refresh'}</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '10px' }}>
          <div className="spinner"></div><span style={{ color: '#6b7280' }}>{lang === 'so' ? 'La soo rarayo...' : 'Loading...'}</span>
        </div>
      ) : currentData ? (
        <>
          {/* Main KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
            <StatCard label={lang === 'so' ? 'Dakhliga' : 'Income'} value={fmt(currentData.income)} color="#1D9E75" icon="📈" />
            <StatCard label={lang === 'so' ? 'Kharashaadka' : 'Expenses'} value={fmt(currentData.expenses)} color="#ef4444" icon="📉" />
            <StatCard label={lang === 'so' ? "Faa'iidada" : 'Profit'} value={fmt(currentData.profit)} color={currentData.profit >= 0 ? '#1d4ed8' : '#ef4444'} icon="💰" />
          </div>

          {/* Extra stats for daily */}
          {reportType === 'daily' && dailyData && (
            <>
              {dailyData.transaction_count !== undefined && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  {/* Payment breakdown */}
                  {dailyData.payment_breakdown?.length > 0 && (
                    <div className="card">
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 16px' }}>
                        💳 {lang === 'so' ? 'Habka Lacag Bixinta' : 'Payment Breakdown'}
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <PieChart width={180} height={150}>
                          <Pie data={dailyData.payment_breakdown.map(p => ({ name: p.payment_method?.toUpperCase(), value: parseFloat(p.amount) }))} cx={90} cy={70} outerRadius={60} dataKey="value">
                            {dailyData.payment_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={v => fmt(v)} />
                        </PieChart>
                      </div>
                      {dailyData.payment_breakdown.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', borderBottom: i < dailyData.payment_breakdown.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block' }}></span>{p.payment_method?.toUpperCase()}</span>
                          <span style={{ fontWeight: '600' }}>{fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Top products */}
                  {dailyData.top_products?.length > 0 && (
                    <div className="card">
                      <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 16px' }}>
                        🏆 {lang === 'so' ? 'Alaabta Ugu Badan La Iibiyey' : 'Top Products'}
                      </h3>
                      {dailyData.top_products.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '20px', height: '20px', background: COLORS[i], borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '700' }}>{i + 1}</span>
                            {p.product_name}
                          </span>
                          <span><strong>{p.qty_sold}</strong> × <span style={{ color: '#1D9E75', fontWeight: '600' }}>{fmt(p.revenue)}</span></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Monthly chart */}
          {reportType === 'monthly' && monthlyData?.daily_breakdown?.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 16px' }}>
                📊 {lang === 'so' ? 'Iibka Maalin Walba' : 'Daily Sales Breakdown'}
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData.daily_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tickFormatter={d => new Date(d).getDate()} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'k'} />
                  <Tooltip formatter={v => [fmt(v), lang === 'so' ? 'Dakhli' : 'Income']} labelFormatter={d => new Date(d).toLocaleDateString()} />
                  <Bar dataKey="income" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Annual chart */}
          {reportType === 'annual' && annualData?.monthly_breakdown?.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 16px' }}>
                📊 {lang === 'so' ? `Iibka Sanadka ${annualData.year}` : `Sales Chart — ${annualData.year}`}
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={annualData.monthly_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month_name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'k'} />
                  <Tooltip formatter={v => [fmt(v), lang === 'so' ? 'Dakhli' : 'Income']} />
                  <Line type="monotone" dataKey="income" stroke="#1D9E75" strokeWidth={2.5} dot={{ fill: '#1D9E75', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Profit analysis */}
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 14px' }}>
              🧮 {lang === 'so' ? 'Falanqaynta Dhaqaale' : 'Financial Analysis'}
            </h3>
            <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
              {[
                { label: lang === 'so' ? 'Dakhliga Wadarta' : 'Total Income', value: fmt(currentData.income), color: '#1D9E75' },
                { label: lang === 'so' ? 'Kharashaadka Wadarta' : 'Total Expenses', value: '− ' + fmt(currentData.expenses), color: '#ef4444' },
                { label: lang === 'so' ? "Faa'iidada Saafi" : 'Net Profit', value: fmt(currentData.profit), color: currentData.profit >= 0 ? '#1d4ed8' : '#ef4444', bold: true },
                { label: lang === 'so' ? 'Xaddiga Faa\'iidada' : 'Profit Margin', value: currentData.income > 0 ? ((currentData.profit / currentData.income) * 100).toFixed(1) + '%' : '0%', color: '#374151' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: i === 2 ? '#f0fdf4' : '#f9fafb', borderRadius: '8px', border: i === 2 ? '1px solid #86efac' : 'none' }}>
                  <span style={{ color: '#6b7280' }}>{row.label}</span>
                  <span style={{ fontWeight: row.bold ? '800' : '600', color: row.color, fontSize: row.bold ? '16px' : '14px' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
          <p>{lang === 'so' ? 'Warbixin la heli karo ma jirto mudadaas' : 'No report data available for this period'}</p>
        </div>
      )}
    </Layout>
  );
}
