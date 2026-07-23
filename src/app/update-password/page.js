'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { showToast } from '../../lib/toast';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Optional: check if we really have an active session for recovery
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // We might not have a session right away depending on Supabase flow,
        // but typically the hash in URL logs them in automatically.
      }
    });
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Kata sandi harus minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      showToast('Kata sandi berhasil diperbarui!', 'success');
      router.push('/');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat memperbarui sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content-card" style={{ maxWidth: '400px', width: '100%', margin: '2rem' }}>
        <div className="auth-header text-center">
          <div className="auth-lock-icon">🔒</div>
          <h2 className="modal-title mt-2">Buat Sandi Baru</h2>
          <p className="text-muted mt-2" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
            Silakan masukkan kata sandi baru Anda di bawah ini.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="modal-form mt-3">
          {error && (
            <div className="auth-error-banner">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Kata Sandi Baru</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Minimal 6 karakter"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ulangi Kata Sandi</label>
            <input 
              type="password" 
              className="form-input" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Minimal 6 karakter"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary mt-2" 
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan Sandi Baru'}
          </button>
          
          <div className="text-center mt-3">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => router.push('/')}
            >
              Batal & Kembali ke Beranda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
