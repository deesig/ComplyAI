import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect root to the static Gemini STT demo page placed in /public
  redirect('/gemini_stt.html');
}
