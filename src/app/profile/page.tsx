"use client";
import { useState, useEffect } from "react";
import AppHeader from "../AppHeader";
import AppFooter from "../AppFooter";
import "./page.css";


export default function ProfilePage() {

  const [form, setForm] = useState({
    name: "",
    email: "",
    typeOfWork: "",
    organization: "",
    location: ""
  });
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("profileForm");
      if (saved) {
        setForm(JSON.parse(saved));
      }
      setLoaded(true);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem("profileForm", JSON.stringify(form));
    }
  }, [form, loaded]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  if (!loaded) return null;

  return (
    <>
      <AppHeader />
      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <form style={{ background: "#fff", padding: 32, borderRadius: 8, boxShadow: "0 2px 8px #0001", minWidth: 320 }}>
          <h2 style={{ textAlign: "center", marginBottom: 24 }}>User Profile</h2>
          <label>Name<br />
            <input name="name" value={form.name} onChange={handleChange} style={{ width: "100%", marginBottom: 16 }} />
          </label>
          <label>Email<br />
            <input name="email" value={form.email} onChange={handleChange} style={{ width: "100%", marginBottom: 16}} />
          </label>
          <label>Type of Work<br />
            <input name="typeOfWork" value={form.typeOfWork} onChange={handleChange} style={{ width: "100%", marginBottom: 16 }} />
          </label>
          <label>Organization<br />
            <input name="organization" value={form.organization} onChange={handleChange} style={{ width: "100%", marginBottom: 16 }} />
          </label>
          <label>Location<br />
            <input name="location" value={form.location} onChange={handleChange} style={{ width: "100%", marginBottom: 24 }} />
          </label>
        </form>
      </main>
      <AppFooter />
    </>
  );
}
