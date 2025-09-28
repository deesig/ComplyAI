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
  const [activeTab, setActiveTab] = useState<'chat' | 'audit'>('chat');
  const [activeRoleIdx, setActiveRoleIdx] = useState(0);
  const [roleChecklists, setRoleChecklists] = useState<{ [role: string]: { items: string[]; checked: boolean[]; notes: string[] } }>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Get roles from profile
  let roles: string[] = [];
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("profileTabs");
    if (saved) {
      try {
        const profile = JSON.parse(saved);
        roles = profile.roles || [];
      } catch {}
    }
  }

  // Example checklist items per role (static for now)
  const defaultChecklist = [
    "Reviewed compliance documentation",
    "Completed required training",
    "Submitted audit evidence",
    "Addressed previous findings"
  ];

  // Initialize checklist state for each role
  useEffect(() => {
    if (roles.length > 0 && Object.keys(roleChecklists).length === 0) {
      const initial: typeof roleChecklists = {};
      roles.forEach(role => {
        initial[role] = {
          items: defaultChecklist,
          checked: Array(defaultChecklist.length).fill(false),
          notes: Array(defaultChecklist.length).fill("")
        };
      });
      setRoleChecklists(initial);
    }
    // eslint-disable-next-line
  }, [roles]);

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
  console.log('Prompt Message:', promptMessage);

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
        {/* Sidebar with main tabs */}
        <div className="sidebar" style={{ minWidth: 220, maxWidth: 260, borderRight: '1.5px solid #ddd', background: '#f8fafc' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            <button
              style={{
                background: activeTab === 'chat' ? '#2563eb' : '#fff',
                color: activeTab === 'chat' ? '#fff' : '#2563eb',
                fontWeight: 700,
                border: 'none',
                borderRadius: 6,
                padding: '10px 0',
                cursor: 'pointer',
                fontSize: 16,
                marginBottom: 2,
                transition: 'background 0.18s, color 0.18s',
              }}
              onClick={() => setActiveTab('chat')}
            >
              General Chat
            </button>
            <button
              style={{
                background: activeTab === 'audit' ? '#2563eb' : '#fff',
                color: activeTab === 'audit' ? '#fff' : '#2563eb',
                fontWeight: 700,
                border: 'none',
                borderRadius: 6,
                padding: '10px 0',
                cursor: 'pointer',
                fontSize: 16,
                marginBottom: 2,
                transition: 'background 0.18s, color 0.18s',
              }}
              onClick={() => setActiveTab('audit')}
            >
              Mockup Audit
            </button>
          </div>
          {/* If audit tab, show vertical role tabs */}
          {activeTab === 'audit' && roles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {roles.map((role, idx) => (
                <button
                  key={role}
                  style={{
                    background: idx === activeRoleIdx ? '#e0e7ef' : '#fff',
                    color: '#222',
                    border: '1.5px solid #2563eb',
                    borderRadius: 5,
                    padding: '7px 8px',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    marginBottom: 2,
                  }}
                  onClick={() => setActiveRoleIdx(idx)}
                >
                  {role}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Main content area */}
        <div className="chat-container" style={{ background: '#f4f7fa', minHeight: 0, height: '100%' }}>
          {activeTab === 'chat' && (
            <>
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
            </>
          )}
          {activeTab === 'audit' && roles.length > 0 && (
            <div style={{ padding: 24, minHeight: 0, height: '100%', overflowY: 'auto' }}>
              <h2 style={{ marginBottom: 18, color: '#2563eb', fontSize: 22, fontWeight: 700 }}>Audit Checklist: {roles[activeRoleIdx]}</h2>
              {roleChecklists[roles[activeRoleIdx]] && (
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
                  {roleChecklists[roles[activeRoleIdx]].items.map((item, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                      <input
                        type="checkbox"
                        checked={roleChecklists[roles[activeRoleIdx]].checked[idx]}
                        onChange={e => {
                          setRoleChecklists(prev => {
                            const updated = { ...prev };
                            updated[roles[activeRoleIdx]].checked[idx] = e.target.checked;
                            return { ...updated };
                          });
                        }}
                        style={{ marginRight: 10 }}
                      />
                      <span style={{ flex: 1 }}>{item}</span>
                      <input
                        type="text"
                        placeholder="Paste transcript or notes..."
                        value={roleChecklists[roles[activeRoleIdx]].notes[idx]}
                        onChange={e => {
                          setRoleChecklists(prev => {
                            const updated = { ...prev };
                            updated[roles[activeRoleIdx]].notes[idx] = e.target.value;
                            return { ...updated };
                          });
                        }}
                        style={{ marginLeft: 10, flex: 2, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}
                      />
                      <button
                        style={{ marginLeft: 8, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => {
                          // Here you could call the AI to scan the text and check off if appropriate
                          // For now, just simulate checking off if text is present
                          setRoleChecklists(prev => {
                            const updated = { ...prev };
                            if (updated[roles[activeRoleIdx]].notes[idx].trim()) {
                              updated[roles[activeRoleIdx]].checked[idx] = true;
                            }
                            return { ...updated };
                          });
                        }}
                      >Scan</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
