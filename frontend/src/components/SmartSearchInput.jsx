/**
 * SmartSearchInput
 * ChatGPT-style input that accepts natural language.
 * Extracts domain client-side before sending to API.
 * Shows "Checking xyz.com..." when domain is extracted from a sentence.
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "../design/tokens.js";

// Client-side domain extraction (mirrors backend logic)
function extractDomain(text) {
  text = text.trim();
  if (!text) return null;

  // Full URL
  if (text.startsWith("http://") || text.startsWith("https://")) {
    try {
      const url = new URL(text);
      return url.hostname.replace(/^www\./, "");
    } catch {}
  }

  // Regex for domain pattern
  const tlds = "com|in|co\\.in|org|net|io|gov|edu|info|biz|co|app|ai|tech|store|shop|online|site|xyz|club|live|news|finance|money|loan|jobs|work|pay|bank";
  const re = new RegExp(
    `(?:https?://)?(?:www\\.)?([a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9]?(?:\\.[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9]?)*\\.(?:${tlds})(?:\\.[a-z]{2})?)`,
    "i"
  );
  const m = text.match(re);
  if (m) return m[1].toLowerCase().replace(/^www\./, "").split("/")[0];

  // Bare domain (no spaces, has dot)
  if (!text.includes(" ") && text.includes(".")) {
    return text.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }

  return null;
}

const PLACEHOLDERS = [
  "Check any website before you trust it...",
  "e.g. quickjobs247.in",
  "Is this site safe? Type to find out...",
  "e.g. is xyz.com safe?",
  "e.g. check fastloan99.com",
];

export function SmartSearchInput({ onSearch, searching }) {
  const [value, setValue]         = useState("");
  const [extracted, setExtracted] = useState(null);
  const [phIdx]                   = useState(() => Math.floor(Math.random() * PLACEHOLDERS.length));
  const inputRef                  = useRef(null);

  function handleChange(e) {
    const v = e.target.value;
    setValue(v);
    const d = extractDomain(v);
    setExtracted(d && v.trim().split(" ").length > 1 ? d : null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const domain = extractDomain(value) || value.trim();
    if (domain) onSearch(domain);
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <div style={{
        display: "flex", gap: 10, alignItems: "center",
        background: "#fff", border: `2px solid ${C.border}`,
        borderRadius: 16, padding: "10px 10px 10px 20px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = C.red;
        e.currentTarget.style.boxShadow = `0 4px 24px rgba(229,75,75,0.15)`;
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.08)";
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
             style={{ flexShrink: 0, color: C.textMuted }}>
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          placeholder={PLACEHOLDERS[phIdx]}
          style={{
            flex: 1, border: "none", outline: "none", fontSize: 16,
            fontFamily: "inherit", background: "transparent", color: C.text,
          }}
        />
        <motion.button
          type="submit"
          disabled={searching || !value.trim()}
          whileHover={!searching ? { scale: 1.02 } : {}}
          whileTap={!searching ? { scale: 0.97 } : {}}
          style={{
            background: searching || !value.trim() ? C.textMuted : C.red,
            color: "#fff", border: "none", padding: "11px 26px",
            borderRadius: 10, fontSize: 15, fontWeight: 600,
            cursor: searching || !value.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit", whiteSpace: "nowrap",
            boxShadow: !searching && value.trim() ? `0 4px 12px rgba(229,75,75,0.3)` : "none",
            transition: "all 0.2s",
          }}>
          {searching ? "Checking…" : "Check now →"}
        </motion.button>
      </div>

      {/* Domain extraction hint */}
      <AnimatePresence>
        {extracted && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
              background: "#EFF6FF", border: "1px solid #BFDBFE",
              borderRadius: 99, padding: "4px 12px",
              fontSize: 12, fontWeight: 600, color: "#2563EB",
            }}>
            <span>🔍</span> Will check: <strong>{extracted}</strong>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
