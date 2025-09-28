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

// transcript: string
// opts.appendHistory: boolean (default true) - whether this function should append to aiHistory
async function handleProvidedTranscript(transcript, opts = { appendHistory: true }) {
  if (!transcript || !transcript.trim()) return;
  setAiLoading(true);
  try {
    // Post JSON with transcript to the same endpoint used for audio uploads
  const resp = await fetch('/api/speech/recognize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript, feedback: true }) });
    const data = await resp.json();
    console.debug('[AI] sent transcript:', transcript);
    console.debug('[AI] response:', data);
    // Don't overwrite the server final result during live transcript calls.
    // Append live AI comments (cleaned text) to history so they persist with timestamps.
    if (opts.appendHistory) {
      if (data && data.cleaned) {
        appendAiHistory({ text: data.cleaned, source: 'browser', feedback: data.feedback || 'I processed that' });
      } else if (data && data.transcript) {
        // Some server responses may include the normalized transcript under `transcript`.
        appendAiHistory({ text: data.transcript, source: 'browser', feedback: data.feedback || 'I processed that' });
      } else if (data && data.error) {
        appendAiHistory({ text: 'AI cleanup error: ' + (data.error || 'unknown'), source: 'browser' });
      } else {
        // Fallback: append the raw provided transcript so the user sees something live
        appendAiHistory({ text: transcript.trim(), source: 'browser', feedback: data && data.feedback ? data.feedback : 'I processed that' });
      }
    }
    
    return data;
  } catch (e) {
    console.error('handleProvidedTranscript failed', e);
    appendAiHistory({ text: 'AI request failed', source: 'browser' });
    return { error: String(e) };
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

// Small helper to polish plain transcript text for punctuation/capitalization
function polishText(s) {
    if (!s) return s;
    
    // Process input per-line to preserve intended breaks while trimming leading spaces
    const lines = String(s).replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
    
    const processed = lines.map(line => {
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
        
        return t;
    });
    
    return processed.join(' ');
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
  const fb = feedback ? escapeHtml(feedback) : 'I processed that';
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
      placeholder.innerHTML = `<div style="font-size:12px;color:#444;margin-bottom:6px"><strong style="font-size:13px">${escapeHtml(finalText)}</strong></div><div style="font-size:11px;color:#666;margin-bottom:6px">${time} • ${source}</div><div style="font-size:11px;color:#2b6cb0">${escapeHtml(feedback || 'I processed that')}</div>`;
      placeholder.dataset.text = finalText;
  } catch { /* swallow */ }
  };
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

recordBtn.addEventListener('click', async () => {
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
            try {
              console.debug('[AI] queueing debounced send:', r);
              const replace = insertPendingAiItem({ text: r, source: 'browser' });
              debouncedHandle(r, { appendHistory: false }).then((resp) => {
                try {
                  if (resp && resp.cleaned) replace(resp.cleaned, resp.feedback || 'I processed that');
                  else if (resp && resp.transcript) replace(resp.transcript, resp.feedback || 'I processed that');
                  else replace(r, 'I processed that');
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
      // Upload blob to server endpoint for Speech-to-Text as base64 JSON
      try {
        statusEl.textContent = 'Uploading audio to server...';
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        setAiLoading(true);
  const resp = await fetch('/api/speech/recognize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: base64, feedback: true }) });
        const json = await resp.json();
        if (json && json.cleaned) {
            const polished = polishText(json.cleaned);
            serverResult.textContent = polished;
            console.log('Polished cleaned result:', polished);
        } else if (json && json.transcript) {
            const polished = polishText(json.transcript);
            serverResult.textContent = polished;
            console.log('Polished transcript result:', polished);
        } else {
            serverResult.textContent = JSON.stringify(json, null, 2);
        }
        statusEl.textContent = 'Idle';

        // If the server returned a cleaned transcript from Gemini, append to history
        try {
          if (json && json.cleaned) {
            appendAiHistory({ text: json.cleaned, source: 'audio', feedback: 'I processed that' });
          } else if (json && json.transcript) {
            appendAiHistory({ text: json.transcript, source: 'audio', feedback: 'I processed that' });
          } else if (json && json.error) {
            appendAiHistory({ text: 'AI cleanup error: ' + (json.error || 'unknown'), source: 'audio' });
          }
        } catch (err) {
          console.error('Error updating aiComments from upload response', err);
        }
      } catch (e) {
        console.error('Upload error', e);
        statusEl.textContent = 'Upload error';
        appendAiHistory({ text: 'Upload error', source: 'audio' });
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
