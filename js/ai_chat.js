function sendMessage() {
      const input = document.getElementById("userInput");
      const message = input.value.trim();
      if (message === "") return;

      const chatMessages = document.getElementById("chatMessages");

      // Add user message
      const userMsg = document.createElement("div");
      userMsg.className = "message user-message";
      userMsg.textContent = message;
      chatMessages.appendChild(userMsg);

      // Add dummy AI reply (replace this with real backend later)
      const aiReply = document.createElement("div");
      aiReply.className = "message ai-message";
      aiReply.textContent = "✅ Noted. Let me analyze that for you...";
      //aiReply.textContent = response.text
      //aiReply.textContent = "DS"
      setTimeout(() => chatMessages.appendChild(aiReply), 500);

      input.value = "";
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

  // --- Speech-to-text integration using browser SpeechRecognition ---
  let recognition = null;
  let recognizing = false;

  function startTranscription() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('SpeechRecognition not supported in this browser. Try Chrome.');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = async function(event) {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript.trim();
      console.log('Live transcription:', transcript);

      // When final result, send to server for Gemini processing
      if (last.isFinal) {
        appendUserMessage(transcript);
        try {
          const resp = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript }),
          });
          const json = await resp.json();

          let replyText = '';
          const geminiData = json.data ?? json;
          // Best-effort extraction from common Gemini/Gen-Lang shapes
          if (geminiData?.candidates?.[0]?.output) {
            replyText = geminiData.candidates[0].output;
          } else if (geminiData?.candidates?.[0]?.output_text) {
            replyText = geminiData.candidates[0].output_text;
          } else if (typeof geminiData === 'string') {
            replyText = geminiData;
          } else {
            replyText = JSON.stringify(geminiData);
          }

          appendAIMessage(replyText || 'No response from Gemini');
        } catch (e) {
          console.error('Error calling Gemini endpoint', e);
          appendAIMessage('Error contacting server for transcript');
        }
      }
    };

    recognition.onerror = function(e) {
      console.error('Speech recognition error', e);
    };

    recognition.onend = function() {
      recognizing = false;
      console.log('Speech recognition ended');
    };

    recognition.start();
    recognizing = true;
    console.log('🎤 Live transcription active...');
    const status = document.getElementById('micStatus');
    if (status) status.textContent = 'Microphone: on';
    const startBtn = document.getElementById('startMicBtn');
    const stopBtn = document.getElementById('stopMicBtn');
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
  }

  function stopTranscription() {
    if (recognition && recognizing) {
      recognition.stop();
      recognizing = false;
    }
    const status = document.getElementById('micStatus');
    if (status) status.textContent = 'Microphone: off';
    const startBtn = document.getElementById('startMicBtn');
    const stopBtn = document.getElementById('stopMicBtn');
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
  }

  // Helper functions to append messages
  function appendUserMessage(text) {
    const chatMessages = document.getElementById('chatMessages');
    const userMsg = document.createElement('div');
    userMsg.className = 'message user-message';
    userMsg.textContent = text;
    chatMessages.appendChild(userMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendAIMessage(text) {
    const chatMessages = document.getElementById('chatMessages');
    const aiReply = document.createElement('div');
    aiReply.className = 'message ai-message';
    aiReply.textContent = text;
    setTimeout(() => chatMessages.appendChild(aiReply), 500);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }