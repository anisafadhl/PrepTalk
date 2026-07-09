'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      // Parse query ID manually to avoid Next.js Suspense warnings during static build
      const params = new URLSearchParams(window.location.search);
      const reportId = params.get('id');

      if (reportId) {
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
        fallbackToSession();
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
        <h2 className="page-title">Memuat Hasil Rapor...</h2>
      </div>
    );
  }

  if (!result) return <div className="loading-container">Hasil tidak ditemukan.</div>;

  const { analysis, filler_words_count, filler_words_details } = result;
  
  return (
    <div className="mt-2">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: 0 }}>Laporan Evaluasi Simulasi</h1>
        <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => router.push('/')}>
          Kembali ke Beranda
        </button>
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
              <h3 className="card-title mb-4" style={{ color: 'var(--primary)' }}>💡 Saran AI (Gemini):</h3>
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
