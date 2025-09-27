import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const audioBase64 = body?.audio;
    if (!audioBase64) {
      return NextResponse.json({ error: 'audio (base64) is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing GOOGLE_GEMINI_API_KEY' }, { status: 500 });
    }

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
    return NextResponse.json({ ok: true, data }, { status: googleResp.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
