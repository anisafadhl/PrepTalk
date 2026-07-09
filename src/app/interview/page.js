'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { showToast } from '../../lib/toast';

export default function InterviewPage() {
  const router = useRouter();
  const [role, setRole] = useState('Software Engineer');
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  
  // Tracking Multi-Question State
  const [questionIndex, setQuestionIndex] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState("Bisa tolong ceritakan pengalaman Anda dalam menyelesaikan proyek yang paling menantang? Apa peran Anda di sana?");
  const [interviewHistory, setInterviewHistory] = useState([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        showToast("Silakan login terlebih dahulu!", "error");
        router.push('/');
      } else {
        setUserId(session.user.id);
        
        // Fetch profile to get username
        supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (data) {
              setUserName(data.username || data.full_name || session.user.email.split('@')[0]);
            } else {
              setUserName(session.user.email.split('@')[0]);
            }
          });
      }
    });

    const savedRole = sessionStorage.getItem('selectedRole');
    if (savedRole) {
      const roleMap = {
        'software_engineer': 'Software Engineer',
        'digital_marketing': 'Digital Marketing',
        'ui_ux_designer': 'UI/UX Designer'
      };
      setRole(roleMap[savedRole] || 'Software Engineer');
    }
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      showToast("Tidak dapat mengakses mikrofon. Pastikan izin telah diberikan.", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const calculateFinalAggregate = (history) => {
    const totalItems = history.length;
    let sumOverall = 0;
    let sumRelevansi = 0;
    let sumKepercayaan = 0;
    let sumStruktur = 0;
    let totalFillers = 0;
    const combinedFillerDetails = {};
    const combinedFeedback = [];

    history.forEach((res, idx) => {
      sumOverall += res.analysis.overall_score || 0;
      sumRelevansi += res.analysis.categories.relevansi_konten || 0;
      sumKepercayaan += res.analysis.categories.kepercayaan_diri || 0;
      sumStruktur += res.analysis.categories.struktur_kalimat || 0;
      totalFillers += res.filler_words_count || 0;
      
      // Combine feedbacks
      if (res.analysis.feedback) {
         combinedFeedback.push(`Q${idx + 1}: ${res.analysis.feedback}`);
      }

      // Aggregate filler details
      for (const [word, count] of Object.entries(res.filler_words_details || {})) {
         combinedFillerDetails[word] = (combinedFillerDetails[word] || 0) + count;
      }
    });

    const averageOverall = Math.round(sumOverall / totalItems);
    
    return {
      success: true,
      filler_words_count: totalFillers,
      filler_words_details: combinedFillerDetails,
      analysis: {
        overall_score: averageOverall,
        status: averageOverall >= 80 ? "Sangat Memuaskan" : averageOverall >= 70 ? "Cukup Memuaskan" : "Butuh Latihan",
        categories: {
          relevansi_konten: Math.round(sumRelevansi / totalItems),
          kepercayaan_diri: Math.round(sumKepercayaan / totalItems),
          struktur_kalimat: Math.round(sumStruktur / totalItems),
        },
        feedback: combinedFeedback.join(" | ")
      }
    };
  };

  const handleAudioUpload = async (audioBlob) => {
    setIsAnalyzing(true);
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('role', role);
    formData.append('question', currentQuestion);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('API Error');
      
      const data = await response.json();
      
      const newHistory = [...interviewHistory, data];
      setInterviewHistory(newHistory);

      if (questionIndex < 5) {
        setQuestionIndex(prev => prev + 1);
        const nextQ = data.analysis.next_question || "Bisa Anda jelaskan lebih detail tentang poin yang baru saja Anda sampaikan?";
        setCurrentQuestion(nextQ);
        setIsAnalyzing(false);
      } else {
        // Final question answered - calculate aggregate
        const finalResult = calculateFinalAggregate(newHistory);
        
        // Insert directly to Supabase table 'reports'
        const { data: dbData, error: dbError } = await supabase
          .from('reports')
          .insert({
            user_id: userId,
            role: role,
            overall_score: finalResult.analysis.overall_score,
            status: finalResult.analysis.status,
            relevansi_konten: finalResult.analysis.categories.relevansi_konten,
            kepercayaan_diri: finalResult.analysis.categories.kepercayaan_diri,
            struktur_kalimat: finalResult.analysis.categories.struktur_kalimat,
            filler_words_count: finalResult.filler_words_count,
            filler_words_details: finalResult.filler_words_details,
            feedback: finalResult.analysis.feedback
          })
          .select()
          .single();

        if (dbError) throw dbError;
        
        // Go to dashboard with database ID
        router.push(`/dashboard?id=${dbData.id}`);
      }

    } catch (error) {
      console.error("Error uploading audio:", error);
      setTimeout(async () => {
        showToast("Koneksi sibuk. Menggunakan mock data lokal.", "info");
        const mockData = {
          success: true,
          filler_words_count: 5,
          filler_words_details: {"eee": 3, "hmmm": 2},
          analysis: {
            overall_score: 78,
            status: "Cukup Memuaskan",
            categories: { relevansi_konten: 85, kepercayaan_diri: 65, struktur_kalimat: 75 },
            feedback: "Jawaban Anda secara teori sudah baik, kurangi penggunaan kata 'eee'.",
            next_question: "Bagaimana Anda membagi waktu dalam mengerjakan proyek?"
          }
        };

        const newHistory = [...interviewHistory, mockData];
        setInterviewHistory(newHistory);

        if (questionIndex < 5) {
          setQuestionIndex(prev => prev + 1);
          setCurrentQuestion(mockData.analysis.next_question);
          setIsAnalyzing(false);
        } else {
          const finalResult = calculateFinalAggregate(newHistory);
          
          try {
            const { data: dbData, error: dbError } = await supabase
              .from('reports')
              .insert({
                user_id: userId,
                role: role,
                overall_score: finalResult.analysis.overall_score,
                status: finalResult.analysis.status,
                relevansi_konten: finalResult.analysis.categories.relevansi_konten,
                kepercayaan_diri: finalResult.analysis.categories.kepercayaan_diri,
                struktur_kalimat: finalResult.analysis.categories.struktur_kalimat,
                filler_words_count: finalResult.filler_words_count,
                filler_words_details: finalResult.filler_words_details,
                feedback: finalResult.analysis.feedback
              })
              .select()
              .single();

            if (dbError) throw dbError;
            router.push(`/dashboard?id=${dbData.id}`);
          } catch (dbErr) {
            console.error("DB Save failed during mock fallback, using session storage instead:", dbErr);
            sessionStorage.setItem('analysisResult', JSON.stringify(finalResult));
            router.push('/dashboard');
          }
        }
      }, 2000);
    }
  };

  if (isAnalyzing) {
    const isFinal = questionIndex === 5;
    return (
      <div className="loading-container">
        <div className="brain-icon">🧠</div>
        <h2 className="page-title mb-4" style={{ textAlign: 'center' }}>
          {isFinal ? "Menyusun Laporan Akhir..." : "Menyiapkan Pertanyaan Selanjutnya..."}
        </h2>
        
        <ul className="checklist">
          <li className="active"><div className="icon">✓</div> Transkripsi Suara (Speech-to-Text)</li>
          <li className="active"><div className="icon">✓</div> Menghitung Filler Words</li>
          <li><div className="icon">○</div> Mengevaluasi Relevansi (LLM Gemini)</li>
          {!isFinal && <li><div className="icon">○</div> Menyusun Pertanyaan Lanjutan</li>}
        </ul>
        
        <p className="text-muted mt-4">Ini membutuhkan waktu sekitar 5-10 detik.</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div></div>
        <div style={{ background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0.5rem 1.5rem', borderRadius: '2rem', fontWeight: '600' }}>
          Pertanyaan {questionIndex} / 5
        </div>
      </div>

      <div className="interview-container">
        {/* AI Side */}
        <div className="ai-card">
          <div className="ai-header">
            <div className="ai-avatar">🤖</div>
            <div className="ai-text">
              {questionIndex === 1 && (
                 <p>Halo <strong>{userName || 'Kandidat'}</strong>! Selamat datang di sesi wawancara untuk posisi <strong>{role}</strong>. Mari kita mulai.</p>
              )}
              <p className="ai-question">{currentQuestion}</p>
            </div>
          </div>
        </div>

        {/* User Side */}
        <div className="user-card">
          <h2 className="card-title">Giliran Anda Menjawab</h2>
          <p className="text-muted" style={{ maxWidth: '300px', margin: '0 auto' }}>
            Tekan tombol mikrofon untuk mulai berbicara. AI akan mendengarkan jawaban Anda.
          </p>

          <button 
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            🎙
          </button>
          
          {isRecording && (
            <p className="text-danger font-medium mb-4" style={{ color: 'var(--danger)', fontWeight: '600' }}>
              Merekam Suara... ({formatTime(recordingTime)})
            </p>
          )}

          <div className="action-buttons mt-4" style={{ justifyContent: 'center' }}>
            <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => router.push('/')}>Batal</button>
            <button 
              className="btn btn-primary" 
              style={{ width: 'auto' }}
              onClick={stopRecording}
              disabled={!isRecording}
            >
              Selesai Menjawab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
