'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [historyList, setHistoryList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHistoryMode, setIsHistoryMode] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      // Parse query ID manually to avoid Next.js Suspense warnings during static build
      const params = new URLSearchParams(window.location.search);
      const reportId = params.get('id');

      if (reportId) {
        // --- DETAIL MODE ---
        try {
          const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('id', reportId)
            .single();

          if (error) throw error;

          if (data) {
            // Map db schema to front-end result schema
            const mappedResult = {
              filler_words_count: data.filler_words_count,
              filler_words_details: data.filler_words_details || {},
              analysis: {
                overall_score: data.overall_score,
                status: data.status,
                categories: {
                  relevansi_konten: data.relevansi_konten,
                  kepercayaan_diri: data.kepercayaan_diri,
                  struktur_kalimat: data.struktur_kalimat
                },
                feedback: data.feedback
              }
            };
            setResult(mappedResult);
          } else {
            fallbackToSession();
          }
        } catch (err) {
          console.error("Error fetching report from Supabase:", err);
          fallbackToSession();
        } finally {
          setLoading(false);
        }
      } else {
        // --- HISTORY MODE ---
        setIsHistoryMode(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const { data, error } = await supabase
              .from('reports')
              .select('id, created_at, role, overall_score, status')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false });
            
            if (error) throw error;
            setHistoryList(data || []);
          } catch (err) {
            console.error("Error fetching history:", err);
            setHistoryList([]);
          }
        } else {
          // If not logged in and accessing /dashboard, redirect to home
          router.push('/');
        }
        setLoading(false);
      }
    };

    const fallbackToSession = () => {
      const sessionData = sessionStorage.getItem('analysisResult');
      if (sessionData) {
        setResult(JSON.parse(sessionData));
      } else {
        router.push('/');
      }
    };

    fetchReport();
  }, [router]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="brain-icon">📊</div>
        <h2 className="page-title">{isHistoryMode ? "Memuat Riwayat..." : "Memuat Hasil Rapor..."}</h2>
      </div>
    );
  }

  // --- RENDER HISTORY MODE ---
  if (isHistoryMode) {
    return (
      <div className="mt-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: 0 }}>Riwayat Evaluasi Simulasi</h1>
          <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => router.push('/')}>
            Kembali ke Beranda
          </button>
        </div>

        {historyList && historyList.length === 0 ? (
          <div className="detail-card text-center" style={{ padding: '4rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ color: 'var(--foreground)' }}>Belum ada riwayat wawancara</h3>
            <p className="text-muted mt-2">Anda belum pernah menyelesaikan simulasi wawancara apapun.</p>
            <button className="btn btn-primary mt-4" style={{ width: 'auto' }} onClick={() => router.push('/')}>
              Mulai Simulasi Baru
            </button>
          </div>
        ) : (
          <div className="grid-roles" style={{ gap: '1.5rem' }}>
            {historyList?.map((item) => (
              <div className="card role-card" key={item.id} style={{ padding: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--foreground)', fontWeight: '600' }}>{item.role}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
                      {new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="score-circle" style={{ width: '50px', height: '50px', fontSize: '1.1rem', margin: 0, boxShadow: 'none' }}>
                    {item.overall_score}
                  </div>
                </div>
                <div style={{ margin: '1rem 0' }}>
                  <span className="status-badge" style={{ display: 'inline-block', fontSize: '0.75rem', padding: '0.3rem 0.8rem', background: 'rgba(56, 189, 248, 0.1)' }}>
                    {item.status}
                  </span>
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', marginTop: 'auto', fontSize: '0.9rem', padding: '0.6rem' }}
                  onClick={() => window.location.href = `/dashboard?id=${item.id}`}
                >
                  Lihat Detail Rapor
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- RENDER DETAIL MODE ---
  if (!result) return <div className="loading-container">Hasil tidak ditemukan.</div>;

  const { analysis, filler_words_count, filler_words_details } = result;
  
  return (
    <div className="mt-2">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: 0 }}>Laporan Evaluasi Simulasi</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => window.location.href = '/dashboard'}>
            Lihat Riwayat
          </button>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => router.push('/')}>
            Beranda
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column - Overall Score */}
        <div className="score-card">
          <h3 style={{ color: '#94a3b8', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Skor Keseluruhan
          </h3>
          <div className="score-circle">
            {analysis.overall_score}
          </div>
          <div className="status-badge">
            👍 {analysis.status}
          </div>
          <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '0.95rem' }}>
            {analysis.overall_score >= 80 ? "Performa Anda luar biasa! Sangat siap untuk wawancara sebenarnya." :
             analysis.overall_score >= 70 ? "Jawaban teknis Anda sudah baik, namun cara penyampaian masih bisa ditingkatkan." :
             "Perbanyak latihan lagi, fokus pada struktur jawaban dan mengurangi jeda berpikir."}
          </p>
        </div>

        {/* Right Column - Details */}
        <div>
          <div className="detail-card">
            <h3 className="card-title mb-4">Analisis Per Kategori (AI Evaluator)</h3>
            
            <div className="progress-item">
              <div className="progress-header">
                <span>Relevansi Konten</span>
                <span>{analysis.categories.relevansi_konten}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${analysis.categories.relevansi_konten}%` }}></div>
              </div>
            </div>
            
            <div className="progress-item">
              <div className="progress-header">
                <span>Kepercayaan Diri</span>
                <span>{analysis.categories.kepercayaan_diri}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill yellow" style={{ width: `${analysis.categories.kepercayaan_diri}%` }}></div>
              </div>
            </div>
            
            <div className="progress-item">
              <div className="progress-header">
                <span>Struktur Kalimat</span>
                <span>{analysis.categories.struktur_kalimat}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${analysis.categories.struktur_kalimat}%` }}></div>
              </div>
            </div>
          </div>

          <div className="feedback-grid">
            <div className="detail-card" style={{ marginBottom: 0 }}>
              <h3 className="card-title mb-4">Deteksi Filler Words</h3>
              <div style={{ fontSize: '3rem', fontWeight: '700', color: 'var(--danger)', lineHeight: 1 }}>
                {filler_words_count} <span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: '400' }}>kali terdeteksi</span>
              </div>
              <p className="text-muted mt-4">
                Kata sering muncul: {Object.entries(filler_words_details).map(([word, count]) => `"${word}" (${count}x)`).join(', ') || "-"}
              </p>
            </div>
            
            <div className="detail-card" style={{ marginBottom: 0 }}>
              <h3 className="card-title mb-4" style={{ color: 'var(--primary)' }}>💡 Saran AI:</h3>
              <p style={{ color: 'var(--foreground)', lineHeight: '1.6' }}>
                {analysis.feedback}
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
