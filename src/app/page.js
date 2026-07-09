'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { showToast } from '../lib/toast';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  // Login wall states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  
  // Auth form states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Check query params to auto-open registration modal
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'register') {
      setIsSignUp(true);
      setShowLockWarning(false);
      setShowAuthModal(true);
      // Clean url query parameter quietly
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('auth') === 'login') {
      setIsSignUp(false);
      setShowLockWarning(false); // Guest click doesn't show warning
      setShowAuthModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => subscription.unsubscribe();
  }, []);

  const roles = [
    {
      id: 'software_engineer',
      title: 'Software Engineer',
      desc: 'Simulasi wawancara teknikal dan fundamental programming, problem solving, serta teamwork.',
      icon: '💻',
      color: 'blue'
    },
    {
      id: 'digital_marketing',
      title: 'Digital Marketing',
      desc: 'Uji kemampuan analisis kampanye, SEO, strategi konten, dan metrik konversi.',
      icon: '📈',
      color: 'purple'
    },
    {
      id: 'ui_ux_designer',
      title: 'UI/UX Designer',
      desc: 'Fokus pada design thinking, wireframing, user research, dan studi kasus UI.',
      icon: '🎨',
      color: 'pink'
    }
  ];

  const handleStart = (roleId) => {
    if (!user) {
      setPendingRole(roleId);
      setIsSignUp(true); // Direct to Register (Sign Up)
      setShowLockWarning(true); // Show warning
      setShowAuthModal(true);
      return;
    }
    
    sessionStorage.setItem('selectedRole', roleId);
    router.push('/interview');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      if (isSignUp) {
        // Call backend registration (bypasses rate limits and confirms email)
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
        });
        
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Gagal mendaftar');
        
        // Auto Login after successful signup
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });
        
        if (error) throw error;
        
        showToast('Registrasi sukses! Anda telah masuk.', 'success');
        if (data?.user) {
          setUser(data.user);
          if (pendingRole) {
            sessionStorage.setItem('selectedRole', pendingRole);
            router.push('/interview');
          }
        }
      } else {
        // Supabase Auth Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });
        
        if (error) throw error;
        
        if (data?.user) {
          setUser(data.user);
          if (pendingRole) {
            sessionStorage.setItem('selectedRole', pendingRole);
            router.push('/interview');
          }
        }
      }
      setShowAuthModal(false);
    } catch (err) {
      console.error(err);
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className={`home-wrapper ${showAuthModal ? 'body-locked' : ''}`}>
      <div className="hero-section">
        <div className="hero-badge">✨ Dipercaya oleh Ratusan Kandidat</div>
        <h1 className="hero-title">
          Kuasai Wawancara Kerja<br />
          <span className="text-gradient">Lebih Percaya Diri</span>
        </h1>
        <p className="hero-subtitle">
          Berlatih wawancara secara langsung dengan AI cerdas kami. Pilih peran impian Anda dan dapatkan umpan balik instan untuk lolos seleksi.
        </p>
      </div>

      <div className="grid-roles">
        {roles.map((role) => (
          <div className="card role-card" key={role.id}>
            <div className={`card-icon-modern icon-${role.color}`}>
              {role.icon}
            </div>
            <h2 className="card-title">{role.title}</h2>
            <p className="card-desc">{role.desc}</p>
            <button 
              className="btn btn-primary btn-glow"
              onClick={() => handleStart(role.id)}
            >
              Mulai Simulasi
            </button>
          </div>
        ))}
      </div>

      {/* Auth Modal / Login Wall */}
      {showAuthModal && (
        <div className="modal-overlay auth-overlay">
          <div className="modal-content-card auth-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-header text-center">
              <div className="auth-lock-icon">🔑</div>
              <h2 className="modal-title mt-2">
                {isSignUp ? 'Daftar Akun PrepTalk' : 'Masuk ke PrepTalk'}
              </h2>
              {showLockWarning && isSignUp && (
                <p className="text-danger mt-1 font-semibold" style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.95rem' }}>
                  Required login to unlock
                </p>
              )}
              <p className="text-muted mt-2" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                {isSignUp 
                  ? 'Daftarkan email Anda secara gratis untuk mulai merekam jawaban dan mendapatkan hasil rapor evaluasi AI secara permanen.'
                  : 'Silakan masuk ke akun Anda untuk melanjutkan sesi simulasi wawancara kerja interaktif.'
                }
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="modal-form mt-3">
              {authError && (
                <div className="auth-error-banner">
                  ⚠️ {authError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Alamat Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="nama@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kata Sandi (Password)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary mt-2" 
                disabled={authLoading}
              >
                {authLoading ? 'Memproses...' : (isSignUp ? 'Buat Akun Sekarang' : 'Masuk Sekarang')}
              </button>

              <div className="text-center mt-3" style={{ fontSize: '0.9rem' }}>
                <span className="text-muted">
                  {isSignUp ? 'Sudah memiliki akun? ' : 'Belum memiliki akun? '}
                </span>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError('');
                  }}
                  style={{ color: 'var(--primary)', fontWeight: 600 }}
                >
                  {isSignUp ? 'Masuk di sini' : 'Daftar di sini'}
                </button>
              </div>

              <div className="text-center mt-2">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAuthModal(false);
                    setAuthError('');
                  }}
                >
                  Kembali
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
