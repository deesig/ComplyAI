import AIChat from "../ai_chat";
import AppHeader from "../AppHeader";
import AppFooter from "../AppFooter";

export default function AIChatPage() {
  // Header and footer are 72px each (see global.css), so main area should be 100vh - 144px
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: '100vh', overflow: 'hidden' }}>
      <AppHeader />
      <main style={{ backgroundColor: 'black', flex: 1, display: 'flex', padding: 0, margin: 0, height: 'calc(100vh - 144px)', minHeight: 0, overflow: 'hidden' }}>
        <AIChat />
      </main>
      <AppFooter />
    </div>
  );
}
