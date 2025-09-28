"use client";
import React, { useState, useRef, useEffect } from "react";
import "./css/ai_chat.css";
import "./css/global.css";
import Link from "./Link";

type Message = {
  text?: string;
  imageUrl?: string;
  sender: "user" | "ai";
};

var promptContext = 
`
You are ComplyAI, an AI assistant that helps users assess their compliance with government standards and regulations. 
Provide clear, concise, and accurate information to help users understand their compliance status and what steps they may need to take to improve it. 
Always be professional and courteous in your responses.
`;

var promptExamples = 
`

`;


export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I can help you assess your compliance with government standards. What would you like to check today?",
      sender: "ai",
    },
  ]);
  const [input, setInput] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Check profile fields on mount
  useEffect(() => {
    // Scroll to bottom on new message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("profileTabs");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const bp = parsed.businessProfile || {};
          // Check if any required field is missing or empty
          if (!bp.industry || !bp.size || !bp.location || !bp.frameworks) {
            setShowProfileModal(true);
          }
        } catch {
          setShowProfileModal(true);
        }
      } else {
        setShowProfileModal(true);
      }
    }
  }, []);

  async function sendMessage() {
  if (!input.trim()) return;

  const userMsg: Message = { text: input, sender: "user" };
  setMessages((prev) => [...prev, userMsg]);
  setInput("");

  // Show loading GIF
  const loadingMsg: Message = { imageUrl: "/loading.gif", sender: "ai" };
  setMessages((prev) => [...prev, loadingMsg]);

  //Final prompt to send to API including context and examples
  var promptMessage = promptContext + "\n\nUser: " + userMsg.text + "\nExamples:" + promptExamples;

  try {
    const response = await fetch('http://localhost:4000/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: promptMessage }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('API error:', response.statusText, errorData);
      // Remove loading message if error
      setMessages(prev => prev.filter(msg => msg !== loadingMsg));
      return;
    }

    const data = await response.json();

    // Replace loading message with AI response
    setMessages(prev =>
      prev.map(msg =>
        msg === loadingMsg ? { text: data.output, sender: "ai" } : msg
      )
    );
  } catch (error) {
    console.error("Fetch error:", error);
    // Remove loading message if error
    setMessages(prev => prev.filter(msg => msg !== loadingMsg));
  }
}

async function ai_test() {
  const response = await fetch('http://localhost:4000/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: "In a sentence, describe AI." }), // or whatever input you want
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error('API error:', response.statusText, errorData);
    return;
  }

  const data = await response.json();
  console.log('AI output:', data.output);
}


  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") sendMessage();
  }

  return (
    <>
      {showProfileModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 2px 16px #0003', minWidth: 320, maxWidth: 400, textAlign: 'center' }}>
            <h3 style={{ marginBottom: 16 }}>Complete Your Profile</h3>
            <p style={{ marginBottom: 24 }}>Please fill out your business profile before using the AI chat.</p>
            <Link href="/profile">
              <button style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
                Go to Profile
              </button>
            </Link>
          </div>
        </div>
      )}
      <div className="body-components" style={showProfileModal ? { filter: 'blur(2px)', pointerEvents: 'none', userSelect: 'none' } : {}}>
        <div className="sidebar">
          <h2>History</h2>
          <div className="history-item">Compliance Check #1</div>
          <div className="history-item">Data Privacy Audit</div>
          <div className="history-item">Accessibility Review</div>
          {/* You can dynamically add more items here */}
        </div>
        <div className="chat-container">
          <div className="chat-messages" id="chatMessages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message-wrapper ${msg.sender === "user" ? "user-wrapper" : "ai-wrapper"}`}
              >
                {msg.imageUrl ? (<div className="ai-message">
        <img src={msg.imageUrl} alt="loading" className="loading-gif" /></div>
      ) : (
        <div className={`message ${msg.sender === "user" ? "user-message" : "ai-message"}`}>
          {msg.text}
        </div>)}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              id="userInput"
              placeholder="Type your question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              autoComplete="off"
              disabled={showProfileModal}
            />
            <button className="input-button" onClick={sendMessage} disabled={showProfileModal}>Send</button>
          </div>
        </div>
      </div>
    </>
  );
}
