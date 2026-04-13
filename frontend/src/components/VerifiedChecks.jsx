import { motion } from "framer-motion";
import { C } from "../design/tokens.js";
import { staggerContainer, staggerItem } from "../design/motion.js";

const STATUS = {
  good:    { bg:"#ECFDF5", border:"#6EE7B7", color:"#059669" },
  bad:     { bg:"#FEF2F2", border:"#FCA5A5", color:"#DC2626" },
  warn:    { bg:"#FFFBEB", border:"#FCD34D", color:"#D97706" },
  neutral: { bg:"#F8FAFC", border:"#E2E8F0", color:"#64748B" },
};

export function VerifiedChecks({ checks = {}, availability = {} }) {
  if (!Object.keys(checks).length) return null;

  const items = [];

  if (availability.whois) {
    if (checks.domain_age_days != null) {
      const old = checks.domain_age_days >= 365;
      items.push({ icon:"🗓", label:"Domain age",
        value:`${checks.domain_age_days} days`,
        status: old ? "good" : checks.domain_age_days < 180 ? "bad" : "warn" });
    } else {
      items.push({ icon:"🗓", label:"Domain age", value:"Not available", status:"neutral" });
    }
    if (checks.registrar)
      items.push({ icon:"🏢", label:"Registrar", value:checks.registrar, status:"neutral" });
    if (checks.whois_private)
      items.push({ icon:"🔒", label:"WHOIS privacy", value:"Owner hidden", status:"warn" });
  }

  if (checks.google_safe_browsing_checked === true) {
    items.push({
      icon: checks.google_safe_browsing_flagged ? "🚫" : "✅",
      label:"Google Safe Browsing",
      value: checks.google_safe_browsing_flagged ? "Blacklisted" : "Clean",
      status: checks.google_safe_browsing_flagged ? "bad" : "good",
    });
  } else {
    items.push({ icon:"🔍", label:"Google Safe Browsing", value:"Not checked", status:"neutral" });
  }

  if (checks.scrape_available) {
    items.push(
      { icon: checks.has_contact_page ? "✅" : "❌", label:"Contact page",
        value: checks.has_contact_page ? "Found" : "Missing",
        status: checks.has_contact_page ? "good" : "warn" },
      { icon: checks.has_privacy_page ? "✅" : "❌", label:"Privacy policy",
        value: checks.has_privacy_page ? "Found" : "Missing",
        status: checks.has_privacy_page ? "good" : "warn" },
    );
    if (checks.site_title)
      items.push({ icon:"📄", label:"Site title", value:checks.site_title.slice(0,40), status:"neutral" });
  }

  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:13, fontWeight:700, color:C.textSub,
                    textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>
        Verified Checks
      </div>
      <motion.div
        variants={staggerContainer(0.05, 0.1)}
        initial="hidden" animate="visible"
        style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {items.map(({ icon, label, value, status }, i) => {
          const s = STATUS[status];
          return (
            <motion.div
              key={i}
              variants={staggerItem}
              whileHover={{ y:-2, boxShadow:`0 4px 14px ${s.border}80`, transition:{ duration:0.15 } }}
              style={{
                display:"inline-flex", alignItems:"center", gap:8,
                background:s.bg, border:`1px solid ${s.border}`,
                borderRadius:10, padding:"8px 14px",
              }}>
              <span style={{ fontSize:14 }}>{icon}</span>
              <div>
                <div style={{ fontSize:10, color:C.textMuted, fontWeight:600,
                              textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  {label}
                </div>
                <div style={{ fontSize:12, fontWeight:600, color:s.color }}>{value}</div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
