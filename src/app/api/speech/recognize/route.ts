import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
  const providedTranscript = body?.transcript;
  const audioBase64 = body?.audio;
  const wantFeedback = Boolean(body?.feedback);

    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Server missing GOOGLE_GEMINI_API_KEY' }, { status: 500 });
    }

    // If the client sent a transcript (browser SpeechRecognition), prefer to use Gemini to clean it.
    if (providedTranscript && providedTranscript.trim()) {
      try {
        // Stronger prompt: merge short broken lines, remove repeated words, normalize spacing,
        // ensure capitalization and punctuation. Return only the cleaned transcript (no commentary).
        const prompt = `Clean and normalize the following transcript for readability. Requirements:\n- Merge short broken lines into coherent sentences where appropriate.\n- Remove obvious repeated words or stutters (e.g., "hello hello" -> "hello").\n- Trim leading/trailing whitespace and collapse excessive internal spaces.\n- Capitalize sentence starts and add punctuation at sentence ends.\n- Preserve the original meaning; do not invent facts.\n\nReturn only the cleaned transcript as plain text (no lists, no metadata):\n\n${providedTranscript.trim()}`;
        const gmUrl = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${geminiKey}`;
        const gmResp = await fetch(gmUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: { text: prompt } }) });
        const gmData = await gmResp.json();
        let cleaned = null;
        let feedback = null;
        if (gmData && gmData.candidates && gmData.candidates[0] && gmData.candidates[0].content) {
          cleaned = gmData.candidates[0].content;
        } else if (gmData && gmData.output && Array.isArray(gmData.output)) {
          const outParts: string[] = [];
          for (const o of gmData.output) {
            try { if (o && o.content) outParts.push(o.content); } catch {}
          }
          cleaned = outParts.join('\n');
        }
        // Optionally generate a short feedback sentence about the cleaned transcript
        if (wantFeedback && cleaned) {
          try {
            const fbPrompt = `Provide a one-sentence, neutral feedback about the following cleaned transcript. Be concise and informative (for example, "This is a clear request" or "Consider adding more detail"). Return only the feedback sentence with no extra text:\n\n${cleaned}`;
            const fbResp = await fetch(`https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${geminiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: { text: fbPrompt } }) });
            const fbData = await fbResp.json();
            if (fbData && fbData.candidates && fbData.candidates[0] && fbData.candidates[0].content) {
              feedback = fbData.candidates[0].content;
            } else if (fbData && fbData.output && Array.isArray(fbData.output)) {
              const parts: string[] = [];
              for (const o of fbData.output) {
                try { if (o && o.content) parts.push(o.content); } catch {}
              }
              feedback = parts.join(' ');
            }
          } catch (e) {
            console.error('Gemini feedback error', e);
          }
        }

        return NextResponse.json({ ok: true, transcript: providedTranscript.trim(), cleaned, feedback }, { status: 200 });
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
  let feedback = null;
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

    // Optionally request a short feedback sentence from Gemini about the cleaned transcript
    try {
      if (wantFeedback && (cleaned || plainTranscript)) {
        const baseForFeedback = cleaned || plainTranscript;
        const fbPrompt = `Provide a one-sentence feedback about the following transcript. Keep it concise and neutral:\n\n${baseForFeedback}\n\nReturn only the feedback sentence.`;
        const fbUrl = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${process.env.GOOGLE_GEMINI_API_KEY}`;
        const fbResp = await fetch(fbUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: { text: fbPrompt } }) });
        const fbData = await fbResp.json();
        if (fbData && fbData.candidates && fbData.candidates[0] && fbData.candidates[0].content) {
          feedback = fbData.candidates[0].content;
        } else if (fbData && fbData.output && Array.isArray(fbData.output)) {
          const outParts: string[] = [];
          for (const o of fbData.output) {
            try { if (o && o.content) outParts.push(o.content); } catch {}
          }
          feedback = outParts.join(' ');
        }
      }
    } catch (e) {
      console.error('Gemini feedback error', e);
    }

    return NextResponse.json({ ok: true, google: data, transcript: plainTranscript, cleaned, feedback }, { status: googleResp.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
