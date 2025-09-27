import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const providedTranscript = body?.transcript;
    const audioBase64 = body?.audio;

    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Server missing GOOGLE_GEMINI_API_KEY' }, { status: 500 });
    }

    // If the client sent a transcript (browser SpeechRecognition), prefer to use Gemini to clean it.
    if (providedTranscript && providedTranscript.trim()) {
      try {
        const prompt = `Please clean up, punctuate, and normalize the following transcript for readability:\n\n${providedTranscript.trim()}\n\nReturn only the cleaned transcript.`;
        const gmUrl = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${geminiKey}`;
        const gmResp = await fetch(gmUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: { text: prompt } }) });
        const gmData = await gmResp.json();
        let cleaned = null;
        if (gmData && gmData.candidates && gmData.candidates[0] && gmData.candidates[0].content) {
          cleaned = gmData.candidates[0].content;
        } else if (gmData && gmData.output && Array.isArray(gmData.output)) {
          const outParts: string[] = [];
          for (const o of gmData.output) {
            try { if (o && o.content) outParts.push(o.content); } catch {}
          }
          cleaned = outParts.join('\n');
        }
        return NextResponse.json({ ok: true, transcript: providedTranscript.trim(), cleaned }, { status: 200 });
      } catch (e) {
        console.error('Gemini cleanup error', e);
        return NextResponse.json({ error: 'Gemini cleanup failed', details: String(e) }, { status: 500 });
      }
    }

    // No transcript provided — fall back to audio path (Google STT)
    if (!audioBase64) {
      return NextResponse.json({ error: 'audio (base64) or transcript (string) is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    // Prepare request for Google Speech-to-Text (JSON API expects base64 audio content)
    const reqBody = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
      },
      audio: {
        content: audioBase64,
      },
    };

    const url = `https://speech.googleapis.com/v1p1beta1/speech:recognize?key=${apiKey}`;
    const googleResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });

    const data = await googleResp.json();

    // Extract a best-guess transcript string from Google's STT response
    let plainTranscript = '';
    try {
      if (data && Array.isArray(data.results)) {
        const parts: string[] = [];
        for (const r of data.results) {
          try {
            if (r && r.alternatives && r.alternatives[0] && r.alternatives[0].transcript) {
              parts.push(r.alternatives[0].transcript);
            }
          } catch {}
        }
        plainTranscript = parts.join(' ');
      }
    } catch {}

    // If we have a transcript, call Gemini text model to clean/punctuate it for better readability
    let cleaned = null;
    try {
      if (plainTranscript && plainTranscript.trim()) {
        const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
        if (geminiKey) {
          const gmReq = {
            prompt: `Please clean up, punctuate, and normalize the following transcript for readability:\n\n${plainTranscript}\n\nReturn only the cleaned transcript.`,
          };
          const gmUrl = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${geminiKey}`;
          const gmResp = await fetch(gmUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: { text: gmReq.prompt } }) });
          const gmData = await gmResp.json();
          // Try to extract text from gmData
          if (gmData && gmData.candidates && gmData.candidates[0] && gmData.candidates[0].content) {
            cleaned = gmData.candidates[0].content;
          } else if (gmData && gmData.output && Array.isArray(gmData.output)) {
            // alternate shape
            const outParts: string[] = [];
            for (const o of gmData.output) {
              try { if (o && o.content) outParts.push(o.content); } catch {}
            }
            cleaned = outParts.join('\n');
          } else {
            cleaned = null;
          }
        }
      }
    } catch (e) {
      console.error('Gemini cleanup error', e);
    }

    return NextResponse.json({ ok: true, google: data, transcript: plainTranscript, cleaned }, { status: googleResp.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
