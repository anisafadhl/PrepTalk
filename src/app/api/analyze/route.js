import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const apiKey = process.env.GEMINI_API_KEY;

    // FALLBACK IF NO API KEY
    if (!apiKey || apiKey === "your_api_key_here") {
      // Simulate network delay
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
          feedback: "Anda berhasil menjelaskan pengalaman dengan cukup jelas. Namun, cobalah menggunakan metode STAR (Situation, Task, Action, Result) agar jawaban lebih terstruktur. Kurangi jeda 'eee' agar terdengar lebih meyakinkan.",
          next_question: "Menarik, bisa Anda jelaskan lebih detail tantangan teknis terbesar saat membangun aplikasi e-commerce tersebut dan bagaimana Anda mengatasinya?"
        }
      });
    }

    // Initialize Gemini SDK
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Convert audio file to Base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    // Clean mime type (e.g. "audio/webm;codecs=opus" -> "audio/webm")
    const mimeType = audioFile.type.split(';')[0] || 'audio/webm';

    // 1. Get Transcript (STT) using Gemini 1.5 Flash
    const sttPrompt = "Transcribe the audio exactly as spoken in Indonesian. Do not translate. Include all filler words like 'eee', 'hmmm', 'uh'. Just output the transcript text.";
    const sttResponse = await model.generateContent([
      {
        inlineData: {
          data: base64Audio,
          mimeType: mimeType
        }
      },
      sttPrompt
    ]);

    const transcript = sttResponse.response.text() || '';
    
    // 2. Count Filler Words
    const { totalFillers, detectedFillers } = countFillerWords(transcript);

    // 3. Evaluate Transcript
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

    const analysisResponse = await model.generateContent(analysisPrompt);
    let analysisText = analysisResponse.response.text() || '{}';
    
    // Clean markdown if Gemini adds it
    if (analysisText.startsWith('```json')) {
      analysisText = analysisText.replace('```json\n', '').replace('```', '').trim();
    } else if (analysisText.startsWith('```')) {
      analysisText = analysisText.replace('```\n', '').replace('```', '').trim();
    }

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
