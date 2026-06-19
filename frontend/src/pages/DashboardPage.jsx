import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const fmt = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function KPICard({ label, value, icon, sub, subColor }) {
  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginBottom: '8px' }}>{label}</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#111' }}>{value}</div>
          {sub && <div style={{ fontSize: '12px', color: subColor || '#6b7280', marginTop: '4px' }}>{sub}</div>}
        </div>
        <div style={{ fontSize: '28px', opacity: 0.8 }}>{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLang();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await API.get('/dashboard');
      if (res.data.success) setData(res.data.data);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <Layout title={t('dashboard')}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
        <div className="spinner"></div>
        <span style={{ color: '#6b7280' }}>{t('loading')}</span>
      </div>
    </Layout>
  );

  const today = data?.today || {};
  const totals = data?.totals || {};
  const lowStock = data?.low_stock_items || [];
  const recentSales = data?.recent_sales || [];
  const chartData = data?.monthly_chart || [];

  return (
    <Layout title={t('dashboard')}>
      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="alert-warning" style={{ marginBottom: '20px' }}>
          ⚠️ <strong>{lang === 'so' ? 'Digniin:' : 'Alert:'}</strong>&nbsp;
          {lowStock.slice(0, 3).map(i => i.name).join(', ')}
          {lowStock.length > 3 && ` + ${lowStock.length - 3} more`}
          {lang === 'so' ? ' — stock aad u yar ayay leeyihiin' : ' — stock is critically low'}
        </div>
      )}

      {/* KPI Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
        <KPICard label={t('todayIncome')} value={fmt(today.income)} icon="📈" sub={lang === 'so' ? 'Dakhliga maanta' : "Today's revenue"} subColor="#1D9E75" />
        <KPICard label={t('todayExpenses')} value={fmt(today.expenses)} icon="🧾" sub={lang === 'so' ? 'Kharashka maanta' : "Today's costs"} subColor="#ef4444" />
        <KPICard label={t('todayProfit')} value={fmt(today.profit)} icon="💰" sub={lang === 'so' ? "Faa'iidada saafi" : 'Net profit'} subColor="#1d4ed8" />
        <KPICard label={t('staffCount')} value={totals.staff_count || 0} icon="👥" sub={lang === 'so' ? 'Xaruumaha dhammaan' : 'All branches'} />
      </div>

      {/* KPI Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPICard label={t('totalStock')} value={(totals.stock || 0).toLocaleString()} icon="📦" sub={lang === 'so' ? 'Dhammaan xaruumaha' : 'Across all stores'} />
        <KPICard label={t('customerDebt')} value={fmt(totals.customer_debt)} icon="🧑‍💼" sub={lang === 'so' ? 'Macaamiisha ku leeyihiin' : 'Customers owe us'} subColor="#ef4444" />
        <KPICard label={t('supplierDebt')} value={fmt(totals.supplier_debt)} icon="🏭" sub={lang === 'so' ? 'Supplier ku leeyihiin' : 'We owe suppliers'} subColor="#f59e0b" />
        <KPICard label={t('lowStockAlerts')} value={totals.low_stock_count || 0} icon="⚠️" sub={lang === 'so' ? 'Alaab dhamaanaysa' : 'Need restocking'} subColor="#ef4444" />
      </div>

      {/* Charts + Tables row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Sales chart */}
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px' }}>
            📊 {lang === 'so' ? 'Iibka 6da Bil ee Dambe' : 'Sales — Last 6 Months'}
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '$' + (v/1000).toFixed(0) + 'k'} />
                <Tooltip formatter={v => ['$' + Number(v).toLocaleString(), lang === 'so' ? 'Dakhli' : 'Income']} />
                <Line type="monotone" dataKey="income" stroke="#1D9E75" strokeWidth={2} dot={{ fill: '#1D9E75', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
              {lang === 'so' ? 'Xog ma jirto' : 'No data yet'}
            </div>
          )}
        </div>

        {/* Recent sales */}
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 14px' }}>
            🛒 {t('recentSales')}
          </h3>
          {recentSales.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>{t('noData')}</div>
          ) : (
            recentSales.slice(0, 6).map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>{s.customer_name}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.payment_method?.toUpperCase()} · {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1D9E75' }}>{fmt(s.total_amount)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Low stock table */}
      {lowStock.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 14px' }}>⚠️ {t('lowStockItems')}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('productName')}</th>
                  <th>{t('branch')}</th>
                  <th>{t('stock')}</th>
                  <th>{lang === 'so' ? 'Xaddiga Ugu Yar' : 'Min Threshold'}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '500' }}>{item.name}</td>
                    <td>{item.branch_name}</td>
                    <td style={{ fontWeight: '700', color: item.quantity <= 2 ? '#ef4444' : '#f59e0b' }}>{item.quantity}</td>
                    <td style={{ color: '#6b7280' }}>{item.low_stock_threshold}</td>
                    <td>
                      <span className={`badge ${item.quantity <= 2 ? 'badge-red' : 'badge-amber'}`}>
                        {item.quantity <= 2 ? t('critical') : t('low')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
