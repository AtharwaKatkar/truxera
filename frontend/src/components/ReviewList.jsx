import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StarDisplay } from "./StarRating.jsx";
import { Badge } from "./Badge.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { CardSkeleton } from "./Skeleton.jsx";
import { C } from "../design/tokens.js";
import { staggerContainer, staggerItem } from "../design/motion.js";

const API = "";

function ago(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d/3600000), dy = Math.floor(d/86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
}

const ISSUE_LABELS = {
  payment_fraud:"Payment Fraud", not_delivered:"Not Delivered",
  fake_job:"Fake Job", genuine_purchase:"Genuine Purchase",
  good_support:"Good Support", safe_payment:"Safe Payment",
  refund_received:"Refund Received", other:"Other",
};

export function ReviewList({ domain, onWriteReview }) {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [sort, setSort]       = useState("newest");
  const [filter, setFilter]   = useState("all");
  const [page, setPage]       = useState(1);
  const [helpful, setHelpful] = useState({});
  const LIMIT = 5;

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/website/${encodeURIComponent(domain)}/reviews?sort=${sort}&filter=${filter}&page=${page}&limit=${LIMIT}`)
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setTotal(d.total || 0); })
      .catch(() => { setReviews([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [domain, sort, filter, page]);

  async function markHelpful(id) {
    if (helpful[id]) return;
    setHelpful(h => ({ ...h, [id]:true }));
    setReviews(rv => rv.map(r => r.id === id ? { ...r, helpful_votes:(r.helpful_votes||0)+1 } : r));
    try { await fetch(`${API}/review/${id}/helpful`, { method:"POST" }); } catch {}
  }

  const totalPages = Math.ceil(total / LIMIT);
  const sel = {
    border:`1.5px solid ${C.border}`, borderRadius:8, padding:"6px 10px",
    fontSize:13, fontFamily:"inherit", outline:"none", background:"#fff", cursor:"pointer",
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    flexWrap:"wrap", gap:12, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.textSub,
                      textTransform:"uppercase", letterSpacing:"0.06em" }}>
          Reviews {total > 0 && <span style={{ color:C.textMuted, fontWeight:400,
                                               textTransform:"none" }}>({total})</span>}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <select style={sel} value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
            {[["newest","Newest"],["helpful","Most helpful"],["highest","Highest rated"],["lowest","Lowest rated"]]
              .map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select style={sel} value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
            {[["all","All"],["positive","Positive"],["negative","Negative"],["verified","Verified"]]
              .map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[1,2,3].map(i => <CardSkeleton key={i} />)}
          </motion.div>
        ) : reviews.length === 0 ? (
          <motion.div key="empty"
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <EmptyState icon="💬"
              title={filter !== "all" ? `No ${filter} reviews yet` : "No community reviews yet"}
              message={filter !== "all"
                ? "Try a different filter to see more reviews."
                : "Be the first to share your experience with this website."}
              action={filter === "all" && onWriteReview
                ? { label:"Write a review", onClick:onWriteReview } : undefined} />
          </motion.div>
        ) : (
          <motion.div key={`${sort}-${filter}-${page}`}
            variants={staggerContainer(0.06)}
            initial="hidden" animate="visible" exit={{ opacity:0 }}
            style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {reviews.map(r => (
              <ReviewItem key={r.id} review={r}
                          onHelpful={markHelpful} alreadyVoted={!!helpful[r.id]} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:20 }}>
          <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
            disabled={page===1} onClick={() => setPage(p => p-1)}
            style={{ border:`1.5px solid ${C.border}`, background:"#fff", borderRadius:8,
                     padding:"6px 14px", fontSize:13, cursor:page===1?"not-allowed":"pointer",
                     opacity:page===1?0.5:1, fontFamily:"inherit" }}>
            ← Prev
          </motion.button>
          <span style={{ fontSize:13, color:C.textMuted, padding:"6px 0" }}>
            {page} / {totalPages}
          </span>
          <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
            disabled={page===totalPages} onClick={() => setPage(p => p+1)}
            style={{ border:`1.5px solid ${C.border}`, background:"#fff", borderRadius:8,
                     padding:"6px 14px", fontSize:13,
                     cursor:page===totalPages?"not-allowed":"pointer",
                     opacity:page===totalPages?0.5:1, fontFamily:"inherit" }}>
            Next →
          </motion.button>
        </div>
      )}
    </div>
  );
}

function ReviewItem({ review:r, onHelpful, alreadyVoted }) {
  const typeStyle = {
    positive: { bg:"#ECFDF5", color:"#16A34A", border:"#6EE7B7" },
    negative: { bg:"#FEF2F2", color:"#DC2626", border:"#FCA5A5" },
    neutral:  { bg:"#F3F4F6", color:"#6B7280", border:"#E5E7EB" },
  }[r.review_type] || { bg:"#F3F4F6", color:"#6B7280", border:"#E5E7EB" };

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y:-2, boxShadow:"0 6px 20px rgba(0,0,0,0.07)", borderColor:"#CBD5E1" }}
      style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"flex-start", gap:12, marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
            <StarDisplay rating={r.rating} size={14} showNumber={false} />
            <span style={{ display:"inline-flex", alignItems:"center", gap:4,
                           padding:"2px 9px", borderRadius:99, fontSize:11, fontWeight:600,
                           background:typeStyle.bg, color:typeStyle.color,
                           border:`1px solid ${typeStyle.border}` }}>
              {r.review_type.charAt(0).toUpperCase() + r.review_type.slice(1)}
            </span>
            {r.verified_flag && <Badge type="verified">Verified</Badge>}
            {r.used_or_paid  && <Badge type="info">Used this site</Badge>}
            {r.issue_type && ISSUE_LABELS[r.issue_type] && (
              <Badge type="nodata">{ISSUE_LABELS[r.issue_type]}</Badge>
            )}
          </div>
          <div style={{ fontSize:15, fontWeight:600, color:C.text, marginBottom:6 }}>{r.title}</div>
        </div>
        <div style={{ fontSize:12, color:C.textMuted, flexShrink:0 }}>{ago(r.created_at)}</div>
      </div>

      <p style={{ fontSize:14, color:C.textSub, lineHeight:1.65, marginBottom:12 }}>
        {r.review_text}
      </p>

      {(r.payment_successful != null || r.received_service != null) && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
          {r.payment_successful != null && (
            <span style={{ fontSize:12, padding:"3px 10px", borderRadius:99,
                           background: r.payment_successful ? "#ECFDF5" : "#FEF2F2",
                           color: r.payment_successful ? C.safe : C.danger,
                           border:`1px solid ${r.payment_successful ? "#6EE7B7" : "#FCA5A5"}` }}>
              {r.payment_successful ? "✅ Payment successful" : "❌ Payment failed"}
            </span>
          )}
          {r.received_service != null && (
            <span style={{ fontSize:12, padding:"3px 10px", borderRadius:99,
                           background: r.received_service ? "#ECFDF5" : "#FEF2F2",
                           color: r.received_service ? C.safe : C.danger,
                           border:`1px solid ${r.received_service ? "#6EE7B7" : "#FCA5A5"}` }}>
              {r.received_service ? "✅ Service received" : "❌ Service not received"}
            </span>
          )}
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    flexWrap:"wrap", gap:8 }}>
        <span style={{ fontSize:12, color:C.textMuted }}>
          By {r.is_anonymous ? "Anonymous" : (r.reviewer_name || "Anonymous")}
        </span>
        <motion.button
          whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
          onClick={() => onHelpful(r.id)} disabled={alreadyVoted}
          style={{ border:`1.5px solid ${alreadyVoted ? "#6EE7B7" : C.border}`,
                   background: alreadyVoted ? "#ECFDF5" : "transparent",
                   borderRadius:8, padding:"5px 12px", fontSize:12,
                   cursor: alreadyVoted ? "default" : "pointer",
                   color: alreadyVoted ? C.safe : C.textSub,
                   fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
          👍 Helpful {r.helpful_votes > 0 && `(${r.helpful_votes})`}
        </motion.button>
      </div>
    </motion.div>
  );
}
