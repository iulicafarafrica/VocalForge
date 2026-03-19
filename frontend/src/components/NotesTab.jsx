import { useState } from "react";

export default function NotesTab() {
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vocalforge_notes") || "[]"); }
    catch { return []; }
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState(null);

  const save = () => {
    if (!content.trim() && !title.trim()) return;
    const note = { id: editId || Date.now(), title: title || "Untitled", content, updated: new Date().toLocaleString() };
    const updated = editId ? notes.map(n => n.id === editId ? note : n) : [note, ...notes];
    setNotes(updated);
    localStorage.setItem("vocalforge_notes", JSON.stringify(updated));
    setTitle(""); setContent(""); setEditId(null);
  };

  const edit = (note) => { setTitle(note.title); setContent(note.content); setEditId(note.id); };

  const del = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem("vocalforge_notes", JSON.stringify(updated));
    if (editId === id) { setTitle(""); setContent(""); setEditId(null); }
  };

  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22 0%,#0a0a1a 100%)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 16, marginBottom: 14 },
    label: { color: "#7209b7", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, display: "block" },
    input: { background: "#0a0a1a", border: "1px solid #2a2a4a", color: "#e0e0ff", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: "100%" },
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }} className="fade-in">
      {/* Editor */}
      <div>
        <div style={S.card}>
          <span style={S.label}>{editId ? "✏ Edit Note" : "📝 New Note"}</span>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Note title..."
            style={{ ...S.input, marginBottom: 10 }} />
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Write your notes, settings, prompts..."
            rows={10}
            style={{ ...S.input, resize: "vertical", lineHeight: 1.6, fontSize: 13 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={save}
              style={{
                flex: 1, background: "linear-gradient(135deg,#7209b7,#9b2de0)", color: "#fff",
                border: "none", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
              {editId ? "💾 Update Note" : "💾 Save Note"}
            </button>
            {editId && (
              <button onClick={() => { setTitle(""); setContent(""); setEditId(null); }}
                style={{ background: "#1a1a2e", color: "#aaaacc", border: "1px solid #2a2a4a", borderRadius: 8, padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div style={{ ...S.card, maxHeight: 600, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={S.label}>📚 Notes ({notes.length})</span>
        </div>
        {notes.length === 0 && (
          <div style={{ color: "#333355", fontSize: 12, textAlign: "center", padding: "30px 0" }}>
            No notes yet. Create your first note!
          </div>
        )}
        {notes.map(note => (
          <div key={note.id} style={{
            background: "#0a0a1a", borderRadius: 10, padding: 14, marginBottom: 10,
            border: editId === note.id ? "1px solid #7209b7" : "1px solid #1a1a2e",
            transition: "border-color 0.2s",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#e0e0ff", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{note.title}</div>
                <div style={{ color: "#444466", fontSize: 10, marginBottom: 8 }}>{note.updated}</div>
                <div style={{
                  color: "#8888aa", fontSize: 12, lineHeight: 1.6,
                  whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden",
                  maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                }}>
                  {note.content}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginLeft: 10, flexShrink: 0 }}>
                <button onClick={() => edit(note)}
                  style={{ background: "#7209b722", color: "#9b2de0", border: "1px solid #7209b744", padding: "4px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                  ✏
                </button>
                <button onClick={() => del(note.id)}
                  style={{ background: "#e6394622", color: "#e63946", border: "1px solid #e6394644", padding: "4px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
