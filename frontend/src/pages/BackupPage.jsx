import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/layout/Layout';
import { API } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function BackupPage() {
  const { lang } = useLang();
  const [history, setHistory] = useState([]);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try { const r = await API.get('/backup/history'); setHistory(r.data.data || []); } catch (e) {}
  };

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  const createBackup = async () => {
    setCreating(true);
    try {
      const r = await API.get('/backup/create');
      const blob = new Blob([JSON.stringify(r.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMsg('success', lang === 'so' ? '✅ Backup-ka waa la sameeyay oo la soo dejiyay!' : '✅ Backup created and downloaded!');
      fetchHistory();
    } catch (e) {
      showMsg('error', lang === 'so' ? 'Backup wuu fashilmay' : 'Backup failed');
    }
    setCreating(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm(lang === 'so' ? '⚠️ Tani waxay BEDDELI DOONTAA dhammaan xogta hadda jirta! Ma hubtaa?' : '⚠️ This will REPLACE all current data! Are you sure?')) {
      e.target.value = '';
      return;
    }
    setRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        await API.post('/backup/restore', { backup });
        showMsg('success', lang === 'so' ? '✅ Database-ka si guul leh ayaa loo soo celiyay!' : '✅ Database restored successfully!');
        fetchHistory();
      } catch (err) {
        showMsg('error', lang === 'so' ? 'Soo celinta wuu fashilmay — hubi faylka' : 'Restore failed — check the file');
      }
      setRestoring(false);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <Layout title={lang === 'so' ? '💾 Backup & Soo Celin' : '💾 Backup & Restore'}>
      {msg && (
        <div style={{ position: 'fixed', top: '70px', right: '24px', zIndex: 200, background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`, color: msg.type === 'success' ? '#15803d' : '#b91c1c', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', maxWidth: '320px' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📥</div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>{lang === 'so' ? 'Samee Backup' : 'Create Backup'}</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            {lang === 'so' ? 'Soo deji nuqul buuxa oo xogtaada ah (JSON file)' : 'Download a full copy of your data (JSON file)'}
          </p>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={createBackup} disabled={creating}>
            {creating ? '...' : `📥 ${lang === 'so' ? 'Samee oo Soo Deji' : 'Create & Download'}`}
          </button>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📤</div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px' }}>{lang === 'so' ? 'Soo Celi Backup' : 'Restore Backup'}</h3>
          <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '16px' }}>
            ⚠️ {lang === 'so' ? 'Waxay beddeli doontaa dhammaan xogta hadda jirta!' : 'This will replace all current data!'}
          </p>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileSelect} />
          <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', borderColor: '#fca5a5', color: '#b91c1c' }} onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={restoring}>
            {restoring ? '...' : `📤 ${lang === 'so' ? 'Dooro Fayl oo Soo Celi' : 'Select File & Restore'}`}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>📋 {lang === 'so' ? 'Taariikhda Backup-ka' : 'Backup History'}</h3>
        </div>
        <table className="data-table">
          <thead><tr>
            <th>{lang === 'so' ? 'Faylka' : 'Filename'}</th>
            <th>{lang === 'so' ? 'Nooca' : 'Type'}</th>
            <th>{lang === 'so' ? 'Xaaladda' : 'Status'}</th>
            <th>{lang === 'so' ? 'Cabbirka' : 'Size'}</th>
            <th>{lang === 'so' ? 'Qofka' : 'By'}</th>
            <th>{lang === 'so' ? 'Taariikhda' : 'Date'}</th>
          </tr></thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '30px' }}>{lang === 'so' ? 'Weli backup lama samayn' : 'No backups yet'}</td></tr>
            ) : history.map(h => (
              <tr key={h.id}>
                <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{h.filename}</code></td>
                <td style={{ color: '#6b7280', fontSize: '12px' }}>{h.type}</td>
                <td>
                  <span className={`badge ${h.status === 'completed' ? 'badge-green' : h.status === 'restored' ? 'badge-blue' : 'badge-red'}`}>
                    {h.status}
                  </span>
                </td>
                <td style={{ color: '#6b7280', fontSize: '12px' }}>{h.size_bytes ? (h.size_bytes / 1024).toFixed(1) + ' KB' : '—'}</td>
                <td style={{ color: '#6b7280', fontSize: '12px' }}>{h.user_name || '—'}</td>
                <td style={{ color: '#6b7280', fontSize: '12px' }}>{new Date(h.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
