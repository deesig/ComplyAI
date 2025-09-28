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

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I can help you assess your compliance with government standards. What would you like to check today?",
      sender: "ai",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
  if (!input.trim()) return;

  const userMsg: Message = { text: input, sender: "user" };
  setMessages((prev) => [...prev, userMsg]);
  setInput("");

  // Show loading GIF
  const loadingMsg: Message = { imageUrl: "/loading.gif", sender: "ai" };
  setMessages((prev) => [...prev, loadingMsg]);

  try {
    const response = await fetch('http://localhost:4000/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg.text }),
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
    <div className="body-components">
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
          />
          <button className="input-button" onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}
