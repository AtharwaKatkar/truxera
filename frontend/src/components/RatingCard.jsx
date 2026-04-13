import { motion } from "framer-motion";
import { C } from "../design/tokens.js";
import { Badge } from "./Badge.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { staggerContainer, staggerItem, barFill } from "../design/motion.js";

function StarRow({ count, total, star }) {
  const pct      = total > 0 ? Math.round(count / total * 100) : 0;
  const barColor = star >= 4 ? C.safe : star === 3 ? C.caution : C.danger;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
      <span style={{ fontSize:12, color:C.textMuted, minWidth:8, textAlign:"right" }}>{star}</span>
      <span style={{ color:"#F59E0B", fontSize:12 }}>★</span>
      <div style={{ flex:1, background:"#F1F5F9", borderRadius:99, height:7, overflow:"hidden" }}>
        <motion.div
          initial={{ width:0 }}
          animate={{ width:`${pct}%` }}
          transition={{ ...barFill, delay: barFill.delay + (5 - star) * 0.06 }}
          style={{ height:"100%", borderRadius:99, background:barColor }}
        />
      </div>
      <span style={{ fontSize:11, color:C.textMuted, minWidth:24, textAlign:"right" }}>{count}</span>
    </div>
  );
}

export function RatingCard({ summary, onWriteReview }) {
  if (!summary || summary.total_reviews === 0) {
    return (
      <div style={{ background:"#fff", border:"1px solid #E8ECF0", borderRadius:16, padding:24 }}>
        <SectionTitle>Community Rating</SectionTitle>
        <EmptyState icon="⭐" title="No reviews yet"
          message="Be the first to rate this website and help others make safer decisions."
          action={onWriteReview ? { label:"Write a review", onClick:onWriteReview } : undefined} />
      </div>
    );
  }

  const { average_rating, total_reviews, distribution,
          positive_pct, negative_pct, positive_count, negative_count } = summary;

  const confType  = total_reviews < 3 ? "limited" : total_reviews < 10 ? "info" : "community";
  const confLabel = total_reviews < 3 ? "Low confidence" : total_reviews < 10 ? "Moderate" : "High confidence";

  return (
    <motion.div
      initial={{ opacity:0, y:16 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.45, ease:[0.16,1,0.3,1] }}
      style={{ background:"#fff", border:"1px solid #E8ECF0", borderRadius:16, padding:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <SectionTitle>Community Rating</SectionTitle>
        <Badge type={confType}>{confLabel}</Badge>
      </div>

      <div style={{ display:"flex", gap:24, alignItems:"flex-start", flexWrap:"wrap", marginBottom:20 }}>
        {/* Big score */}
        <motion.div
          initial={{ scale:0.5, opacity:0 }}
          animate={{ scale:1, opacity:1 }}
          transition={{ type:"spring", stiffness:300, damping:20, delay:0.15 }}
          style={{ textAlign:"center", minWidth:90 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:52, fontWeight:800,
                        color:"#F59E0B", lineHeight:1 }}>
            {average_rating?.toFixed(1)}
          </div>
          <div style={{ display:"flex", justifyContent:"center", gap:2, margin:"6px 0" }}>
            {[1,2,3,4,5].map(s => (
              <motion.span key={s}
                initial={{ opacity:0, scale:0 }}
                animate={{ opacity:1, scale:1 }}
                transition={{ type:"spring", stiffness:400, damping:15, delay:0.2 + s*0.06 }}
                style={{ color: s <= Math.round(average_rating) ? "#F59E0B" : "#E2E8F0", fontSize:18 }}>
                ★
              </motion.span>
            ))}
          </div>
          <div style={{ fontSize:12, color:C.textMuted }}>
            {total_reviews} review{total_reviews !== 1 ? "s" : ""}
          </div>
        </motion.div>

        {/* Distribution bars */}
        <div style={{ flex:1, minWidth:160 }}>
          {[5,4,3,2,1].map(s => (
            <StarRow key={s} star={s} count={distribution?.[String(s)] ?? 0} total={total_reviews} />
          ))}
        </div>
      </div>

      {/* Positive / negative split */}
      {(positive_pct != null || negative_pct != null) && (
        <motion.div
          variants={staggerContainer(0.1, 0.3)}
          initial="hidden" animate="visible"
          style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          <motion.div variants={staggerItem}
            style={{ background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",
                     border:"1px solid #6EE7B7", borderRadius:12,
                     padding:"12px 16px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:800, color:C.safe }}>{positive_pct}%</div>
            <div style={{ fontSize:12, color:"#047857" }}>Positive ({positive_count})</div>
          </motion.div>
          <motion.div variants={staggerItem}
            style={{ background:"linear-gradient(135deg,#FEF2F2,#FEE2E2)",
                     border:"1px solid #FCA5A5", borderRadius:12,
                     padding:"12px 16px", textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:800, color:C.danger }}>{negative_pct}%</div>
            <div style={{ fontSize:12, color:"#991B1B" }}>Negative ({negative_count})</div>
          </motion.div>
        </motion.div>
      )}

      {onWriteReview && (
        <motion.button
          whileHover={{ scale:1.01, boxShadow:"0 4px 16px rgba(0,0,0,0.12)" }}
          whileTap={{ scale:0.98 }}
          onClick={onWriteReview}
          style={{ width:"100%", background:C.dark, color:"#fff", border:"none",
                   padding:"12px", borderRadius:10, fontSize:14, fontWeight:600,
                   cursor:"pointer", fontFamily:"inherit" }}>
          ★ Write a review
        </motion.button>
      )}
    </motion.div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize:13, fontWeight:700, color:C.textSub,
                  textTransform:"uppercase", letterSpacing:"0.06em" }}>
      {children}
    </div>
  );
}
