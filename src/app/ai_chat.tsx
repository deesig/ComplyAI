import "./css/ai_chat.css";
import "./css/global.css";
import Link from "./Link";

export default function AIChat() {
  return (
    <div className="body-components">
      <div className="sidebar">
        <h2>History</h2>
        <div className="history-item">Compliance Check #1</div>
        <div className="history-item">Data Privacy Audit</div>
        <div className="history-item">Accessibility Review</div>
        {/* You can dynamically add more items here */}
      </div>
      <div className="chat-container">
        <div className="chat-messages" id="chatMessages">
          <div className="message ai-message">
            Hello! I can help you assess your compliance with government standards. What would you like to check today?
          </div>
        </div>
        <div className="chat-input">
          <input type="text" id="userInput" placeholder="Type your question..." />
          <button>Send</button>
        </div>
      </div>
    </div>
  );
}
