import { motion } from "framer-motion";
import { C } from "../design/tokens.js";
import { staggerContainer, staggerItem } from "../design/motion.js";

const STATUS = {
  good:    { bg:"#ECFDF5", border:"#6EE7B7", color:"#059669" },
  bad:     { bg:"#FEF2F2", border:"#FCA5A5", color:"#DC2626" },
  warn:    { bg:"#FFFBEB", border:"#FCD34D", color:"#D97706" },
  neutral: { bg:"#F8FAFC", border:"#E2E8F0", color:"#64748B" },
};

function CheckPill({ icon, label, value, status }) {
  const s = STATUS[status] || STATUS.neutral;
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y:-2, boxShadow:`0 4px 12px ${s.border}80` }}
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
}

export function VerifiedChecks({ checks = {}, availability = {}, technicalAnalysis = {} }) {
  if (!Object.keys(checks).length && !Object.keys(technicalAnalysis).length) return null;

  const items = [];

  // ── DNS ───────────────────────────────────────────────
  const dns = technicalAnalysis?.dns || {};
  if (dns.resolves === true) {
    items.push({ icon:"🌐", label:"DNS", value:"Resolves", status:"good" });
  } else if (dns.resolves === false) {
    items.push({ icon:"🌐", label:"DNS", value:"Does not resolve", status:"bad" });
  }

  // ── SSL ───────────────────────────────────────────────
  const ssl = technicalAnalysis?.ssl || {};
  if (ssl.has_ssl === true) {
    if (ssl.ssl_valid) {
      const expiry = ssl.ssl_expiry_days;
      const expLabel = expiry != null
        ? expiry < 0   ? `Expired ${Math.abs(expiry)}d ago`
        : expiry < 14  ? `Expires in ${expiry}d`
        : `Valid (${expiry}d left)`
        : "Valid";
      const expStatus = expiry != null && expiry < 0 ? "bad"
        : expiry != null && expiry < 14 ? "warn" : "good";
      items.push({ icon:"🔐", label:"SSL Certificate", value:expLabel, status:expStatus });
      if (ssl.ssl_issuer) {
        items.push({ icon:"🏛️", label:"Issued by", value:ssl.ssl_issuer.slice(0,30), status:"neutral" });
      }
    } else {
      items.push({ icon:"⚠️", label:"SSL Certificate", value:"Invalid / Untrusted", status:"bad" });
    }
  } else if (ssl.has_ssl === false) {
    items.push({ icon:"🔓", label:"SSL / HTTPS", value:"Not detected", status:"bad" });
  }

  // ── HTTPS redirect ────────────────────────────────────
  const http = technicalAnalysis?.http || {};
  if (http.redirects_to_https === true) {
    items.push({ icon:"↪️", label:"HTTPS redirect", value:"HTTP → HTTPS", status:"good" });
  } else if (http.redirects_to_https === false && !http.error) {
    items.push({ icon:"↪️", label:"HTTPS redirect", value:"Not enforced", status:"warn" });
  }

  // ── Response time ─────────────────────────────────────
  if (http.response_time_ms != null) {
    const rt = http.response_time_ms;
    items.push({
      icon:"⚡", label:"Response time",
      value:`${rt}ms`,
      status: rt < 1000 ? "good" : rt < 3000 ? "warn" : "bad",
    });
  }

  // ── WHOIS ─────────────────────────────────────────────
  if (availability.whois) {
    if (checks.domain_age_days != null) {
      const age = checks.domain_age_days;
      items.push({
        icon:"🗓", label:"Domain age",
        value:`${age} days`,
        status: age >= 365 ? "good" : age < 180 ? "bad" : "warn",
      });
    } else {
      items.push({ icon:"🗓", label:"Domain age", value:"Not available", status:"neutral" });
    }
    if (checks.registrar)
      items.push({ icon:"🏢", label:"Registrar", value:checks.registrar.slice(0,30), status:"neutral" });
    if (checks.whois_private)
      items.push({ icon:"🔒", label:"WHOIS privacy", value:"Owner hidden", status:"warn" });
  }

  // ── Google Safe Browsing ──────────────────────────────
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

  // ── Scrape checks ─────────────────────────────────────
  if (checks.scrape_available) {
    items.push(
      { icon: checks.has_contact_page ? "✅" : "❌", label:"Contact page",
        value: checks.has_contact_page ? "Found" : "Missing",
        status: checks.has_contact_page ? "good" : "warn" },
      { icon: checks.has_about_page ? "✅" : "❌", label:"About page",
        value: checks.has_about_page ? "Found" : "Missing",
        status: checks.has_about_page ? "good" : "warn" },
      { icon: checks.has_privacy_page ? "✅" : "❌", label:"Privacy policy",
        value: checks.has_privacy_page ? "Found" : "Missing",
        status: checks.has_privacy_page ? "good" : "warn" },
    );
    if (checks.has_terms_page != null)
      items.push({ icon: checks.has_terms_page ? "✅" : "❌", label:"Terms of service",
        value: checks.has_terms_page ? "Found" : "Missing",
        status: checks.has_terms_page ? "good" : "neutral" });
    if (checks.site_title)
      items.push({ icon:"📄", label:"Site title", value:checks.site_title.slice(0,40), status:"neutral" });
    if (checks.content_length != null)
      items.push({ icon:"📝", label:"Content",
        value: checks.content_length < 200 ? "Very thin" : checks.content_length < 800 ? "Minimal" : "Present",
        status: checks.content_length < 200 ? "bad" : checks.content_length < 800 ? "warn" : "good" });
  }

  if (!items.length) return null;

  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:13, fontWeight:700, color:C.textSub,
                    textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>
        Verified Checks
      </div>
      <motion.div
        variants={staggerContainer(0.04, 0.1)}
        initial="hidden" animate="visible"
        style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {items.map((item, i) => (
          <CheckPill key={i} {...item} />
        ))}
      </motion.div>
    </div>
  );
}
