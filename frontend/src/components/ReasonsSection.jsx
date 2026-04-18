import { motion, AnimatePresence } from "framer-motion";
import { C } from "../design/tokens.js";
import { EmptyState } from "./EmptyState.jsx";
import { staggerContainer, staggerItem } from "../design/motion.js";

const REASON_ICONS = {
  domain:    { icon:"🗓", color:"#F97316", bg:"#FFF7ED", border:"#FDBA74" },
  blacklist: { icon:"🚫", color:"#EF4444", bg:"#FEF2F2", border:"#FCA5A5" },
  report:    { icon:"📋", color:"#EF4444", bg:"#FEF2F2", border:"#FCA5A5" },
  contact:   { icon:"📞", color:"#F59E0B", bg:"#FFFBEB", border:"#FCD34D" },
  privacy:   { icon:"🔒", color:"#F59E0B", bg:"#FFFBEB", border:"#FCD34D" },
  content:   { icon:"📄", color:"#F59E0B", bg:"#FFFBEB", border:"#FCD34D" },
  keyword:   { icon:"⚠️", color:"#EF4444", bg:"#FEF2F2", border:"#FCA5A5" },
  rating:    { icon:"⭐", color:"#F97316", bg:"#FFF7ED", border:"#FDBA74" },
  default:   { icon:"🔴", color:"#EF4444", bg:"#FEF2F2", border:"#FCA5A5" },
};

function classify(text) {
  const t = text.toLowerCase();
  if (t.includes("days old") || t.includes("year old") || t.includes("month")) return REASON_ICONS.domain;
  if (t.includes("blacklist") || t.includes("google") || t.includes("threat"))  return REASON_ICONS.blacklist;
  if (t.includes("report"))   return REASON_ICONS.report;
  if (t.includes("contact"))  return REASON_ICONS.contact;
  if (t.includes("privacy") || t.includes("whois")) return REASON_ICONS.privacy;
  if (t.includes("content") || t.includes("about")) return REASON_ICONS.content;
  if (t.includes("phrase") || t.includes("suspicious")) return REASON_ICONS.keyword;
  if (t.includes("rating"))   return REASON_ICONS.rating;
  return REASON_ICONS.default;
}

export function ReasonsSection({ reasons = [], trustScore, confidence, analysisType, sectionTitle }) {
  if (confidence === "none" || analysisType === "no_data") return (
    <div style={{ marginBottom:24 }}>
      <SectionTitle>Risk Analysis</SectionTitle>
      <EmptyState icon="🔍" title="No verified data yet"
        message="Configure WHOIS and Google Safe Browsing API keys to enable automated risk checks. Community reviews will appear here once submitted." />
    </div>
  );

  // Honest label when only technical checks ran
  const isTechnicalOnly = analysisType === "preliminary_technical" || analysisType === "limited_technical";

  if (reasons.length === 0) {
    return trustScore >= 80 ? (
      <motion.div
        initial={{ opacity:0, scale:0.96 }}
        animate={{ opacity:1, scale:1 }}
        transition={{ duration:0.4, ease:[0.16,1,0.3,1] }}
        style={{ marginBottom:24 }}>
        <SectionTitle>Risk Analysis</SectionTitle>
        <div style={{
          background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",
          border:"1px solid #6EE7B7", borderRadius:14,
          padding:"16px 20px", display:"flex", alignItems:"center", gap:14,
        }}>
          <motion.div
            animate={{ scale:[1,1.15,1] }}
            transition={{ duration:0.6, delay:0.3 }}
            style={{ width:44, height:44, borderRadius:12, background:"#10B981",
                     display:"flex", alignItems:"center", justifyContent:"center",
                     fontSize:20, flexShrink:0 }}>✅</motion.div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"#065F46", marginBottom:2 }}>
              No risk signals detected
            </div>
            <div style={{ fontSize:13, color:"#047857" }}>
              Based on domain age, blacklist status, and site content analysis.
            </div>
          </div>
        </div>
      </motion.div>
    ) : null;
  }

  return (
    <div style={{ marginBottom:24 }}>
      <SectionTitle>{sectionTitle || "Why this site scored low"}</SectionTitle>
      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden" animate="visible"
        style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10 }}>
        {reasons.map((reason, i) => {
          const s = classify(reason);
          return (
            <motion.div
              key={i}
              variants={staggerItem}
              whileHover={{ y:-3, boxShadow:`0 8px 24px ${s.border}70`, transition:{ duration:0.2 } }}
              whileTap={{ scale:0.98 }}
              style={{
                background:s.bg, border:`1px solid ${s.border}`,
                borderRadius:12, padding:"14px 16px",
                display:"flex", alignItems:"flex-start", gap:12,
                cursor:"default",
              }}>
              <motion.div
                initial={{ rotate:-10, scale:0.8 }}
                animate={{ rotate:0, scale:1 }}
                transition={{ type:"spring", stiffness:400, damping:15, delay:0.1 + i*0.04 }}
                style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background:"rgba(255,255,255,0.7)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
                }}>
                {s.icon}
              </motion.div>
              <div style={{ fontSize:13, color:s.color, fontWeight:500, lineHeight:1.5 }}>
                {reason}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Honest notice when no community data exists */}
      {isTechnicalOnly && (
        <motion.div
          initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.3 }}
          style={{ marginTop:12, background:"#EFF6FF", border:"1px solid #BFDBFE",
                   borderRadius:10, padding:"10px 14px",
                   display:"flex", alignItems:"flex-start", gap:10 }}>
          <span style={{ fontSize:16, flexShrink:0 }}>ℹ️</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#1D4ED8", marginBottom:2 }}>
              Preliminary technical analysis
            </div>
            <div style={{ fontSize:12, color:"#1E40AF", lineHeight:1.6 }}>
              Based on live technical checks only — domain age, SSL, security headers, and site content.
              No community reviews yet. Results will improve as users submit experiences.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize:13, fontWeight:700, color:C.textSub,
                  textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>
      {children}
    </div>
  );
}
