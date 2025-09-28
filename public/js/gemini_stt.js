const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const transcriptEl = document.getElementById('transcript');
const statusEl = document.getElementById('status');
const serverResult = document.getElementById('serverResult');
const aiLoadingEl = document.getElementById('aiLoading');
const aiHistoryEl = document.getElementById('aiHistory');

let mediaRecorder = null;
let chunks = [];
let recognition = null;
let finalSegments = [];
let recordingStartTime = null;
let segmentTimestamps = []; // Store timestamps for each segment

// Simple function to get AI response - just ask Gemini directly
async function getAiResponse(transcript) {
  try {
    console.log('[DEBUG] Getting AI response for:', transcript);
    
    // Simple, direct prompt for Gemini
    const prompt = `"${transcript}"

Is this statement true or false? Respond with only one emoji:
✅ if it's TRUE or you AGREE
❌ if it's FALSE or you DISAGREE  
❓ if you're UNSURE or it's subjective

Just the emoji.`;

    console.log('[DEBUG] Sending to server...');
    
    const response = await fetch('/api/speech/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        transcript: prompt,
        feedback: true,
        responseType: 'truth_evaluation'
      })
    });
    const data = await response.json();
    
    console.log('[DEBUG] Server response:', data);
    
    // If server provides a response, extract emoji
    if (data && data.feedback) {
      console.log('[DEBUG] Server feedback:', data.feedback);
      const emoji = extractEmoji(data.feedback);
      if (emoji) {
        console.log('[DEBUG] Extracted emoji:', emoji);
        return emoji;
      }
    }
    
    // If Gemini didn't work, just default to ❓
    console.log('[DEBUG] No valid response, defaulting to ❓');
    return '❓';
  } catch (error) {
    console.error('[DEBUG] AI response error:', error);
    return '❓';
  }
}

// Extract emoji from AI response text
function extractEmoji(text) {
  const emojiMatch = text.match(/[✅❌❓]/);
  return emojiMatch ? emojiMatch[0] : null;
}

// transcript: string
// opts.appendHistory: boolean (default true) - whether this function should append to aiHistory
async function handleProvidedTranscript(transcript, opts = { appendHistory: true }) {
  if (!transcript || !transcript.trim()) return;
  setAiLoading(true);
  try {
    // Get AI response for this transcript
    const aiResponse = await getAiResponse(transcript);
    
    // Post JSON with transcript to the same endpoint used for audio uploads (for cleaning)
    const resp = await fetch('/api/speech/recognize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript, feedback: true }) });
    const data = await resp.json();
    console.debug('[AI] sent transcript:', transcript);
    console.debug('[AI] response:', data);
    console.debug('[AI] emoji response:', aiResponse);
    
    // Don't overwrite the server final result during live transcript calls.
    // Append live AI comments (cleaned text) to history so they persist with timestamps.
    if (opts.appendHistory) {
      if (data && data.cleaned) {
        appendAiHistory({ text: data.cleaned, source: 'browser', feedback: `${aiResponse} I processed that` });
      } else if (data && data.transcript) {
        // Some server responses may include the normalized transcript under `transcript`.
        appendAiHistory({ text: data.transcript, source: 'browser', feedback: `${aiResponse} I processed that` });
      } else if (data && data.error) {
        appendAiHistory({ text: 'AI cleanup error: ' + (data.error || 'unknown'), source: 'browser', feedback: '❓' });
      } else {
        // Fallback: append the raw provided transcript so the user sees something live
        appendAiHistory({ text: transcript.trim(), source: 'browser', feedback: `${aiResponse} I processed that` });
      }
    }
    
    return { ...data, aiResponse };
  } catch (e) {
    console.error('handleProvidedTranscript failed', e);
    appendAiHistory({ text: 'AI request failed', source: 'browser', feedback: '❌' });
    return { error: String(e), aiResponse: '❌' };
  } finally {
    setAiLoading(false);
  }
}

// Promise-aware trailing debounce with cancel and flush
function debounce(fn, wait = 500) {
  let timer = null;
  let lastArgs = null;
  let resolvers = [];

  const debounced = function(...args) {
    lastArgs = args;
    return new Promise((resolve, reject) => {
      resolvers.push({ resolve, reject });
      clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = null;
        try {
          const res = await fn(...lastArgs);
          resolvers.forEach(r => r.resolve(res));
        } catch (err) {
          resolvers.forEach(r => r.reject(err));
        } finally {
          resolvers = [];
          lastArgs = null;
        }
      }, wait);
    });
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    resolvers.forEach(r => r.reject(new Error('debounced cancelled')));
    resolvers = [];
    lastArgs = null;
  };

  debounced.flush = async () => {
    if (!timer) return null;
    clearTimeout(timer);
    timer = null;
    try {
      const res = await fn(...lastArgs);
      resolvers.forEach(r => r.resolve(res));
      return res;
    } catch (err) {
      resolvers.forEach(r => r.reject(err));
      throw err;
    } finally {
      resolvers = [];
      lastArgs = null;
    }
  };

  return debounced;
}

const debouncedHandle = debounce(handleProvidedTranscript, 600);

function setAiLoading(on) {
  if (!aiLoadingEl) return;
  aiLoadingEl.style.display = on ? 'inline' : 'none';
}

// Convert milliseconds to relative timestamp format (00:00:00)
function msToTimestamp(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Enhanced helper to polish transcript text with real timestamps from segments
function polishText(s) {
    if (!s) return s;
    
    // Process input per-line to preserve intended breaks
    const lines = String(s).replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
    
    const processed = lines.map((line, index) => {
        // Collapse multiple spaces
        let t = line.replace(/\s+/g, ' ').trim();
        
        // Remove repeated adjacent words (e.g., "hello hello" -> "hello")
        try {
            t = t.replace(/\b(\w+)\s+\1\b/gi, '$1');
        } catch {}
        
        // Capitalize first character and ensure proper punctuation
        if (t.length > 0) {
            t = t.charAt(0).toUpperCase() + t.slice(1);
            
            // Add period if the sentence doesn't end with punctuation
            if (!/[.!?]$/.test(t)) {
                t = t + '.';
            }
        }
        
        // Use actual timestamp from segmentTimestamps if available, otherwise calculate relative time
        let timestamp = '00:00:00';
        if (segmentTimestamps[index]) {
            const elapsedMs = segmentTimestamps[index] - recordingStartTime;
            timestamp = msToTimestamp(elapsedMs);
        } else if (recordingStartTime) {
            // Fallback: estimate based on line position (2 seconds per line)
            const estimatedMs = index * 2000;
            timestamp = msToTimestamp(estimatedMs);
        }
        
        return `[${timestamp}] ${t}`;
    });
    
    // Join with newlines to preserve line breaks
    return processed.join('\n');
}

function appendAiHistory({ text, source, feedback }) {
  if (!aiHistoryEl) return;
  // Avoid duplicate consecutive entries
  const first = aiHistoryEl.firstElementChild;
  if (first && first.dataset && first.dataset.text === text) return;

  const li = document.createElement('li');
  li.style.padding = '8px';
  li.style.borderBottom = '1px solid rgba(0,0,0,0.06)';
  li.dataset.text = text;

  const time = new Date().toLocaleTimeString();
  const fb = feedback ? escapeHtml(feedback) : '❓ I processed that';
  li.innerHTML = `<div style="font-size:12px;color:#444;margin-bottom:6px"><strong style="font-size:13px">${escapeHtml(text)}</strong></div><div style="font-size:11px;color:#666;margin-bottom:6px">${time} • ${source}</div><div style="font-size:11px;color:#2b6cb0">${fb}</div>`;
  // Insert at top
  aiHistoryEl.insertBefore(li, aiHistoryEl.firstChild);
}

// Insert a temporary pending AI history item and return a function to replace it
function insertPendingAiItem({ text, source }) {
  if (!aiHistoryEl) return () => {};
  const placeholder = document.createElement('li');
  placeholder.style.padding = '8px';
  placeholder.style.borderBottom = '1px solid rgba(0,0,0,0.06)';
  placeholder.dataset.text = text;
  const time = new Date().toLocaleTimeString();
  placeholder.innerHTML = `<div style="font-size:12px;color:#444;margin-bottom:6px"><strong style="font-size:13px">${escapeHtml(text)}</strong></div><div style="font-size:11px;color:#666;margin-bottom:6px">${time} • ${source}</div><div style="font-size:11px;color:#999">processing…</div>`;
  aiHistoryEl.insertBefore(placeholder, aiHistoryEl.firstChild);
  return (finalText, feedback) => {
    try {
      placeholder.innerHTML = `<div style="font-size:12px;color:#444;margin-bottom:6px"><strong style="font-size:13px">${escapeHtml(finalText)}</strong></div><div style="font-size:11px;color:#666;margin-bottom:6px">${time} • ${source}</div><div style="font-size:11px;color:#2b6cb0">${escapeHtml(feedback || '❓ I processed that')}</div>`;
      placeholder.dataset.text = finalText;
    } catch { /* swallow */ }
  };
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Helper function to convert array buffer to base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

recordBtn.addEventListener('click', async () => {
  recordingStartTime = Date.now(); // Capture when recording starts in milliseconds
  segmentTimestamps = []; // Reset segment timestamps
  serverResult.textContent = '';
  transcriptEl.textContent = '';
  statusEl.textContent = 'Requesting microphone...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Setup MediaRecorder to capture audio for server-side STT
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    // reset finalSegments so a new recording does not append to previous
    finalSegments = [];
    // clear AI loading and server result UI
    setAiLoading(false);
    serverResult.textContent = '';
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.start();

    // Setup browser SpeechRecognition for live interim transcript (optional, Chrome)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event) => {
        const results = event.results;
        let interim = '';
        for (let i = event.resultIndex; i < results.length; i++) {
          const r = results[i][0].transcript;
          if (results[i].isFinal) {
            finalSegments.push(r);
            // Capture timestamp when this segment becomes final
            segmentTimestamps.push(Date.now());
            
            try {
              console.debug('[AI] queueing debounced send:', r);
              const replace = insertPendingAiItem({ text: r, source: 'browser' });
              debouncedHandle(r, { appendHistory: false }).then((resp) => {
                try {
                  const aiEmoji = resp && resp.aiResponse ? resp.aiResponse : '❓';
                  if (resp && resp.cleaned) replace(resp.cleaned, `${aiEmoji} I processed that`);
                  else if (resp && resp.transcript) replace(resp.transcript, `${aiEmoji} I processed that`);
                  else replace(r, `${aiEmoji} I processed that`);
                } catch (err) { void err; }
              }).catch(() => {});
            } catch (err) { console.error('debouncedHandle error', err); }
          } else {
            interim += r;
          }
        }
        transcriptEl.textContent = finalSegments.join('\n') + (interim ? '\n' + interim : '');
      };
      recognition.onerror = (e) => console.error('Recognition error', e);
      recognition.start();
    } else {
      transcriptEl.textContent = '(Live interim transcription not supported in this browser)';
    }

    recordBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = 'Recording...';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Microphone permission denied or error';
  }
});

stopBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Stopping...';

  if (recognition) {
    try { recognition.stop(); } catch { /* ignore */ }
    recognition = null;
  }

  if (mediaRecorder) {
    mediaRecorder.stop();

    // Wait for data to be available
    mediaRecorder.onstop = async () => {
      // Flush any pending debounced transcript. If nothing was flushed, send the finalText directly
      let flushedResult = null;
      try {
        flushedResult = await debouncedHandle.flush();
      } catch (err) {
        void err;
      }

      // finalText contains the current text of the live browser transcript
      const finalText = transcriptEl.textContent && transcriptEl.textContent.trim() ? transcriptEl.textContent.trim() : '';
      
      // If debounced flush didn't return a result and we have finalText, send it now so serverResult is populated
      if (!flushedResult && finalText) {
        try {
          const data = await handleProvidedTranscript(finalText);
          if (data && data.cleaned) {
            const polished = polishText(data.cleaned);
            serverResult.textContent = polished;
            console.log('Polished cleaned result (no audio):', polished);
          } else if (data && data.transcript) {
            const polished = polishText(data.transcript);
            serverResult.textContent = polished;
            console.log('Polished transcript result (no audio):', polished);
          }
        } catch (err) {
          console.error('Final text upload error', err);
        }
      }

      const blob = new Blob(chunks, { type: 'audio/webm' });
      
      // Since the server has issues with Google Speech API, fall back to using the browser transcript
      // and apply polishing to it for the final result
      if (finalText) {
        console.log('Server has Google Speech API issues, using browser transcript:', finalText);
        const polished = polishText(finalText);
        serverResult.textContent = polished;
        console.log('Polished browser transcript for final result:', polished);
        console.log('Segment timestamps used:', segmentTimestamps);
        appendAiHistory({ text: polished, source: 'browser-polished', feedback: '✅ Polished from browser transcript' });
        statusEl.textContent = 'Idle';
        setAiLoading(false);
        
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        mediaRecorder = null;
        chunks = [];
        return; // Skip the server upload since it's broken
      }
      
      // Upload blob to server endpoint for Speech-to-Text as base64 JSON
      // (This will likely fail due to Google Speech API issues, but keeping for completeness)
      try {
        statusEl.textContent = 'Uploading audio to server...';
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        setAiLoading(true);
        
        console.log('About to fetch audio to server...');
        const resp = await fetch('/api/speech/recognize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: base64, feedback: true }) });
        console.log('Audio upload response status:', resp.status);
        const json = await resp.json();
        console.log('Audio server JSON response:', json);

        // Check if server has Google Speech API errors
        if (json && json.google && json.google.error) {
          console.log('Google Speech API error detected, falling back to browser transcript');
          if (finalText) {
            const polished = polishText(finalText);
            serverResult.textContent = polished;
            console.log('Fallback: Polished browser transcript:', polished);
            appendAiHistory({ text: polished, source: 'browser-fallback', feedback: '❓ Used browser transcript due to server API issues' });
          } else {
            serverResult.textContent = 'Server API error - Google Speech-to-Text disabled. Please enable it or configure Gemini-only transcription.';
            appendAiHistory({ text: 'Server API configuration needed', source: 'error', feedback: '❌ Google Speech API is disabled' });
          }
        }
        // Handle normal successful server response
        else if (json && json.cleaned && json.cleaned.trim()) {
            console.log('Found json.cleaned for audio:', json.cleaned);
            const polished = polishText(json.cleaned);
            serverResult.textContent = polished;
            console.log('Polished cleaned result (audio):', polished);
            appendAiHistory({ text: polished, source: 'audio', feedback: '✅ I processed that' });
        } else if (json && json.transcript && json.transcript.trim()) {
            console.log('Found json.transcript for audio:', json.transcript);
            const polished = polishText(json.transcript);
            serverResult.textContent = polished;
            console.log('Polished transcript result (audio):', polished);
            appendAiHistory({ text: polished, source: 'audio', feedback: '✅ I processed that' });
        } else {
            console.log('No recognized fields for audio, showing raw JSON');
            serverResult.textContent = JSON.stringify(json, null, 2);
        }
        
        statusEl.textContent = 'Idle';
      } catch (e) {
        console.error('Upload error', e);
        statusEl.textContent = 'Upload error';
        
        // Fallback to browser transcript on upload error
        if (finalText) {
          const polished = polishText(finalText);
          serverResult.textContent = polished;
          console.log('Upload error fallback: Polished browser transcript:', polished);
          appendAiHistory({ text: polished, source: 'browser-error-fallback', feedback: '❌ Used browser transcript due to upload error' });
        } else {
          appendAiHistory({ text: 'Upload error', source: 'audio', feedback: '❌' });
        }
      } finally {
        setAiLoading(false);
      }

      recordBtn.disabled = false;
      stopBtn.disabled = true;
      mediaRecorder = null;
      chunks = [];
    };
  } else {
    statusEl.textContent = 'No recording active';
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  }
});
