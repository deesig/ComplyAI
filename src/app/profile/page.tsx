"use client";

import { useState, useEffect } from "react";
import AppHeader from "../AppHeader";
import AppFooter from "../AppFooter";
import "./page.css";

const TABS = [
  "Business Profile",
  "List of Roles",
  "Additional Information to Know"
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Tab 1 fields
  const [businessProfile, setBusinessProfile] = useState({
    industry: "",
    size: "",
    location: "",
    frameworks: ""
  });
  // Tab 2 fields
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  // Tab 3 field
  const [additionalInfo, setAdditionalInfo] = useState("");

  // Check if all required fields are filled (must be after state declarations)
  const profileComplete = !!(
    businessProfile.industry &&
    businessProfile.size &&
    businessProfile.location &&
    businessProfile.frameworks &&
    roles.length > 0
  );
  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("profileTabs");
      if (saved) {
        const parsed = JSON.parse(saved);
        setBusinessProfile(parsed.businessProfile || businessProfile);
        setRoles(parsed.roles || []);
        setAdditionalInfo(parsed.additionalInfo || "");
      }
      setLoaded(true);
    }
    // eslint-disable-next-line
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(
        "profileTabs",
        JSON.stringify({ businessProfile, roles, additionalInfo })
      );
    }
  }, [businessProfile, roles, additionalInfo, loaded]);

  function handleBusinessChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBusinessProfile({ ...businessProfile, [e.target.name]: e.target.value });
  }

  function handleAddRole() {
    if (roleInput.trim()) {
      setRoles([...roles, roleInput.trim()]);
      setRoleInput("");
    }
  }

  function handleRemoveRole(idx: number) {
    setRoles(roles.filter((_, i) => i !== idx));
  }

  if (!loaded) return null;

  return (
    <>
      <AppHeader />
      <main style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
        gap: 32,
        flexWrap: 'wrap',
        padding: '0 12px',
      }}>
        <div style={{
          background: "#fff",
          padding: 32,
          borderRadius: 14,
          boxShadow: "0 2px 16px #0002",
          minWidth: 340,
          width: 480,
          maxWidth: '98vw',
          flex: '1 1 340px',
        }}>
          <h2 style={{ textAlign: "center", fontWeight: 'bold', fontSize: "1.7em", letterSpacing: 1 }}>Profile Information</h2>
          <p style={{ textAlign: "center", marginBottom: 28, fontSize: "0.85em"}}>(Your changes are automatically saved.)</p>
          <div style={{ display: "flex", gap: 16, borderBottom: "2px solid #e0e7ef", marginBottom: 32, padding: '0 8px' }}>
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                style={{
                  flex: 1,
                  padding: "15px 0",
                  marginBottom: -2,
                  background: i === activeTab ? "#2563eb" : "#f4f7fa",
                  color: i === activeTab ? "#fff" : "#222",
                  border: "none",
                  borderRadius: '14px 14px 0 0',
                  borderBottom: i === activeTab ? "4px solid #2563eb" : "4px solid transparent",
                  fontWeight: 700,
                  fontSize: 19,
                  letterSpacing: 0.5,
                  cursor: "pointer",
                  boxShadow: i === activeTab ? "0 2px 8px #2563eb22" : undefined,
                  transition: "background 0.2s, color 0.2s, box-shadow 0.2s"
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Tab Content */}
          {activeTab === 0 && (
            <div>
              <label>Industry / Sector <span style={{ color: 'red', fontWeight: 700 }}>*</span><br />
                <input name="industry" value={businessProfile.industry} onChange={handleBusinessChange} style={{ width: "100%", marginBottom: 16 }} />
              </label>
              <label>Business Size <span style={{ color: 'red', fontWeight: 700 }}>*</span><br />
                <input name="size" value={businessProfile.size} onChange={handleBusinessChange} style={{ width: "100%", marginBottom: 16 }} />
              </label>
              <label>Location <span style={{ color: 'red', fontWeight: 700 }}>*</span><br />
                <input name="location" value={businessProfile.location} onChange={handleBusinessChange} style={{ width: "100%", marginBottom: 16 }} />
              </label>
              <label>Framework(s) to Check Against <span style={{ color: 'red', fontWeight: 700 }}>*</span><br />
                <input name="frameworks" value={businessProfile.frameworks} onChange={handleBusinessChange} style={{ width: "100%", marginBottom: 16 }} />
              </label>
            </div>
          )}
          {activeTab === 1 && (
            <div>
              <label>Role <span style={{ color: 'red', fontWeight: 700 }}>*</span><br />
                <input
                  name="roleInput"
                  value={roleInput}
                  onChange={e => setRoleInput(e.target.value)}
                  style={{ width: "100%", marginBottom: 8 }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddRole(); } }}
                />
              </label>
              <button type="button" onClick={handleAddRole} style={{ width: "100%", marginBottom: 16, background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: 8, fontWeight: 600, cursor: "pointer" }}>Add Role</button>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {roles.map((role, idx) => (
                  <li key={idx} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ flex: 1 }}>{role}</span>
                    <button type="button" onClick={() => handleRemoveRole(idx)} style={{ background: "#e53e3e", color: "#fff", border: "none", borderRadius: 4, padding: "2px 8px", marginLeft: 8, cursor: "pointer" }}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {activeTab === 2 && (
            <div>
              <label>Additional Information<br />
                <textarea
                  name="additionalInfo"
                  value={additionalInfo}
                  onChange={e => setAdditionalInfo(e.target.value)}
                  style={{ width: "100%", minHeight: 120, marginBottom: 16, resize: "vertical", border: "1px solid #ccc", borderRadius: 4, padding: 8 }}
                />
              </label>
            </div>
          )}
        </div>
        {/* Next Steps Box - to the right on desktop, below on mobile */}
        <div
          style={{
            background: 'linear-gradient(90deg, #e0e7ef 0%, #f8fafc 100%)',
            borderRadius: 10,
            padding: '28px 22px 22px 22px',
            boxShadow: '0 2px 8px #2563eb11',
            textAlign: 'center',
            border: '1.5px solid #d0e0f7',
            minWidth: 260,
            maxWidth: 340,
            flex: '0 1 320px',
            marginTop: 0,
            marginLeft: 0,
            marginRight: 0,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>
            <span role="img" aria-label="info">ℹ️</span> Next Step
          </div>
          <div style={{ fontSize: 15.5, color: '#333', marginBottom: 18 }}>
            Once you complete your profile, you can use the AI assistant to get personalized compliance guidance for your business.<br />
            <span style={{ color: '#2563eb', fontWeight: 500 }}>Your profile helps tailor the AI's answers to your needs.</span>
          </div>
          <a href={profileComplete ? "/ai_chat" : undefined} style={{ textDecoration: 'none', pointerEvents: profileComplete ? 'auto' : 'none' }}>
            <button
              className="profile-ai-btn"
              disabled={!profileComplete}
            >
              <span role="img" aria-label="chat">💬</span> Go to AI Chat
            </button>
          </a>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
