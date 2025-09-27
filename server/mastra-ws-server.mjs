#!/usr/bin/env node
import dotenv from 'dotenv';
// Load Next.js style local env if present, then fallback to .env
dotenv.config({ path: '.env.local' });
dotenv.config();
import { WebSocketServer } from 'ws';
import { PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';
import { GeminiLiveVoice } from '@mastra/voice-google-gemini-live';

const PORT = process.env.MASTRA_WS_PORT || 4000;

async function createVoiceConnection() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_API_KEY or GOOGLE_GEMINI_API_KEY in env');

  console.log('Creating GeminiLiveVoice connection (api key present)');
  const voice = new GeminiLiveVoice({ apiKey, model: 'gemini-2.0-flash-exp' });
  await voice.connect();
  console.log('GeminiLiveVoice connected');
  return voice;
}

const wss = new WebSocketServer({ port: PORT });

console.log(`Mastra WS server listening on ws://localhost:${PORT}`);

wss.on('connection', async function connection(ws) {
  console.log('Client connected');

  // Each connection gets its own passthrough stream to Gemini
  const passthrough = new PassThrough();
  let voice = null;
  // Diagnostic: write incoming binary chunks to a tmp webm file so you can inspect it
  try { fs.mkdirSync(path.resolve('./tmp'), { recursive: true }); } catch {}
  const outPath = path.resolve(`./tmp/recording-${Date.now()}.webm`);
  const outStream = fs.createWriteStream(outPath);
  let totalBytes = 0;

  try {
    voice = await createVoiceConnection();
    // Send the passthrough audio stream to Gemini (Mastra client will handle streaming to model)
    voice.send(passthrough).catch((err) => console.error('voice.send error', err));
    // Best-effort: forward events/responses from the Mastra voice client back to the WS client
    const sendToWs = (obj) => {
      try {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'gemini', payload: obj }));
      } catch (err) {
        console.error('Failed to send to ws', err);
      }
    };

    // Register common event names used by streaming voice clients. If the library emits different
    // event names, inspect its API and add them here. We try many possibilities to be resilient.
    const eventNames = ['message', 'response', 'data', 'transcript', 'partial_transcript', 'final_transcript', 'output'];
    if (typeof voice.on === 'function') {
      for (const ev of eventNames) {
        try {
          voice.on(ev, (msg) => {
            console.log('Mastra event', ev, msg && (typeof msg === 'object' ? JSON.stringify(msg).slice(0,200) : msg));
            sendToWs({ event: ev, data: msg });
          });
        } catch {
          // ignore attach errors
        }
      }
    }
  } catch (err) {
    console.error('Failed to create Gemini voice connection:', err);
    try { ws.close(1011, 'server error'); } catch {}
    return;
  }

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });

  ws.on('close', (code, reason) => {
    console.log('WebSocket closed by client/server; code=', code, 'reason=', reason && reason.toString ? reason.toString() : reason);
  });

  ws.on('message', (message) => {
    // Expect binary messages containing raw audio chunks (webm/opus blobs)
    if (typeof message === 'string') {
      // Control messages can be JSON strings
      try {
        const obj = JSON.parse(message);
        if (obj?.event === 'end') {
          passthrough.end();
        }
      } catch {
        // ignore
      }
      return;
    }

    // message is Buffer (binary). Write to passthrough so Mastra receives audio stream
    try {
      passthrough.write(message);
    } catch (err) {
      console.error('passthrough.write error', err);
    }
    // Also write to diagnostic file
    try {
      const buf = Buffer.from(message);
      totalBytes += buf.length;
      outStream.write(buf);
    } catch (err) {
      console.error('outStream.write error', err);
    }
  });

  ws.on('close', async () => {
    console.log('Client disconnected — closing passthrough and voice');
    try { passthrough.end(); } catch {}
    try { if (voice) await voice.close?.(); } catch { /* ignore */ }
    try {
      outStream.end(() => {
        console.log('Wrote diagnostic audio to', outPath, 'bytes=', totalBytes);
      });
    } catch (err) {
      console.error('Error closing outStream', err);
    }
  });
});
