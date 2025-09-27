import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    // Read the request body as a stream and forward to Google STT if possible
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing GOOGLE_GEMINI_API_KEY' }, { status: 500 });
    }

    // For edge runtime, we can forward the multipart body directly to Google's endpoint
    // NOTE: Adjust endpoint and request shape depending on the Google Speech API you use.
    const googleResp = await fetch('https://speech.googleapis.com/v1p1beta1/speech:recognize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // Let fetch set the content-type boundary by forwarding the original content-type
        'Content-Type': contentType,
      },
      body: await request.arrayBuffer(),
    });

    const data = await googleResp.text();
    // Return the raw text response (could be JSON)
    let parsed;
    try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }
    return NextResponse.json({ ok: true, data: parsed }, { status: googleResp.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
