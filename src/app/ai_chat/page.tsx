import AIChat from "../ai_chat";
import AppHeader from "../AppHeader";
import AppFooter from "../AppFooter";

export default function AIChatPage() {
  return (
    <>
      <AppHeader />
      <main>
        <AIChat />
      </main>
      <AppFooter />
    </>
  );
}
