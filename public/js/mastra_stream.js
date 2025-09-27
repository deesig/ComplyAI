const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const transcriptEl = document.createElement('div');
transcriptEl.style = 'white-space:pre-wrap;padding:8px;border:1px solid #ddd;margin-top:8px;min-height:80px;background:#fff';
document.body.appendChild(transcriptEl);

let ws = null;
let mediaRecorder = null;

function log(msg) { logEl.textContent += msg + '\n'; logEl.scrollTop = logEl.scrollHeight; }

startBtn.addEventListener('click', async () => {
  log('Requesting microphone...');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    ws = new WebSocket('ws://localhost:4000');

    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      log('WS connected');
      statusEl.textContent = 'Streaming';
      startBtn.disabled = true;
      stopBtn.disabled = false;
      // start recording and send chunks as binary
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          // send raw blob bytes
          e.data.arrayBuffer().then(buf => ws.send(buf));
        }
      };
      mediaRecorder.start(250); // chunk every 250ms
    };

    ws.onmessage = (ev) => {
      try {
        const payload = typeof ev.data === 'string' ? JSON.parse(ev.data) : { type: 'binary', payload: ev.data };
        log('WS message: ' + JSON.stringify(payload).slice(0,200));
        if (payload?.type === 'gemini' && payload.payload) {
          // show gemini event data in transcript area
          if (typeof payload.payload === 'string') transcriptEl.textContent += payload.payload + '\n';
          else transcriptEl.textContent += JSON.stringify(payload.payload, null, 2) + '\n';
        }
      } catch {
        log('WS message (non-json)');
      }
    };
    ws.onclose = () => { log('WS closed'); statusEl.textContent = 'Idle'; };
    ws.onerror = (e) => { log('WS error'); console.error(e); };
  } catch (err) {
    log('Microphone error: ' + err.message);
  }
});

stopBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event: 'end' }));
    ws.close();
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusEl.textContent = 'Idle';
  log('Stopped');
});
