import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { C } from "../design/tokens.js";
import { Badge } from "../components/Badge.jsx";
import { Sk } from "../components/Skeleton.jsx";

const API = "";

function ago(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3600000), dy = Math.floor(d / 86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
}

function authHeaders() {
  const t = localStorage.getItem("truxera_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── STAT CARD ─────────────────────────────────────────────
function StatCard({ label, value, color = C.text, icon }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14,
                  padding: "18px 22px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Syne',sans-serif" }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── REVIEW ROW ────────────────────────────────────────────
function ReviewRow({ review, onApprove, onReject }) {
  const [loading, setLoading] = useState(false);

  async function act(action) {
    setLoading(true);
    try {
      await fetch(`${API}/admin/review/${review.id}/${action}`, {
        method: "POST", headers: authHeaders(),
      });
      action === "approve" ? onApprove(review.id) : onReject(review.id);
    } catch {}
    setLoading(false);
  }

  const spamColor = review.spam_score >= 60 ? C.danger
    : review.spam_score >= 30 ? C.caution : C.safe;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
               padding: 18, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, background: "#F1F5F9",
                           padding: "2px 10px", borderRadius: 99, color: C.textSub }}>
              {review.domain}
            </span>
            <span style={{ fontSize: 12, color: "#F59E0B" }}>
              {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
            </span>
            <Badge type={review.status === "flagged" ? "danger" : "pending"}>
              {review.status}
            </Badge>
            <span style={{ fontSize: 11, color: spamColor, fontWeight: 600 }}>
              Spam: {review.spam_score}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            {review.title}
          </div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
            {review.review_text}
          </div>
          {review.proof_urls?.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {review.proof_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                   style={{ fontSize: 12, color: C.info, textDecoration: "underline" }}>
                  📎 Proof {i + 1}
                </a>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
            IP: {review.ip} · {ago(review.created_at)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            disabled={loading} onClick={() => act("approve")}
            style={{ background: C.safe, color: "#fff", border: "none",
                     padding: "8px 16px", borderRadius: 9, fontSize: 13,
                     fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            ✓ Approve
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            disabled={loading} onClick={() => act("reject")}
            style={{ background: C.danger, color: "#fff", border: "none",
                     padding: "8px 16px", borderRadius: 9, fontSize: 13,
                     fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            ✕ Reject
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── MAIN ADMIN PAGE ───────────────────────────────────────
export default function AdminPage() {
  const [stats, setStats]       = useState(null);
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    const h = authHeaders();
    Promise.all([
      fetch(`${API}/admin/stats`, { headers: h }).then(r => r.json()),
      fetch(`${API}/admin/reviews/pending?limit=30`, { headers: h }).then(r => r.json()),
    ]).then(([s, rv]) => {
      if (s.detail) { setError(s.detail); return; }
      setStats(s);
      setReviews(Array.isArray(rv) ? rv : []);
    }).catch(() => setError("Failed to load admin data"))
      .finally(() => setLoading(false));
  }, []);

  function removeReview(id) {
    setReviews(prev => prev.filter(r => r.id !== id));
  }

  if (error) return (
    <div style={{ padding: 40, textAlign: "center", color: C.danger }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{error}</div>
      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 8 }}>
        Admin access required. Make sure you're signed in as an admin.
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter','DM Sans',sans-serif", background: C.bg,
                  minHeight: "100vh", color: C.text }}>
      {/* Header */}
      <div style={{ background: C.dark, padding: "20px 32px",
                    display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: C.red, borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16 }}>🛡️</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800,
                          color: "#fff" }}>Truxera Admin</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Moderation Dashboard</div>
          </div>
        </div>
        <a href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)",
                              textDecoration: "none" }}>← Back to site</a>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
          {loading ? (
            [1,2,3,4,5,6].map(i => <Sk key={i} h={90} style={{ flex: 1, minWidth: 120 }} />)
          ) : stats ? (
            <>
              <StatCard icon="⭐" label="Total reviews"   value={stats.total_reviews}   />
              <StatCard icon="⏳" label="Pending"         value={stats.pending_reviews} color={C.caution} />
              <StatCard icon="🚩" label="Flagged"         value={stats.flagged_reviews} color={C.danger} />
              <StatCard icon="📋" label="Reports"         value={stats.total_reports}   />
              <StatCard icon="👥" label="Users"           value={stats.total_users}     />
              <StatCard icon="🌐" label="Websites"        value={stats.total_websites}  />
            </>
          ) : null}
        </div>

        {/* Pending reviews */}
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800,
                      marginBottom: 16 }}>
          Pending & Flagged Reviews
        </div>

        {loading ? (
          [1,2,3].map(i => (
            <div key={i} style={{ background: "#fff", border: `1px solid ${C.border}`,
                                   borderRadius: 12, padding: 18, marginBottom: 10 }}>
              <Sk h={14} w="40%" style={{ marginBottom: 8 }} />
              <Sk h={12} w="80%" style={{ marginBottom: 6 }} />
              <Sk h={12} w="60%" />
            </div>
          ))
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>All clear!</div>
            <div style={{ fontSize: 13 }}>No pending or flagged reviews.</div>
          </div>
        ) : (
          reviews.map(r => (
            <ReviewRow key={r.id} review={r}
                       onApprove={removeReview} onReject={removeReview} />
          ))
        )}
      </div>
    </div>
  );
}
