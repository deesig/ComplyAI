import Link from "./Link";

export default function WelcomePage() {
    return (
      <div>
          <main>
            <div className="content">
            <h1>Welcome to the AI Compliance Checker</h1>
            <p>Use AI to quickly assess your compliance with government standards and regulations.</p>

            <Link href="/ai_chat">
              <button>Get Started</button>
            </Link>
            </div>
        </main>
      </div>
  );
}