/**
 * SitePage — /site/:domain
 * SEO-friendly public result page for any domain.
 * Fetches real data, renders full trust result.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { C, LEVEL_TOKENS } from "../design/tokens.js";
import { GlobalStyles } from "../design/GlobalStyles.jsx";
import { TrustSummary } from "../components/TrustSummary.jsx";
import { ReasonsSection } from "../components/ReasonsSection.jsx";
import { VerifiedChecks } from "../components/VerifiedChecks.jsx";
import { RatingCard } from "../components/RatingCard.jsx";
import { ReviewList } from "../components/ReviewList.jsx";
import { CommunityReports } from "../components/CommunityReports.jsx";
import { ShareButtons } from "../components/ShareButtons.jsx";
import { ResultSkeleton } from "../components/Skeleton.jsx";

const API = "";

function getDomain() {
  // Works for /site/example.com
  const parts = window.location.pathname.split("/site/");
  return parts[1] ? decodeURIComponent(parts[1].split("/")[0]) : null;
}

export default function SitePage() {
  const domain = getDomain();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!domain) { setError("No domain specified"); setLoading(false); return; }

    // Update page title + meta for SEO
    document.title = `${domain} — Trust Score | Truxera`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content",
      `Is ${domain} safe? Check the trust score, community reviews, and scam reports on Truxera.`);

    const token = localStorage.getItem("truxera_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API}/website/${encodeURIComponent(domain)}`, { headers })
      .then(r => r.json())
      .then(d => {
        if (d.detail) throw new Error(d.detail);
        setResult(d);
      })
      .catch(e => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [domain]);

  const lv = result ? (LEVEL_TOKENS[result.trust_level] || LEVEL_TOKENS.caution) : null;

  return (
    <div style={{ fontFamily: "'Inter','DM Sans',sans-serif", background: C.bg,
                  minHeight: "100vh", color: C.text }}>
      <GlobalStyles />

      {/* Mini nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(12px)", padding: "0 24px", height: 56,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8,
                              textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, background: C.red, borderRadius: 7,
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L9 5.5H13.5L9.5 8.5L11 13L7 10L3 13L4.5 8.5L0.5 5.5H5L7 1Z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800,
                         color: C.text }}>TRUXERA</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: C.textSub, textDecoration: "none" }}>
          ← Check another site
        </a>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>

        {loading && <ResultSkeleton />}

        {error && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>
              Could not load result
            </div>
            <div style={{ fontSize: 14, color: C.textMuted }}>{error}</div>
            <a href="/" style={{ display: "inline-block", marginTop: 20,
                                  background: C.red, color: "#fff", padding: "10px 24px",
                                  borderRadius: 10, textDecoration: "none",
                                  fontSize: 14, fontWeight: 600 }}>
              Try again →
            </a>
          </div>
        )}

        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

            {/* Page heading */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(22px,4vw,32px)",
                           fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 6 }}>
                Is <span style={{ color: lv?.color }}>{domain}</span> safe?
              </h1>
              <p style={{ fontSize: 15, color: C.textSub }}>
                Trust analysis based on technical checks and community reports.
              </p>
            </div>

            {/* Result card */}
            <div style={{ background: "#fff", border: `1.5px solid ${lv?.border}`,
                          borderRadius: 24, padding: 28,
                          boxShadow: `0 0 0 4px ${lv?.glow}, 0 20px 60px rgba(0,0,0,0.07)`,
                          marginBottom: 24 }}>
              <TrustSummary result={result} />
              <div style={{ height: 1, background: "#F1F5F9", margin: "20px 0" }} />
              <ReasonsSection reasons={result.reasons} trustScore={result.trust_score}
                              confidence={result.confidence} />
              <VerifiedChecks checks={result.verified_checks}
                              availability={result.data_availability} />
              <ShareButtons domain={domain} trustScore={result.trust_score}
                            trustLevel={result.trust_level} />
            </div>

            {/* Rating */}
            <div style={{ marginBottom: 24 }}>
              <RatingCard summary={result.rating_summary} />
            </div>

            {/* Reviews */}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`,
                          borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <ReviewList domain={domain} />
            </div>

            {/* Reports */}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`,
                          borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <CommunityReports communityData={result.community_data}
                                onReport={() => window.location.href = "/"}
                                domain={domain} />
            </div>

            {/* CTA */}
            <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5",
                          borderRadius: 16, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#991B1B", marginBottom: 8 }}>
                Have experience with {domain}?
              </div>
              <p style={{ fontSize: 13, color: "#7F1D1D", marginBottom: 16 }}>
                Your report or review helps thousands of others stay safe.
              </p>
              <a href={`/?check=${domain}`} style={{
                display: "inline-block", background: C.red, color: "#fff",
                padding: "11px 28px", borderRadius: 10, textDecoration: "none",
                fontSize: 14, fontWeight: 600,
              }}>
                Report or review this site →
              </a>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "20px 24px",
                    textAlign: "center", marginTop: 40 }}>
        <p style={{ fontSize: 12, color: C.textMuted }}>
          <a href="/" style={{ color: C.red, textDecoration: "none", fontWeight: 600 }}>TRUXERA</a>
          {" "}— Website trust intelligence for India. All data is real and community-sourced.
        </p>
      </div>
    </div>
  );
}
