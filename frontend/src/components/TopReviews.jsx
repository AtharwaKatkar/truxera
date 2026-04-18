/**
 * TopReviews — shows most helpful positive and negative review.
 * Fetches real data. Shows nothing if no approved reviews exist.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { C } from "../design/tokens.js";

const API = "";

function ago(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3600000), dy = Math.floor(d / 86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
}

function ReviewHighlight({ review, type }) {
  if (!review) return null;
  const isPos = type === "positive";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: isPos ? "#ECFDF5" : "#FEF2F2",
        border: `1px solid ${isPos ? "#6EE7B7" : "#FCA5A5"}`,
        borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 200,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{isPos ? "👍" : "👎"}</span>
        <span style={{ fontSize: 11, fontWeight: 700,
                       color: isPos ? "#059669" : "#DC2626",
                       textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Top {isPos ? "positive" : "negative"}
        </span>
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: "auto" }}>
          {review.helpful_votes > 0 && `${review.helpful_votes} found helpful`}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        {review.title}
      </div>
      <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6,
                    display: "-webkit-box", WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {review.review_text}
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} · {ago(review.created_at)}
      </div>
    </motion.div>
  );
}

export function TopReviews({ domain }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/website/${encodeURIComponent(domain)}/top-reviews`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [domain]);

  if (loading || (!data?.top_positive && !data?.top_negative)) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textSub,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    marginBottom: 12 }}>
        Community highlights
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <ReviewHighlight review={data.top_positive} type="positive" />
        <ReviewHighlight review={data.top_negative} type="negative" />
      </div>
    </div>
  );
}
