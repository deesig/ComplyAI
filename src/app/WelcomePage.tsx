"use client";

import Link from "./Link";
import "./css/index.css";
import { useEffect, useState } from "react";

export default function WelcomePage() {
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("profileTabs");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const bp = parsed.businessProfile || {};
          const roles = parsed.roles || [];
          // All required fields must be non-empty
          if (
            bp.industry && bp.size && bp.location && bp.frameworks &&
            Array.isArray(roles) && roles.length > 0
          ) {
            setProfileComplete(true);
          } else {
            setProfileComplete(false);
          }
        } catch {
          setProfileComplete(false);
        }
      } else {
        setProfileComplete(false);
      }
    }
  }, []);

  return (
    <div>
      <main>
        <div className="content" style={{ maxWidth: 600, margin: '0 auto', padding: '2.5rem 1rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: 16 }}>Welcome to ComplyAI</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: 18 }}>
            <b>ComplyAI</b> is your smart assistant for navigating government compliance. Instantly check your business against the latest standards, get actionable recommendations, and keep your organization audit-ready—all powered by advanced AI.
          </p>
          <ul style={{ textAlign: 'left', margin: '0 auto 24px auto', maxWidth: 500, fontSize: '1.05rem', color: '#333', lineHeight: 1.6 }}>
            <li>• Personalized compliance checks for your industry and size</li>
            <li>• Step-by-step guidance for regulatory frameworks</li>
            <li>• Secure, private, and always up-to-date</li>
            <li>• Save your business profile for tailored results</li>
          </ul>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', marginTop: 32 }}>
            {profileComplete === false && (
              <Link href="/profile">
                <button className="welcome-profile-btn">
                  <span role="img" aria-label="profile">👤</span> Get Started
                </button>
              </Link>
            )}
            {profileComplete === true && (
              <>
                <Link href="/profile">
                  <button className="welcome-profile-btn">
                    <span role="img" aria-label="profile">👤</span> Edit Your Profile Information
                  </button>
                </Link>
                <span style={{ color: '#888', fontSize: 15, margin: '0 0 0 0' }}>or</span>
                <Link href="/ai_chat">
                  <button className="welcome-ai-btn">
                    <span role="img" aria-label="chat">💬</span> Go to AI Chat
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}