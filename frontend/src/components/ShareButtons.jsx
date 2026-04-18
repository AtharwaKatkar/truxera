import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { C } from "../design/tokens.js";

const LEVEL_LABELS = {
  safe: "Safe", caution: "Caution", risky: "Risky", dangerous: "Dangerous"
};

export function ShareButtons({ domain, trustScore, trustLevel }) {
  const [copied, setCopied] = useState(false);

  const url     = `${window.location.origin}/site/${domain}`;
  const text    = `I checked ${domain} on Truxera — Trust Score: ${trustScore}/100 (${LEVEL_LABELS[trustLevel] || trustLevel}). Check any website before you pay: ${url}`;
  const encoded = encodeURIComponent(text);
  const encUrl  = encodeURIComponent(url);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const btns = [
    {
      label: "WhatsApp",
      icon: "💬",
      color: "#25D366",
      bg: "#F0FDF4",
      border: "#86EFAC",
      href: `https://wa.me/?text=${encoded}`,
    },
    {
      label: "X / Twitter",
      icon: "𝕏",
      color: "#000",
      bg: "#F8FAFC",
      border: "#E2E8F0",
      href: `https://twitter.com/intent/tweet?text=${encoded}`,
    },
    {
      label: "Telegram",
      icon: "✈️",
      color: "#0088CC",
      bg: "#EFF6FF",
      border: "#BFDBFE",
      href: `https://t.me/share/url?url=${encUrl}&text=${encodeURIComponent(`${domain} — Trust Score: ${trustScore}/100 on Truxera`)}`,
    },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textSub,
                    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        Share result
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {btns.map(b => (
          <motion.a
            key={b.label}
            href={b.href}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -2, boxShadow: `0 4px 14px ${b.border}` }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: b.bg, border: `1px solid ${b.border}`,
              borderRadius: 10, padding: "8px 14px",
              fontSize: 13, fontWeight: 600, color: b.color,
              textDecoration: "none", cursor: "pointer",
            }}
          >
            <span>{b.icon}</span> {b.label}
          </motion.a>
        ))}

        {/* Copy link */}
        <motion.button
          whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
          onClick={copyLink}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: copied ? "#ECFDF5" : "#F8FAFC",
            border: `1px solid ${copied ? "#6EE7B7" : C.border}`,
            borderRadius: 10, padding: "8px 14px",
            fontSize: 13, fontWeight: 600,
            color: copied ? C.safe : C.textSub,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.2s",
          }}
        >
          <span>{copied ? "✅" : "🔗"}</span>
          {copied ? "Copied!" : "Copy link"}
        </motion.button>
      </div>
    </div>
  );
}
