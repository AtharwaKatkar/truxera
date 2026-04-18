import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "../design/tokens.js";

const API = "";
const MAX_FILES = 3;
const MAX_MB    = 5;
const ALLOWED   = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function ProofUpload({ onUploaded }) {
  const [files, setFiles]     = useState([]);   // { name, url, status }
  const [dragging, setDragging] = useState(false);
  const inputRef              = useRef(null);

  async function uploadFile(file) {
    if (!ALLOWED.includes(file.type)) {
      return { name: file.name, url: null, status: "error", error: "Unsupported file type" };
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return { name: file.name, url: null, status: "error", error: `Max ${MAX_MB}MB allowed` };
    }

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res  = await fetch(`${API}/upload/proof`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      return { name: file.name, url: data.url, status: "done" };
    } catch (err) {
      return { name: file.name, url: null, status: "error", error: err.message };
    }
  }

  async function handleFiles(newFiles) {
    const remaining = MAX_FILES - files.length;
    const toUpload  = Array.from(newFiles).slice(0, remaining);
    if (!toUpload.length) return;

    // Add pending placeholders
    const pending = toUpload.map(f => ({ name: f.name, url: null, status: "uploading" }));
    setFiles(prev => [...prev, ...pending]);

    // Upload each
    const results = await Promise.all(toUpload.map(uploadFile));

    setFiles(prev => {
      const updated = [...prev];
      // Replace the pending entries
      let ri = 0;
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].status === "uploading" && ri < results.length) {
          updated[i] = results[ri++];
        }
      }
      return updated;
    });

    const urls = results.filter(r => r.url).map(r => r.url);
    if (urls.length && onUploaded) onUploaded(urls);
  }

  function remove(idx) {
    setFiles(prev => {
      const next = prev.filter((_, i) => i !== idx);
      const urls = next.filter(f => f.url).map(f => f.url);
      if (onUploaded) onUploaded(urls);
      return next;
    });
  }

  const statusIcon = { uploading: "⏳", done: "✅", error: "❌" };
  const statusColor = { uploading: C.textMuted, done: C.safe, error: C.danger };

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.textSub,
                      display: "block", marginBottom: 8 }}>
        Proof (optional) — screenshots, receipts, order confirmations
      </label>

      {/* Drop zone */}
      {files.length < MAX_FILES && (
        <motion.div
          whileHover={{ borderColor: C.red }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? C.red : C.border}`,
            borderRadius: 12, padding: "20px 16px", textAlign: "center",
            cursor: "pointer", background: dragging ? "#FEF2F2" : "#F8FAFC",
            transition: "all 0.2s", marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
          <div style={{ fontSize: 13, color: C.textSub, fontWeight: 500 }}>
            Drop files here or <span style={{ color: C.red }}>browse</span>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            JPG, PNG, PDF · Max {MAX_MB}MB · Up to {MAX_FILES} files
          </div>
          <input ref={inputRef} type="file" multiple accept={ALLOWED.join(",")}
                 style={{ display: "none" }}
                 onChange={e => handleFiles(e.target.files)} />
        </motion.div>
      )}

      {/* File list */}
      <AnimatePresence>
        {files.map((f, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#F8FAFC", border: `1px solid ${C.border}`,
              borderRadius: 9, padding: "8px 12px", marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>{statusIcon[f.status]}</span>
            <span style={{ flex: 1, fontSize: 13, color: C.text,
                           overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {f.name}
            </span>
            {f.error && (
              <span style={{ fontSize: 11, color: C.danger }}>{f.error}</span>
            )}
            <button onClick={() => remove(i)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.textMuted, fontSize: 14, padding: "0 4px",
            }}>✕</button>
          </motion.div>
        ))}
      </AnimatePresence>

      {files.length > 0 && (
        <div style={{ fontSize: 11, color: C.textMuted }}>
          {files.filter(f => f.status === "done").length} of {files.length} uploaded
        </div>
      )}
    </div>
  );
}
