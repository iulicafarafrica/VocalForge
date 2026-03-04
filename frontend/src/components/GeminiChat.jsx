/**
 * GeminiChat Component
 * AI-powered chat assistant for generating lyrics, prompts, and genre suggestions
 * Uses Google Gemini API via backend /gemini_chat endpoint
 */

import { useState } from "react";

const API = "http://localhost:8000";

export default function GeminiChat({ onInsertLyrics, onInsertPrompt }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [task, setTask] = useState("lyrics"); // lyrics, prompt, genre
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: "user", content: input, task };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("message", input);
      fd.append("task", task);

      const res = await fetch(`${API}/gemini_chat`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: "error", content: data.error }]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.response,
          task: data.task 
        }]);
        
        // Auto-insert based on task type
        if (data.task === "lyrics" && onInsertLyrics) {
          onInsertLyrics(data.response);
        } else if (data.task === "prompt" && onInsertPrompt) {
          onInsertPrompt(data.response);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "error", content: err.message }]);
    }

    setLoading(false);
    setInput("");
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div style={{ 
      background: "linear-gradient(135deg, #0d0d22 0%, #0a0a1a 100%)", 
      borderRadius: 12, 
      padding: 16,
      border: "1px solid #1a1a3a",
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div>
            <h3 style={{ color: "#00e5ff", margin: 0, fontSize: 14, fontWeight: 700 }}>AI Assistant</h3>
            <p style={{ color: "#6666aa", margin: 0, fontSize: 10 }}>Powered by Gemini 2.0</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={task}
            onChange={e => setTask(e.target.value)}
            style={{
              background: "#080812",
              border: "1px solid #2a2a4a",
              color: "#e0e0ff",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <option value="lyrics">📝 Lyrics</option>
            <option value="prompt">🎵 Prompt</option>
            <option value="genre">🎼 Genre</option>
          </select>
          <button
            onClick={clearChat}
            style={{
              background: "#e6394611",
              color: "#e63946",
              border: "1px solid #e6394633",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 600,
            }}
            title="Clear chat"
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div style={{ 
        maxHeight: 280, 
        overflowY: "auto", 
        marginBottom: 12,
        padding: "10px",
        background: "#080812",
        borderRadius: 8,
        border: "1px solid #1a1a2e",
      }}>
        {messages.length === 0 ? (
          <div style={{ color: "#444466", fontSize: 11, textAlign: "center", padding: "20px 10px" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
            <div>Ask AI to generate:</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              <span style={{ background: "#06d6a022", color: "#06d6a0", padding: "4px 8px", borderRadius: 4, fontSize: 10 }}>📝 Love song lyrics</span>
              <span style={{ background: "#00e5ff22", color: "#00e5ff", padding: "4px 8px", borderRadius: 4, fontSize: 10 }}>🎵 Dark trap beat</span>
              <span style={{ background: "#ffd16622", color: "#ffd166", padding: "4px 8px", borderRadius: 4, fontSize: 10 }}>🎼 Workout music</span>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                borderRadius: 8,
                background: msg.role === "user" 
                  ? "linear-gradient(135deg, #7209b722, #560bad22)" 
                  : msg.role === "error"
                  ? "#e6394611"
                  : "linear-gradient(135deg, #06d6a022, #00b4d822)",
                border: `1px solid ${
                  msg.role === "user" 
                    ? "#7209b744" 
                    : msg.role === "error"
                    ? "#e6394633"
                    : "#06d6a044"
                }`,
                color: msg.role === "error" ? "#e63946" : "#e0e0ff",
                fontSize: 11,
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
              }}
            >
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 6, 
                marginBottom: 6,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                <span>{msg.role === "user" ? "👤" : msg.role === "error" ? "❌" : "🤖"}</span>
                <span>{msg.role === "user" ? "You" : msg.role === "error" ? "Error" : "AI"}</span>
                {msg.task && msg.role === "user" && (
                  <span style={{ 
                    background: "#2a2a4a", 
                    padding: "2px 6px", 
                    borderRadius: 4, 
                    fontSize: 9,
                    color: "#8888aa",
                  }}>
                    {msg.task === "lyrics" ? "📝" : msg.task === "prompt" ? "🎵" : "🎼"} {msg.task}
                  </span>
                )}
              </div>
              <div style={{ paddingLeft: 22 }}>{msg.content}</div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ 
            padding: "10px 12px", 
            color: "#06d6a0", 
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
            AI is thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === "Enter" && sendMessage()}
          placeholder={
            task === "lyrics" ? "e.g., Love song about summer nights with melancholy vibe..." :
            task === "prompt" ? "e.g., Dark trap beat with heavy 808 bass and atmospheric pads..." :
            "e.g., Upbeat electronic music for working out..."
          }
          disabled={loading}
          style={{
            flex: 1,
            background: "#080812",
            border: "1px solid #2a2a4a",
            color: "#e0e0ff",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 12,
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = "#00e5ff"}
          onBlur={e => e.target.style.borderColor = "#2a2a4a"}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() 
              ? "#444466" 
              : "linear-gradient(135deg, #7209b7, #560bad)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "10px 16px",
            fontSize: 12,
            fontWeight: 700,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            minWidth: 80,
          }}
        >
          {loading ? "⏳" : "🚀 Send"}
        </button>
      </div>

      {/* Auto-insert info */}
      <div style={{ 
        marginTop: 10, 
        padding: "8px 12px", 
        background: "#06d6a011", 
        borderRadius: 6, 
        border: "1px solid #06d6a022",
        color: "#06d6a0",
        fontSize: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <span>✨</span>
        <span>
          {task === "lyrics" 
            ? "Lyrics will be auto-inserted into the Lyrics field" 
            : task === "prompt"
            ? "Prompt will be auto-inserted into the Prompt field"
            : "Genre suggestions will be shown in chat"}
        </span>
      </div>
    </div>
  );
}
