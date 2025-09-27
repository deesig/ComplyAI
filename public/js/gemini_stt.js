const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const transcriptEl = document.getElementById('transcript');
const statusEl = document.getElementById('status');
const serverResult = document.getElementById('serverResult');

let mediaRecorder = null;
let chunks = [];
let recognition = null;

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

      recognition.onresult = (event) => {
        const results = event.results;
        let interim = '';
        for (let i = event.resultIndex; i < results.length; i++) {
          const r = results[i][0].transcript;
          if (results[i].isFinal) {
            transcriptEl.textContent += r + '\n';
          } else {
            interim += r;
          }
        }
        // Show interim appended to existing
        transcriptEl.textContent = transcriptEl.textContent.split('\n').filter(Boolean).join('\n') + (interim ? '\n' + interim : '');
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
      // Upload blob to server endpoint for Speech-to-Text
      try {
        statusEl.textContent = 'Uploading audio to server...';
        const fd = new FormData();
        fd.append('file', blob, 'recording.webm');

        const resp = await fetch('/api/speech/recognize', { method: 'POST', body: fd });
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
