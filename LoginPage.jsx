import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@easybook.so');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { lang, toggleLang } = useLang();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed / Galitaanka waa fashilmay');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #E1F5EE 0%, #f0fdf4 50%, #E1F5EE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', background: '#1D9E75', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>📚</div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1D9E75', margin: 0 }}>EasyBook</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px' }}>
            {lang === 'so' ? 'Nidaamka Maamulka Ganacsi' : 'Business Management System'}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              {lang === 'so' ? 'Gal Nidaamka' : 'Sign In'}
            </h2>
            <button onClick={toggleLang} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: '#374151', fontWeight: '500' }}>
              🌐 {lang === 'so' ? 'English' : 'Soomaali'}
            </button>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', color: '#b91c1c', fontSize: '14px', marginBottom: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">
                {lang === 'so' ? 'Email-kaaga' : 'Email Address'}
              </label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@easybook.so"
                required
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label className="form-label">
                {lang === 'so' ? 'Passwordkaaga' : 'Password'}
              </label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }} disabled={loading}>
              {loading ? (
                <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div> {lang === 'so' ? 'La Galayo...' : 'Signing in...'}</>
              ) : (
                lang === 'so' ? '🔐 Gal Nidaamka' : '🔐 Sign In'
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', padding: '12px', background: '#f9fafb', borderRadius: '8px', fontSize: '12px', color: '#6b7280' }}>
            <strong>{lang === 'so' ? 'Xisaabta Tijaabada:' : 'Demo Account:'}</strong><br />
            Email: admin@easybook.so | Password: admin123
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px', marginTop: '20px' }}>
          EasyBook v1.0 © 2026 · {lang === 'so' ? 'Dhammaan xuquuqda way dhowran tahay' : 'All rights reserved'}
        </p>
      </div>
    </div>
  );
}
