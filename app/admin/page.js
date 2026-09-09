'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/admin/dashboard';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal login');
      router.push(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <div className="login-box">
        <Link href="/" style={{ color: 'var(--cy)', textDecoration: 'none', fontWeight: 700 }}>← Kembali ke web</Link>
        <h1 style={{ margin: '10px 0 6px' }}>🔐 Login Admin</h1>
        <p style={{ color: 'var(--mut)', fontSize: 14, marginBottom: 16 }}>
          Khusus pemilik/teknisi IloTech.
        </p>
        {error && <div className="err">⚠️ {error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Password Admin</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required autoFocus />
          </div>
          <button className="btn cy" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Memeriksa...' : 'Masuk Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
