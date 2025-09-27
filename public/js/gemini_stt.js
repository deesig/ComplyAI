const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const transcriptEl = document.getElementById('transcript');
const statusEl = document.getElementById('status');
const serverResult = document.getElementById('serverResult');

let mediaRecorder = null;
let chunks = [];
let recognition = null;
let finalTranscripts = [];

recordBtn.addEventListener('click', async () => {
  serverResult.textContent = '';
  transcriptEl.textContent = '';
  statusEl.textContent = 'Requesting microphone...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Setup MediaRecorder to capture audio for server-side STT
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.start();

    // Setup browser SpeechRecognition for live interim transcript (optional, Chrome)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.interimResults = true;
      recognition.continuous = true;

      // reset stored finals when starting a new recording
      finalTranscripts = [];

      recognition.onresult = (event) => {
        const results = event.results;
        let interim = '';
        for (let i = event.resultIndex; i < results.length; i++) {
          const r = results[i][0].transcript.trim();
          if (results[i].isFinal) {
            // only add if different from last to avoid duplicates
            if (finalTranscripts.length === 0 || finalTranscripts[finalTranscripts.length - 1] !== r) {
              finalTranscripts.push(r);
            }
          } else {
            interim += r;
          }
        }
        // Render final transcripts and current interim
        transcriptEl.textContent = finalTranscripts.join('\n') + (interim ? '\n' + interim : '');
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
      const blob = new Blob(chunks, { type: 'audio/webm' });
      // Convert to base64 and send JSON to server endpoint for Speech-to-Text
      try {
        statusEl.textContent = 'Uploading audio to server...';
        const arrayBuffer = await blob.arrayBuffer();
        // convert arrayBuffer to base64
        const base64 = arrayBufferToBase64(arrayBuffer);

        const resp = await fetch('/api/speech/recognize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64 }),
        });
        const json = await resp.json();
        serverResult.textContent = JSON.stringify(json, null, 2);
        statusEl.textContent = 'Idle';
      } catch (e) {
        console.error('Upload error', e);
        statusEl.textContent = 'Upload error';
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

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunk = 0x8000;
  for (let i = 0; i < len; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, slice);
  }
  return btoa(binary);
}
