import { useState, useMemo } from "react";

const AVAILABLE_TAGS = ["prompts", "RVC", "setări", "idei", "lyrics", "pipeline", "notes"];

export default function NotesTab() {
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vocalforge_notes") || "[]"); }
    catch { return []; }
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [tags, setTags] = useState("");

  const save = () => {
    if (!content.trim() && !title.trim()) return;
    const noteTags = tags.split(",").map(t => t.trim().toLowerCase()).filter(t => t);
    const note = { 
      id: editId || Date.now(), 
      title: title || "Untitled", 
      content, 
      tags: noteTags,
      pinned: editId ? notes.find(n => n.id === editId)?.pinned || false : false,
      updated: new Date().toLocaleString() 
    };
    const updated = editId ? notes.map(n => n.id === editId ? note : n) : [note, ...notes];
    setNotes(updated);
    localStorage.setItem("vocalforge_notes", JSON.stringify(updated));
    setTitle(""); setContent(""); setEditId(null); setTags("");
  };

  const edit = (note) => { 
    setTitle(note.title); 
    setContent(note.content); 
    setEditId(note.id); 
    setTags(note.tags?.join(", ") || "");
  };

  const del = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem("vocalforge_notes", JSON.stringify(updated));
    if (editId === id) { setTitle(""); setContent(""); setEditId(null); setTags(""); }
  };

  const togglePin = (id) => {
    const updated = notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n);
    setNotes(updated);
    localStorage.setItem("vocalforge_notes", JSON.stringify(updated));
  };

  const exportNotes = () => {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocalforge_notes_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importNotes = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          const merged = [...imported, ...notes];
          setNotes(merged);
          localStorage.setItem("vocalforge_notes", JSON.stringify(merged));
        }
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(s) || 
        n.content.toLowerCase().includes(s)
      );
    }
    if (filterTag) {
      result = result.filter(n => n.tags?.includes(filterTag));
    }
    return result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updated) - new Date(a.updated);
    });
  }, [notes, search, filterTag]);

  const S = {
    card: { background: "linear-gradient(135deg,#0d0d22 0%,#0a0a1a 100%)", border: "1px solid #1e1e3a", borderRadius: 12, padding: 16, marginBottom: 14 },
    label: { color: "#7209b7", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, display: "block" },
    input: { background: "#0a0a1a", border: "1px solid #2a2a4a", color: "#e0e0ff", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: "100%" },
    btn: { background: "linear-gradient(135deg,#7209b7,#9b2de0)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    btnOutline: { background: "transparent", color: "#9b2de0", border: "1px solid #7209b7", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" },
  };

  const tagColors = {
    prompts: "#f59e0b", RVC: "#10b981", setări: "#3b82f6", idei: "#ec4899", 
    lyrics: "#8b5cf6", pipeline: "#06b6d4", notes: "#6b7280"
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
          <input value={tags} onChange={e => setTags(e.target.value)}
            placeholder="Tags (ex: prompts, RVC, idei)..."
            style={{ ...S.input, marginBottom: 10 }} />
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Write your notes, settings, prompts..."
            rows={10}
            style={{ ...S.input, resize: "vertical", lineHeight: 1.6, fontSize: 13 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={save} style={{ flex: 1, ...S.btn }}>
              {editId ? "💾 Update Note" : "💾 Save Note"}
            </button>
            {editId && (
              <button onClick={() => { setTitle(""); setContent(""); setEditId(null); setTags(""); }}
                style={{ ...S.btnOutline, borderRadius: 8, padding: "10px 14px" }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div style={{ ...S.card, maxHeight: 600, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <span style={S.label}>📚 Notes ({filteredNotes.length})</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={exportNotes} style={{ ...S.btnOutline, padding: "6px 10px" }}>📤 Export</button>
            <label style={{ ...S.btnOutline, padding: "6px 10px", cursor: "pointer" }}>
              📥 Import
              <input type="file" accept=".json" onChange={importNotes} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        {/* Search & Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search notes..."
            style={{ ...S.input, flex: 1 }} />
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
            style={{ ...S.input, width: "auto", minWidth: 100 }}>
            <option value="">All Tags</option>
            {AVAILABLE_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {filteredNotes.length === 0 && (
          <div style={{ color: "#333355", fontSize: 12, textAlign: "center", padding: "30px 0" }}>
            {search || filterTag ? "No notes found." : "No notes yet. Create your first note!"}
          </div>
        )}
        {filteredNotes.map(note => (
          <div key={note.id} style={{
            background: "#0a0a1a", borderRadius: 10, padding: 14, marginBottom: 10,
            border: editId === note.id ? "1px solid #7209b7" : "1px solid #1a1a2e",
            transition: "border-color 0.2s",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <div style={{ color: "#e0e0ff", fontSize: 14, fontWeight: 700 }}>{note.title}</div>
                  {note.pinned && <span style={{ color: "#f59e0b", fontSize: 12 }}>📌</span>}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                  {note.tags?.map(tag => (
                      <span key={tag} style={{ 
                        background: (tagColors[tag] || "#6b7280") + "22", 
                        color: tagColors[tag] || "#6b7280",
                      padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 
                    }}>{tag}</span>
                  ))}
                </div>
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
                <button onClick={() => togglePin(note.id)}
                  style={{ background: note.pinned ? "#f59e0b22" : "#1a1a2e", color: note.pinned ? "#f59e0b" : "#aaaacc", border: "1px solid #2a2a4a", padding: "4px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                  📌
                </button>
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
