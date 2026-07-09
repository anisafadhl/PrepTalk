import { NextResponse } from 'next/server';

export const maxDuration = 60;

function countFillerWords(text) {
  const fillers = ["eee", "hmmm", "em", "eh", "uh", "um", "kayak", "apa namanya", "anu"];
  const textLower = text.toLowerCase();
  
  // Clean punctuation
  const cleanText = textLower.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
  const words = cleanText.split(/\s+/);
  
  const detectedFillers = {};
  let totalFillers = 0;
  
  for (const word of words) {
    if (!word) continue;
    for (const filler of fillers) {
      if (word === filler || (filler === "hmmm" && word.startsWith("hmm")) || (filler === "eee" && word.startsWith("ee"))) {
        detectedFillers[filler] = (detectedFillers[filler] || 0) + 1;
        totalFillers += 1;
        break;
      }
    }
  }
  
  return { totalFillers, detectedFillers };
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const role = formData.get('role') || 'Software Engineer';
    const question = formData.get('question') || '';

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    // FALLBACK IF NO API KEY
    if (!apiKey || apiKey === "your_api_key_here") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const transcript = "Halo, nama saya Budi. Eee pengalaman saya di software engineer adalah eee saya pernah membuat aplikasi e-commerce. Hmmm, disana saya menggunakan React dan Node js.";
      const { totalFillers, detectedFillers } = countFillerWords(transcript);

      return NextResponse.json({
        success: true,
        transcript: transcript,
        filler_words_count: totalFillers,
        filler_words_details: detectedFillers,
        analysis: {
          overall_score: 75,
          status: "Cukup Memuaskan",
          categories: {
            relevansi_konten: 80,
            kepercayaan_diri: 65,
            struktur_kalimat: 70
          },
          feedback: "Anda berhasil menjelaskan pengalaman dengan cukup jelas. Namun, cobalah menggunakan metode STAR agar jawaban lebih terstruktur. Kurangi jeda 'eee' agar terdengar lebih meyakinkan.",
          next_question: "Bagaimana Anda membagi waktu dalam mengerjakan proyek?"
        }
      });
    }

    // 1. Get Transcript (STT) using Groq Whisper API
    const whisperFormData = new FormData();
    // Convert audio file to a blob so Whisper can parse it
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([arrayBuffer], { type: audioFile.type || 'audio/webm' });
    whisperFormData.append('file', audioBlob, 'recording.webm');
    whisperFormData.append('model', 'whisper-large-v3-turbo');
    whisperFormData.append('prompt', "Transkripsikan audio persis seperti yang diucapkan dalam bahasa Indonesia. Jangan terjemahkan. Sertakan semua kata pengisi (filler words) seperti 'eee', 'hmmm', 'em', 'eh', 'uh', 'um', 'kayak', 'apa namanya', 'anu'.");
    whisperFormData.append('response_format', 'json');

    const whisperResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: whisperFormData
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      throw new Error(`Groq Whisper Error: ${whisperResponse.status} - ${errorText}`);
    }

    const whisperResult = await whisperResponse.json();
    const transcript = whisperResult.text || '';
    
    // 2. Count Filler Words
    const { totalFillers, detectedFillers } = countFillerWords(transcript);

    // 3. Evaluate Transcript using Groq Chat Completion (Llama 3.3 70B)
    const analysisPrompt = `
      Bertindaklah sebagai HRD profesional. Analisis jawaban berikut untuk posisi ${role}.
      Pertanyaan HRD: "${question}"
      Jawaban Kandidat: "${transcript}"
      Jumlah filler words: ${totalFillers}
      
      Berikan evaluasi dalam format JSON (tanpa markdown block) dengan struktur persis seperti berikut:
      {
          "overall_score": <angka 0-100>,
          "status": "<Sangat Memuaskan | Memuaskan | Cukup Memuaskan | Butuh Latihan>",
          "categories": {
              "relevansi_konten": <angka 0-100>,
              "kepercayaan_diri": <angka 0-100>,
              "struktur_kalimat": <angka 0-100>
          },
          "feedback": "<Saran perbaikan singkat maksimal 3 kalimat>",
          "next_question": "<Satu pertanyaan lanjutan berdasarkan jawaban kandidat>"
      }
    `;

    const chatResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      throw new Error(`Groq Chat Error: ${chatResponse.status} - ${errorText}`);
    }

    const chatResult = await chatResponse.json();
    let analysisText = chatResult.choices[0]?.message?.content || '{}';
    const analysisData = JSON.parse(analysisText);

    return NextResponse.json({
      success: true,
      transcript,
      filler_words_count: totalFillers,
      filler_words_details: detectedFillers,
      analysis: analysisData
    });

  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
