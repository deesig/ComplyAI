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