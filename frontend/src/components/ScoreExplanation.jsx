/**
 * ScoreExplanation
 * Shows "This score is based on X factors" + positive/negative signal breakdown.
 * Only renders real data. Never fabricates.
 */
import { motion } from "framer-motion";
import { C } from "../design/tokens.js";
import { staggerContainer, staggerItem } from "../design/motion.js";

export function ScoreExplanation({ explanation, lastCheckedAt }) {
  if (!explanation) return null;

  const { summary, positive, negative, verdict, signal_count } = explanation;

  function fmtTime(iso) {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const now = new Date();
      const diff = Math.floor((now - d) / 1000);
      if (diff < 60)   return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
      return d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
    } catch { return null; }
  }

  const checkedLabel = fmtTime(lastCheckedAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 20 }}>

      {/* Summary bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 8, marginBottom: 14,
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#F8FAFC", border: `1px solid ${C.border}`,
          borderRadius: 99, padding: "5px 14px",
          fontSize: 12, fontWeight: 600, color: C.textSub,
        }}>
          <span>📊</span> {summary}
        </div>
        {checkedLabel && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 11, color: C.textMuted,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#10B981", display: "inline-block",
              animation: "pulse 2s ease infinite",
            }} />
            Live analysis · checked {checkedLabel}
          </div>
        )}
      </div>

      {/* Verdict */}
      {verdict && (
        <div style={{
          fontSize: 14, fontWeight: 600, color: C.textSub,
          marginBottom: 14, fontStyle: "italic",
        }}>
          "{verdict}"
        </div>
      )}

      {/* Positive + Negative columns */}
      {(positive?.length > 0 || negative?.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Positive signals */}
          {positive?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#059669",
                            textTransform: "uppercase", letterSpacing: "0.06em",
                            marginBottom: 8 }}>
                ✅ Positive signals
              </div>
              <motion.div
                variants={staggerContainer(0.05)}
                initial="hidden" animate="visible"
                style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {positive.map((s, i) => (
                  <motion.div key={i} variants={staggerItem}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      background: "#ECFDF5", border: "1px solid #6EE7B7",
                      borderRadius: 8, padding: "7px 10px",
                      fontSize: 12, color: "#065F46", fontWeight: 500,
                    }}>
                    <span style={{ flexShrink: 0 }}>{s.icon}</span>
                    <span>{s.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {/* Risk signals */}
          {negative?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626",
                            textTransform: "uppercase", letterSpacing: "0.06em",
                            marginBottom: 8 }}>
                ⚠️ Risk signals
              </div>
              <motion.div
                variants={staggerContainer(0.05)}
                initial="hidden" animate="visible"
                style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {negative.map((s, i) => (
                  <motion.div key={i} variants={staggerItem}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      background: "#FEF2F2", border: "1px solid #FCA5A5",
                      borderRadius: 8, padding: "7px 10px",
                      fontSize: 12, color: "#991B1B", fontWeight: 500,
                    }}>
                    <span style={{ flexShrink: 0 }}>{s.icon}</span>
                    <span>{s.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
