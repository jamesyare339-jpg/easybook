import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

const fmt = (n) => '$' + Number(n || 0).toFixed(2);

export default function ProfitLossPage() {
  const { lang } = useLang();
  const [data, setData] = useState(null);
  const [byProduct, setByProduct] = useState([]);
  const [byBranch, setByBranch] = useState([]);
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('summary');

  useEffect(() => { fetchAll(); }, [dateFrom, dateTo]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pl, prod, branch] = await Promise.all([
        API.get(`/reports/profit-loss?date_from=${dateFrom}&date_to=${dateTo}`),
        API.get(`/reports/profit-by-product?date_from=${dateFrom}&date_to=${dateTo}`),
        API.get(`/reports/profit-by-branch?date_from=${dateFrom}&date_to=${dateTo}`),
      ]);
      setData(pl.data.data);
      setByProduct(prod.data.data || []);
      setByBranch(branch.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const Row = ({ label, value, bold, color, indent }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', paddingLeft: indent ? '28px' : '14px', background: bold ? '#f0fdf4' : 'transparent', borderRadius: bold ? '8px' : 0, borderTop: bold ? '2px solid #86efac' : '1px solid #f3f4f6' }}>
      <span style={{ color: bold ? '#111' : '#6b7280', fontWeight: bold ? '700' : '400', fontSize: bold ? '14px' : '13px' }}>{label}</span>
      <span style={{ fontWeight: bold ? '800' : '600', color: color || (bold ? '#111' : '#374151'), fontSize: bold ? '16px' : '14px' }}>{value}</span>
    </div>
  );

  return (
    <Layout title={lang === 'so' ? "📊 Faa'iidada & Khasaaraha" : '📊 Profit & Loss'}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" type="date" style={{ maxWidth: '160px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span style={{ color: '#9ca3af' }}>→</span>
        <input className="form-input" type="date" style={{ maxWidth: '160px' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button className="btn-primary" onClick={fetchAll}>🔄 {lang === 'so' ? 'Cusboonaysii' : 'Refresh'}</button>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f3f4f6', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[
          { key: 'summary', icon: '📋', en: 'P&L Statement', so: 'Warbixinta Guud' },
          { key: 'product', icon: '📦', en: 'By Product', so: 'Alaabta' },
          { key: 'branch', icon: '🏪', en: 'By Branch', so: 'Xarunta' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 18px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: tab === t.key ? 'white' : 'transparent', color: tab === t.key ? '#1D9E75' : '#6b7280', boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t.icon} {lang === 'so' ? t.so : t.en}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', gap: '10px' }}>
          <div className="spinner"></div><span style={{ color: '#6b7280' }}>{lang === 'so' ? 'La soo rarayo...' : 'Loading...'}</span>
        </div>
      ) : tab === 'summary' && data ? (
        <div className="card" style={{ maxWidth: '640px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700' }}>
            {lang === 'so' ? 'Warbixinta Faa\'iidada' : 'Profit & Loss Statement'}
          </h3>
          <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#9ca3af' }}>
            {new Date(data.period.from).toLocaleDateString()} — {new Date(data.period.to).toLocaleDateString()}
          </p>

          <Row label={lang === 'so' ? 'Dakhliga (Iibka)' : 'Revenue (Sales)'} value={fmt(data.revenue)} color="#1D9E75" />
          <Row label={lang === 'so' ? `Macaamilada: ${data.sale_count}` : `Transactions: ${data.sale_count}`} value="" indent />
          <Row label={lang === 'so' ? 'Qiimaha Alaabta La Iibiyey (COGS)' : 'Cost of Goods Sold (COGS)'} value={'− ' + fmt(data.cogs)} color="#ef4444" />
          <Row label={lang === 'so' ? "Faa'iidada Guud" : 'Gross Profit'} value={fmt(data.gross_profit)} color="#1d4ed8" bold />
          <Row label={lang === 'so' ? `Margin-ka Guud: ${data.gross_margin.toFixed(1)}%` : `Gross Margin: ${data.gross_margin.toFixed(1)}%`} value="" indent />

          <div style={{ marginTop: '10px' }}>
            <Row label={lang === 'so' ? 'Kharashaadka Hawlgalka' : 'Operating Expenses'} value={'− ' + fmt(data.operating_expenses)} color="#ef4444" />
            <Row label={lang === 'so' ? 'Kharashka Mushaarada' : 'Payroll Costs'} value={'− ' + fmt(data.payroll_costs)} color="#ef4444" />
          </div>

          <Row label={lang === 'so' ? "Faa'iidada Saafi Ah" : 'Net Profit'} value={fmt(data.net_profit)} color={data.net_profit >= 0 ? '#15803d' : '#ef4444'} bold />
          <Row label={lang === 'so' ? `Margin-ka Saafi: ${data.net_margin.toFixed(1)}%` : `Net Margin: ${data.net_margin.toFixed(1)}%`} value="" indent />

          {data.expense_breakdown?.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#374151' }}>
                {lang === 'so' ? 'Kharashaadka Qaybsan' : 'Expense Breakdown'}
              </h4>
              {data.expense_breakdown.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>
                  <span>{lang === 'so' ? (e.type_so || e.type) : e.type}</span>
                  <span style={{ fontWeight: '600', color: '#ef4444' }}>{fmt(e.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === 'product' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr>
              <th>{lang === 'so' ? 'Alaabta' : 'Product'}</th>
              <th>{lang === 'so' ? 'Tirada La Iibiyey' : 'Units Sold'}</th>
              <th>{lang === 'so' ? 'Dakhliga' : 'Revenue'}</th>
              <th>{lang === 'so' ? 'Qiimaha' : 'Cost'}</th>
              <th>{lang === 'so' ? "Faa'iidada" : 'Profit'}</th>
              <th>Margin</th>
            </tr></thead>
            <tbody>
              {byProduct.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>{lang === 'so' ? 'Xog lama helin' : 'No data'}</td></tr> :
                byProduct.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{p.product_name}</td>
                    <td>{p.units_sold}</td>
                    <td style={{ color: '#1D9E75' }}>{fmt(p.revenue)}</td>
                    <td style={{ color: '#6b7280' }}>{fmt(p.cost)}</td>
                    <td style={{ fontWeight: '700', color: parseFloat(p.profit) >= 0 ? '#15803d' : '#ef4444' }}>{fmt(p.profit)}</td>
                    <td><span className={`badge ${parseFloat(p.margin_pct) > 30 ? 'badge-green' : 'badge-amber'}`}>{p.margin_pct}%</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr>
              <th>{lang === 'so' ? 'Xarunta' : 'Branch'}</th>
              <th>{lang === 'so' ? 'Dakhliga' : 'Revenue'}</th>
              <th>{lang === 'so' ? 'Kharashaadka' : 'Expenses'}</th>
              <th>{lang === 'so' ? "Faa'iidada" : 'Profit'}</th>
            </tr></thead>
            <tbody>
              {byBranch.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>{lang === 'so' ? 'Xog lama helin' : 'No data'}</td></tr> :
                byBranch.map((b, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '600' }}>🏪 {b.branch_name}</td>
                    <td style={{ color: '#1D9E75' }}>{fmt(b.revenue)}</td>
                    <td style={{ color: '#ef4444' }}>{fmt(b.expenses)}</td>
                    <td style={{ fontWeight: '700', color: b.profit >= 0 ? '#15803d' : '#ef4444' }}>{fmt(b.profit)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
