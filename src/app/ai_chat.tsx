"use client";
import React, { useState, useRef, useEffect } from "react";

import "./css/ai_chat.css";
import "./css/global.css";
import Link from "./Link";
// @ts-ignore


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
  // Per-role per-item emoji placeholders returned by Gemini (only emoji, no text)
  const [rolePlaceholders, setRolePlaceholders] = useState<{ [role: string]: string[] }>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Live transcription state (for Audit tab)
  const [recording, setRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalSegments, setFinalSegments] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  // Handle file upload in General Chat (text files only)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('text/')) {
      alert('Only text files are supported.');
      return;
    }
    const reader = new FileReader();
    const text = await new Promise<string>((resolve) => {
      reader.onload = (event) => resolve(event.target?.result as string || "");
      reader.readAsText(file);
    });
    if (!text) return;
    const userMsg: Message = { text: `[Document Upload: ${file.name}]\n${text.substring(0, 4000)}`, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const loadingMsg: Message = { imageUrl: "/loading.gif", sender: "ai" };
    setMessages((prev) => [...prev, loadingMsg]);
    var promptMessage = promptContext + `\n\nUser uploaded a document (${file.name}):\n${text.substring(0, 4000)}\n\nUser: Please analyze or summarize the above document.\nExamples:` + promptExamples;
    try {
      const response = await fetch('http://localhost:4000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: promptMessage }),
      });
      if (!response.ok) {
        setMessages(prev => prev.filter(msg => msg !== loadingMsg));
        return;
      }
      const data = await response.json();
      setMessages(prev => prev.map(msg => msg === loadingMsg ? { text: data.output, sender: "ai" } : msg));
    } catch {
      setMessages(prev => prev.filter(msg => msg !== loadingMsg));
    }
  }

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


  // Initialize checklist state for each role using AI-generated checklists
  useEffect(() => {
    async function fetchChecklists() {
      if (roles.length > 0 && Object.keys(roleChecklists).length === 0) {
        const initial: typeof roleChecklists = {};
        for (const role of roles) {
          // Query the AI for a checklist for this role
          const promptMessage =
            promptContext +
            `\n\nFor the role of '${role}', can you give me a checklist of a few items that this role must have in order to be security compliant? Please return only a 5 items in a plain list, nothing else. Example output: "Implement and enforce organizational security policies and procedures. Manage and regularly review user access controls and permissions. Oversee vulnerability management, patching, and system hardening. Maintain and regularly test an incident response and disaster recovery plan. Ensure data protection through encryption, backups, and data loss prevention measures."`;
          try {
            const response = await fetch('http://localhost:4000/api/ask', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: promptMessage }),
            });
            let checklistItems: string[] = [];
            if (response.ok) {
              const data = await response.json();
              // Try to parse the response as a list (split by newlines, dashes, or numbers)
              const raw = data.output || "";
              console.log(`Checklist for role ${role}:`, raw); 
              checklistItems = raw
                .split(/\n|\r/)
                .map((line: string) => line.replace(/^[-*\d.\s]+/, "").trim())
                .filter((line: string) => line.length > 0);
              // Fallback to default if parsing fails
              if (checklistItems.length === 0) {
                checklistItems = [
                  "Reviewed compliance documentation",
                  "Completed required training",
                  "Submitted audit evidence",
                  "Addressed previous findings"
                ];
              }
            } else {
              checklistItems = [
                "Reviewed compliance documentation",
                "Completed required training",
                "Submitted audit evidence",
                "Addressed previous findings"
              ];
            }
            initial[role] = {
              items: checklistItems,
              checked: Array(checklistItems.length).fill(false),
              notes: Array(checklistItems.length).fill("")
            };
            // initialize placeholders for this role
            (function() {
              setRolePlaceholders(prev => ({ ...prev, [role]: Array(checklistItems.length).fill('') }));
            })();
          } catch {
            // On error, fallback to default
            initial[role] = {
              items: [
                "Reviewed compliance documentation",
                "Completed required training",
                "Submitted audit evidence",
                "Addressed previous findings"
              ],
              checked: Array(4).fill(false),
              notes: Array(4).fill("")
            };
          }
        }
        setRoleChecklists(initial);
      }
    }
    fetchChecklists();
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

    // Get user profile info from localStorage
    let userProfileString = "";
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("profileTabs");
      if (saved) {
        try {
          const profile = JSON.parse(saved);
          const bp = profile.businessProfile || {};
          const roles = profile.roles || [];
          const additionalInfo = profile.additionalInfo || "";
          userProfileString = `\nUser Profile:\nIndustry/Sector: ${bp.industry || ""}\nBusiness Size: ${bp.size || ""}\nLocation: ${bp.location || ""}\nFrameworks: ${bp.frameworks || ""}\nRoles: ${roles.join(", ")}\nAdditional Info: ${additionalInfo}`;
        } catch {}
      }
    }


    // Include recent chat history (last 6 messages, excluding loading GIFs)
    const historyMessages = messages
      .filter(m => m.text) // Only text messages
      .slice(-6)
      .map(m => `${m.sender === "user" ? "User" : "AI"}: ${m.text}`)
      .join("\n");

    // Final prompt to send to API including context, user profile, chat history, and examples
    var promptMessage =
      promptContext +
      userProfileString +
      (historyMessages ? `\n\nRecent Conversation:\n${historyMessages}` : "") +
      `\n\nUser: ${userMsg.text}\nExamples:` +
      promptExamples;
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

  // Validate checklist items against a transcript using the server's Gemini route
  async function validateChecklist(fullTranscript: string, roleKey: string) {
    try {
      const checklistObj = roleChecklists[roleKey];
      if (!checklistObj) return;
      const items = checklistObj.items || [];
      if (items.length === 0) return;

      const body = { transcript: fullTranscript, checklistItems: items, responseType: 'validate_checklist' } as any;
      // Provide a prompt override so the server can (optionally) pass this directly to Gemini.
      // This prompt asks the model to be optimistic and return an aligned emoji per checklist item.
      body.promptOverride = `You are an assistant that compares a meeting transcript to a checklist. Be optimistic: if the transcript mentions or implies a checklist item even briefly, mark it as satisfied.\n\nTranscript:\n"""\n${fullTranscript}\n"""\n\nChecklist items (in the same order):\n${items.map((it, i) => `${i + 1}. ${it}`).join('\n')}\n\nOutput requirements (IMPORTANT):\n- Respond with ONE valid JSON object and nothing else. No extra commentary, no code fences.\n- The JSON must have exactly this shape:\n  { "results": [ { "emoji": "✅|❌|❓" } ], "cleaned": "<cleaned transcript as plain text>" }\n- The results array MUST be the same length and order as the checklist items. Each element corresponds to the checklist item at the same index.\n- Use only these emojis: ✅ for satisfied (optimistic), ❌ for explicitly not satisfied, ❓ for unsure.\n- Be concise in the cleaned transcript (one paragraph), and prefer conservative paraphrasing.\n\nRules for marking ✅ (optimistic behavior):\n- If the transcript contains a direct mention (exact phrase or close paraphrase) of the checklist item, mark ✅.\n- If the transcript contains partial evidence (e.g., mentions related subcomponents like "routers", "firewalls" when the item mentions "network devices"), mark ✅.\n- If the transcript is ambiguous or off-topic, mark ❓. Only mark ❌ if the transcript clearly and explicitly contradicts or shows absence of the requirement.\n\nReturn only the JSON described above.`;
      const resp = await fetch('/api/speech/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(err => {
        console.error('Checklist validate fetch error', err);
        return null as unknown as Response;
      });

      if (!resp) return;

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        console.error('Checklist validation failed', resp.status, errText);
        return;
      }

      const data = await resp.json().catch(() => null);
      if (!data) {
        console.warn('No data returned from validation endpoint');
        return;
      }

      // Expect server to return results array aligned to checklistItems (same order)
      const serverResults = Array.isArray(data.results) ? data.results : null;

      setRoleChecklists(prev => {
        const updated = { ...prev };
        const target = updated[roleKey];
        if (!target) return prev;
        const now = new Date().toLocaleTimeString();

        if (serverResults && Array.isArray(target) ? serverResults.length === target.length : serverResults.length === (target.items ? target.items.length : 0)) {
          // Apply by index: set checkbox and set only an emoji into the placeholder; clear notes
          for (let i = 0; i < serverResults.length; i++) {
            const r = serverResults[i] || {};
            const emoji = String(r.emoji || '❓').trim();
            // set checked based on emoji
            target.checked[i] = emoji === '✅';
            // clear text notes (user can add their own) and set placeholder emoji only via rolePlaceholders
            target.notes[i] = '';
          }
        } else {
          // No aligned server results: don't change checkboxes, but optionally mark explicit misses
          if (serverResults && serverResults.length > 0) {
            console.warn('Server results length mismatch; results:', serverResults.length, 'items:', target.items.length);
          } else {
            console.warn('Server returned no results for checklist validation');
          }
          // Conservative: if you want to mark unaddressed items with ❌ in the textbox, uncomment below.
          // target.items.forEach((it: string, i: number) => { target.notes[i] = `${it} ❌ (${now})`; });
        }

        updated[roleKey] = { ...target };
        return updated;
      });

      // Update placeholders to be emoji-only based on server results
      setRolePlaceholders(prev => {
        const updated = { ...prev };
        const targetPl = Array.isArray(updated[roleKey]) ? [...updated[roleKey]] : Array((serverResults && serverResults.length) || 0).fill('');
        if (serverResults && serverResults.length > 0) {
          for (let i = 0; i < serverResults.length; i++) {
            const r = serverResults[i] || {};
            const emoji = String(r.emoji || '❓').trim();
            targetPl[i] = emoji || '';
          }
        }
        updated[roleKey] = targetPl;
        return updated;
      });
    } catch (e) {
      console.error('validateChecklist error', e);
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
                    {msg.imageUrl ? (
                      <div className="ai-message">
                        <img src={msg.imageUrl} alt="loading" className="loading-gif" />
                      </div>
                    ) : (
                      <div className={`message ${msg.sender === "user" ? "user-message" : "ai-message"}`}>
                        {msg.text}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
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
            </>
          )}
          {activeTab === 'audit' && roles.length > 0 && (
            <div style={{ display: 'flex', gap: 18, padding: 24, minHeight: 0, height: '100%' }}>
              {/* Left: checklist */}
              <div style={{ flex: 1, minWidth: 420, overflowY: 'auto' }}>
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
                          placeholder={(rolePlaceholders[roles[activeRoleIdx]] && rolePlaceholders[roles[activeRoleIdx]][idx]) || 'Paste transcript or notes...'}
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
                        {/* Scan button removed - server will evaluate transcript against checklist items */}
                       </li>
                     ))}
                   </ul>
                 )}
               </div>

              {/* Right: live transcript pane */}
              <div style={{ width: 420, borderLeft: '1px solid #e6e6e6', paddingLeft: 18, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, color: '#111', fontSize: 18 }}>Live Transcript</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={async () => {
                        // Start speech recognition
                        if (recording) return;
                        const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                        if (!SR) {
                          alert('SpeechRecognition not supported in this browser.');
                          return;
                        }
                        try {
                          const recog = new SR();
                          recog.lang = 'en-US';
                          recog.interimResults = true;
                          recog.continuous = true;
                          recog.onresult = (ev: any) => {
                            let interim = '';
                            for (let i = ev.resultIndex; i < ev.results.length; i++) {
                              const res = ev.results[i];
                              if (res.isFinal) {
                                const txt = res[0].transcript.trim();
                                setFinalSegments(prev => [...prev, txt]);
                              } else {
                                interim += res[0].transcript;
                              }
                            }
                            setInterimText(interim);
                          };
                          recog.onerror = (e: any) => {
                            console.error('Recognition error', e);
                            setRecording(false);
                          };
                          recog.onend = () => {
                            // recognition may end unexpectedly; ensure state is correct
                            setRecording(false);
                            setInterimText('');
                          };
                          recognitionRef.current = recog;
                          recog.start();
                          setRecording(true);
                        } catch (e) {
                          console.error('Failed to start recognition', e);
                          alert('Failed to start speech recognition.');
                        }
                      }}
                      style={{ background: recording ? '#ef4444' : '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
                    >{recording ? 'Recording...' : 'Record'}</button>

                    <button
                      onClick={() => {
                        if (!recording) return;
                        try {
                          const recog = recognitionRef.current;
                          if (recog && typeof recog.stop === 'function') recog.stop();
                        } catch (e) {
                          console.error('Error stopping recognition', e);
                        }
                        setRecording(false);
                        setInterimText('');

                        // Assemble the full live transcript (final segments + any interim text)
                        const full = [...finalSegments, interimText].filter(Boolean).join('\n');
                        console.log('[Live Transcript on Stop]', full);

                        // If we have a selected role, validate its checklist
                        try {
                          const roleName = roles && roles.length > 0 ? roles[activeRoleIdx] : Object.keys(roleChecklists)[0];
                          if (roleName) validateChecklist(full, roleName);
                        } catch (err) {
                          console.error('Error calling validateChecklist', err);
                        }
                      }}
                      style={{ background: '#374151', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
                    >Stop</button>
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 12, background: '#fff' }}>
                  {finalSegments.length === 0 && !interimText && (
                    <div style={{ color: '#666' }}>No transcript yet. Click Record to begin live transcription.</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {finalSegments.map((seg, idx) => (
                      <div key={idx} style={{ padding: 8, borderRadius: 6, background: '#f8fafc', border: '1px solid #eef2ff' }}>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{new Date().toLocaleTimeString()}</div>
                        <div style={{ fontSize: 14 }}>{seg}</div>
                      </div>
                    ))}
                    {interimText && (
                      <div style={{ padding: 8, borderRadius: 6, background: '#fff7ed', border: '1px dashed #f59e0b' }}>
                        <div style={{ fontSize: 12, color: '#92400e', marginBottom: 6 }}>Listening…</div>
                        <div style={{ fontSize: 14, color: '#92400e' }}>{interimText}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button onClick={() => { setFinalSegments([]); setInterimText(''); }} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Clear</button>
                  <button onClick={() => {
                    // copy full transcript to clipboard
                    const text = [...finalSegments, interimText].filter(Boolean).join('\n');
                    if (!text) return;
                    navigator.clipboard.writeText(text).then(() => {
                      alert('Transcript copied to clipboard');
                    }).catch(() => alert('Failed to copy'));
                  }} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Copy</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
