import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const providedTranscript = body?.transcript;
    const audioBase64 = body?.audio;
    const wantFeedback = Boolean(body?.feedback);
    const responseType = body?.responseType;

    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'Server missing GOOGLE_GEMINI_API_KEY' }, { status: 500 });
    }

    if (providedTranscript && providedTranscript.trim()) {
      try {
        let cleaned = null;
        let feedback = null;

        if (responseType === 'truth_evaluation' || responseType === 'simple_agreement') {
          const statementMatch = providedTranscript.match(/"([^"]+)"/);
          const statement = statementMatch ? statementMatch[1] : providedTranscript;
          
          console.log('[DEBUG] Server evaluating statement:', statement);
          
          const evalPrompt = `Is this statement true or false? "${statement}"

Respond with ONLY one emoji:
✅ if TRUE or you AGREE
❌ if FALSE or you DISAGREE  
❓ if UNSURE or subjective

Just the emoji, nothing else.`;

          // Use the correct model name - gemini-2.0-flash-exp
          const gmUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`;
          
          console.log('[DEBUG] Sending to Gemini with model gemini-2.0-flash-exp');
          
          const gmResp = await fetch(gmUrl, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
              contents: [{
                parts: [{ text: evalPrompt }]
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 10
              }
            })
          });
          
          const gmData = await gmResp.json();
          console.log('[DEBUG] Gemini response status:', gmResp.status);
          console.log('[DEBUG] Gemini raw response:', JSON.stringify(gmData, null, 2));
          
          if (gmData && gmData.candidates && gmData.candidates[0] && gmData.candidates[0].content && gmData.candidates[0].content.parts && gmData.candidates[0].content.parts[0]) {
            feedback = gmData.candidates[0].content.parts[0].text.trim();
            console.log('[DEBUG] Raw feedback from Gemini:', feedback);
            
            const emojiMatch = feedback.match(/[✅❌❓]/);
            if (emojiMatch) {
              feedback = emojiMatch[0];
              console.log('[DEBUG] Extracted emoji:', feedback);
            } else {
              console.log('[DEBUG] No emoji found, defaulting to ❓');
              feedback = '❓';
            }
          } else {
            console.log('[DEBUG] Unexpected response format or error:', gmData);
            if (gmData && gmData.error) {
              console.log('[DEBUG] API Error:', gmData.error);
            }
            feedback = '❓';
          }
          
          console.log('[DEBUG] Final feedback being returned:', feedback);
          
          return NextResponse.json({ 
            ok: true, 
            transcript: statement, 
            cleaned: statement, 
            feedback 
          }, { status: 200 });
        } else {
          cleaned = providedTranscript.trim();
          if (wantFeedback) {
            feedback = 'I processed that';
          }
        }

        return NextResponse.json({ ok: true, transcript: providedTranscript.trim(), cleaned, feedback }, { status: 200 });
      } catch (e) {
        console.error('[DEBUG] Error in transcript processing:', e);
        return NextResponse.json({ error: 'Processing failed', details: String(e) }, { status: 500 });
      }
    }

    if (audioBase64) {
      return NextResponse.json({ 
        ok: true, 
        transcript: '', 
        cleaned: null, 
        feedback: null,
        google: { error: 'Google Speech API not configured' }
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'transcript or audio is required' }, { status: 400 });
  } catch (err) {
    console.error('[DEBUG] Route error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
