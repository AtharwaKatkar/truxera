import { motion } from "framer-motion";
import { C } from "../design/tokens.js";
import { Badge } from "./Badge.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { staggerContainer, staggerItem } from "../design/motion.js";

const CATS = {
  job_portal:       { label:"Fake Job Portal",    icon:"💼" },
  online_shopping:  { label:"Online Shopping",    icon:"🛒" },
  education:        { label:"Fake Education",     icon:"🎓" },
  investment:       { label:"Investment Fraud",   icon:"📈" },
  visa_immigration: { label:"Visa / Immigration", icon:"✈️" },
  freelance:        { label:"Freelance Scam",     icon:"💻" },
  loan:             { label:"Fake Loan",          icon:"🏦" },
  astrology:        { label:"Astrology Scam",     icon:"🔮" },
  other:            { label:"Other",              icon:"❓" },
};

function ago(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d/3600000), dy = Math.floor(d/86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
}

function inr(n) {
  if (!n) return null;
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n/1000).toFixed(1)}K`;
  return `₹${n}`;
}

export function CommunityReports({ communityData = {}, onReport, domain }) {
  const reports    = communityData.recent_reports || [];
  const totalCount = communityData.reports_count  || 0;

  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.textSub,
                      textTransform:"uppercase", letterSpacing:"0.06em" }}>
          Scam Reports
        </div>
        {totalCount > 0
          ? <Badge type="danger" dot>{totalCount} report{totalCount !== 1 ? "s" : ""}</Badge>
          : <Badge type="nodata">No reports yet</Badge>}
      </div>

      {reports.length > 0 ? (
        <motion.div
          variants={staggerContainer(0.07)}
          initial="hidden" animate="visible"
          style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {reports.slice(0,3).map((r, i) => {
            const cat = CATS[r.scam_category] || CATS.other;
            const amt = inr(r.amount_paid);
            return (
              <motion.div
                key={r.id || i}
                variants={staggerItem}
                whileHover={{ y:-2, borderColor:"#CBD5E1", boxShadow:"0 6px 20px rgba(0,0,0,0.07)" }}
                style={{
                  background:"#fff", border:`1px solid ${C.border}`, borderRadius:12,
                  padding:"14px 16px", display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", gap:12,
                }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, flexWrap:"wrap" }}>
                    <span style={{ fontSize:12, padding:"2px 9px", borderRadius:99,
                                   background:"#F1F5F9", color:C.textSub, fontWeight:500 }}>
                      {cat.icon} {cat.label}
                    </span>
                    <Badge type="pending">Pending review</Badge>
                  </div>
                  <p style={{ fontSize:14, fontWeight:500, color:C.text, lineHeight:1.45, marginBottom:6 }}>
                    {r.title}
                  </p>
                  <div style={{ fontSize:11, color:C.textMuted }}>
                    {ago(r.created_at)}{r.is_anonymous && " · Anonymous"}
                  </div>
                </div>
                {amt && (
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:C.danger }}>{amt}</div>
                    <div style={{ fontSize:10, color:C.textMuted }}>reported lost</div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState icon="📋" title="No scam reports yet"
          message="Be the first to report if you've been affected by this website."
          action={{ label:"Report this site", onClick:() => onReport(domain) }} />
      )}
    </div>
  );
}
