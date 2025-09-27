// Firebase configuration and initialization for Next.js
import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// Prevent re-initialization on hot reloads
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
