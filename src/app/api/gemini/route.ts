import { NextResponse } from 'next/server';

type RequestBody = {
  transcript?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const transcript = body.transcript ?? '';

    if (!transcript) {
      return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server misconfiguration: missing API key' }, { status: 500 });
    }

    // Example call to Google Generative Language API - adjust endpoint and body as needed for your Gemini setup
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: {
          text: `User spoken transcript: ${transcript}\n\nRespond concisely:`,
        },
        temperature: 0.2,
        candidate_count: 1,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: true, data }, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
