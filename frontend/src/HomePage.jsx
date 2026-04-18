import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalStyles } from "./design/GlobalStyles.jsx";
import { C, LEVEL_TOKENS } from "./design/tokens.js";
import {
  heroBadge, heroTitle, heroSub, heroSearch,
  resultCard, modalOverlay, modalPanel,
  staggerContainer, staggerItem, tabContent,
  buttonHover, cardHover,
} from "./design/motion.js";
import { Badge } from "./components/Badge.jsx";
import { CardSkeleton, ResultSkeleton } from "./components/Skeleton.jsx";
import { EmptyState } from "./components/EmptyState.jsx";
import { TrustSummary } from "./components/TrustSummary.jsx";
import { ReasonsSection } from "./components/ReasonsSection.jsx";
import { VerifiedChecks } from "./components/VerifiedChecks.jsx";
import { CommunityReports } from "./components/CommunityReports.jsx";
import { RatingCard } from "./components/RatingCard.jsx";
import { ReviewList } from "./components/ReviewList.jsx";
import { ReviewForm } from "./components/ReviewForm.jsx";

const API = "";

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
  if (n == null || n === 0) return null;
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n/1000).toFixed(1)}K`;
  return `₹${n}`;
}

// ── REPORT MODAL ──────────────────────────────────────────
function ReportModal({ onClose, defaultDomain = "" }) {
  const [form, setForm] = useState({
    domain: defaultDomain, title: "", description: "",
    amount_paid: "", scam_category: "other", is_anonymous: false,
  });
  const [status, setStatus] = useState("idle");
  const [errMsg, setErrMsg] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.domain.trim() || !form.title.trim() || !form.description.trim()) {
      setErrMsg("Please fill in domain, title and description."); return;
    }
    setStatus("loading"); setErrMsg("");
    try {
      const res = await fetch(`${API}/report`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          domain: form.domain.trim(), title: form.title.trim(),
          description: form.description.trim(),
          amount_paid: form.amount_paid ? parseFloat(form.amount_paid) : null,
          scam_category: form.scam_category, is_anonymous: form.is_anonymous,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setStatus("success");
    } catch (err) {
      setErrMsg(err.message || "Something went wrong.");
      setStatus("error");
    }
  }

  const inp = {
    border:`1.5px solid ${C.border}`, borderRadius:10, padding:"10px 14px",
    fontSize:14, fontFamily:"inherit", outline:"none", width:"100%",
    background:"#fff", color:C.text, transition:"border-color 0.2s",
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.7)",
                  backdropFilter:"blur(4px)", zIndex:300,
                  display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
         onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, padding:32, width:"100%",
                    maxWidth:520, maxHeight:"92vh", overflowY:"auto",
                    boxShadow:"0 24px 80px rgba(0,0,0,0.2)" }}
           onClick={e => e.stopPropagation()} className="scale-in">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800 }}>
            🚨 Report a scam
          </div>
          <button onClick={onClose} style={{
            background:"#F1F5F9", border:"none", borderRadius:8,
            width:32, height:32, cursor:"pointer", fontSize:16,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>✕</button>
        </div>

        {status === "success" ? (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, marginBottom:8 }}>
              Report submitted!
            </div>
            <p style={{ color:C.textMuted, fontSize:14, lineHeight:1.6, marginBottom:24 }}>
              Thank you. Your report will be reviewed and published after verification.
            </p>
            <button onClick={onClose} style={{
              background:C.red, color:"#fff", border:"none",
              padding:"12px 32px", borderRadius:10, fontSize:14, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit",
            }}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {[
              { label:"Website domain *", key:"domain", placeholder:"e.g. quickjobs247.in" },
              { label:"Short title *",    key:"title",  placeholder:"e.g. Paid ₹5000, never received the product" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                                display:"block", marginBottom:6 }}>{label}</label>
                <input style={inp} value={form[key]}
                       onChange={e => set(key, e.target.value)} placeholder={placeholder}
                       onFocus={e => e.target.style.borderColor=C.red}
                       onBlur={e => e.target.style.borderColor=C.border} />
              </div>
            ))}
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                              display:"block", marginBottom:6 }}>Category *</label>
              <select style={inp} value={form.scam_category}
                      onChange={e => set("scam_category", e.target.value)}>
                {Object.entries(CATS).map(([k,v]) =>
                  <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                              display:"block", marginBottom:6 }}>Full story *</label>
              <textarea rows={4} style={{ ...inp, resize:"vertical" }}
                        value={form.description}
                        onChange={e => set("description", e.target.value)}
                        placeholder="Describe what happened in detail..."
                        onFocus={e => e.target.style.borderColor=C.red}
                        onBlur={e => e.target.style.borderColor=C.border} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                              display:"block", marginBottom:6 }}>Amount lost (₹) — optional</label>
              <input type="number" style={inp} value={form.amount_paid}
                     onChange={e => set("amount_paid", e.target.value)}
                     placeholder="e.g. 5000" min="0"
                     onFocus={e => e.target.style.borderColor=C.red}
                     onBlur={e => e.target.style.borderColor=C.border} />
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
              <input type="checkbox" checked={form.is_anonymous}
                     onChange={e => set("is_anonymous", e.target.checked)}
                     style={{ width:16, height:16, accentColor:C.red }} />
              <span style={{ fontSize:13, color:C.textSub }}>Submit anonymously</span>
            </label>
            {errMsg && (
              <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5",
                            borderRadius:8, padding:"10px 14px", fontSize:13, color:C.danger }}>
                {errMsg}
              </div>
            )}
            <button type="submit" disabled={status==="loading"} style={{
              background: status==="loading" ? C.textMuted : C.red,
              color:"#fff", border:"none", padding:"13px", borderRadius:10,
              fontSize:15, fontWeight:600,
              cursor: status==="loading" ? "not-allowed" : "pointer",
              fontFamily:"inherit", boxShadow:`0 4px 14px ${C.redGlow}`,
            }}>
              {status==="loading" ? "Submitting…" : "Submit report →"}
            </button>
            <p style={{ fontSize:12, color:C.textMuted, textAlign:"center" }}>
              Reports are reviewed before publishing. False reports are removed.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// ── SEARCH LIMIT MODAL ────────────────────────────────────
function SearchLimitModal({ onClose, onSignIn, onSignUp }) {
  return (
    <motion.div
      variants={modalOverlay} initial="hidden" animate="visible" exit="exit"
      style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.75)",
                backdropFilter:"blur(6px)", zIndex:300,
                display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}>
      <motion.div
        variants={modalPanel} initial="hidden" animate="visible" exit="exit"
        style={{ background:"#fff", borderRadius:22, padding:36, width:"100%",
                  maxWidth:420, textAlign:"center",
                  boxShadow:"0 28px 80px rgba(0,0,0,0.22)" }}
        onClick={e => e.stopPropagation()}>

        {/* Icon */}
        <motion.div
          animate={{ rotate:[0,10,-10,0], scale:[1,1.1,1] }}
          transition={{ duration:0.6, delay:0.2 }}
          style={{ fontSize:52, marginBottom:16 }}>🔒</motion.div>

        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800,
                      marginBottom:10 }}>
          Sign in to continue
        </div>
        <p style={{ fontSize:15, color:C.textSub, lineHeight:1.65, marginBottom:8 }}>
          You've used your <strong>2 free searches</strong>.
        </p>
        <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.6, marginBottom:28 }}>
          Create a free account for <strong>unlimited searches</strong>, review submissions,
          and scam reports.
        </p>

        {/* Perks */}
        <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:14,
                      padding:"14px 18px", marginBottom:24, textAlign:"left" }}>
          {[
            "✅ Unlimited website checks",
            "📋 Submit scam reports",
            "⭐ Write and read reviews",
            "🔔 Get alerts on watched sites",
          ].map(item => (
            <div key={item} style={{ fontSize:13, color:C.textSub, padding:"4px 0",
                                     fontWeight:500 }}>{item}</div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", gap:10 }}>
          <motion.button
            whileHover={{ scale:1.02, boxShadow:`0 6px 20px ${C.redGlow}` }}
            whileTap={{ scale:0.97 }}
            onClick={onSignIn}
            style={{ flex:1, background:C.red, color:"#fff", border:"none",
                     padding:"13px", borderRadius:11, fontSize:14, fontWeight:700,
                     cursor:"pointer", fontFamily:"inherit",
                     boxShadow:`0 4px 12px ${C.redGlow}` }}>
            Sign in
          </motion.button>
          <motion.button
            whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
            onClick={onSignUp}
            style={{ flex:1, background:C.dark, color:"#fff", border:"none",
                     padding:"13px", borderRadius:11, fontSize:14, fontWeight:700,
                     cursor:"pointer", fontFamily:"inherit" }}>
            Sign up free
          </motion.button>
        </div>

        <button onClick={onClose}
                style={{ marginTop:14, background:"none", border:"none",
                         fontSize:13, color:C.textMuted, cursor:"pointer",
                         fontFamily:"inherit" }}>
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── SIGN IN MODAL ─────────────────────────────────────────
function SignInModal({ onClose, onSuccess }) {
  const [mode, setMode]       = useState("login");   // "login" | "register"
  const [form, setForm]       = useState({ email:"", password:"", username:"" });
  const [status, setStatus]   = useState("idle");
  const [errMsg, setErrMsg]   = useState("");
  const [token, setToken]     = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setErrMsg("Please fill in all required fields."); return;
    }
    setStatus("loading"); setErrMsg("");
    try {
      let res, data;
      if (mode === "register") {
        res  = await fetch(`${API}/auth/register`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ email:form.email, password:form.password,
                                  username:form.username||null }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Registration failed");
      } else {
        const fd = new FormData();
        fd.append("username", form.email);
        fd.append("password", form.password);
        res  = await fetch(`${API}/auth/login`, { method:"POST", body:fd });
        data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Login failed");
      }
      setToken(data.access_token);
      localStorage.setItem("truxera_token", data.access_token);
      localStorage.setItem("truxera_email", form.email);
      setStatus("success");
      if (onSuccess) setTimeout(() => onSuccess(form.email), 1800);
    } catch (err) {
      setErrMsg(err.message || "Something went wrong.");
      setStatus("error");
    }
  }

  const inp = {
    border:`1.5px solid ${C.border}`, borderRadius:10, padding:"11px 14px",
    fontSize:14, fontFamily:"inherit", outline:"none", width:"100%",
    background:"#fff", color:C.text, transition:"border-color 0.2s",
  };

  return (
    <motion.div
      variants={modalOverlay} initial="hidden" animate="visible" exit="exit"
      style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.7)",
                backdropFilter:"blur(4px)", zIndex:300,
                display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}>
      <motion.div
        variants={modalPanel} initial="hidden" animate="visible" exit="exit"
        style={{ background:"#fff", borderRadius:20, padding:32, width:"100%",
                  maxWidth:440, boxShadow:"0 24px 80px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800 }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </div>
            <div style={{ fontSize:13, color:C.textMuted, marginTop:2 }}>
              {mode === "login" ? "Sign in to your Truxera account" : "Join the community"}
            </div>
          </div>
          <button onClick={onClose} style={{
            background:"#F1F5F9", border:"none", borderRadius:8,
            width:32, height:32, cursor:"pointer", fontSize:16,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>✕</button>
        </div>

        {status === "success" ? (
          <motion.div
            initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
            style={{ textAlign:"center", padding:"24px 0" }}>
            <motion.div
              animate={{ scale:[1,1.3,1] }} transition={{ duration:0.5 }}
              style={{ fontSize:48, marginBottom:12 }}>🎉</motion.div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, marginBottom:8 }}>
              {mode === "register" ? "Account created!" : "Signed in!"}
            </div>
            <p style={{ color:C.textMuted, fontSize:14, marginBottom:20 }}>
              You're now logged in to Truxera.
            </p>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
              onClick={onClose} style={{
                background:C.dark, color:"#fff", border:"none",
                padding:"11px 28px", borderRadius:10, fontSize:14, fontWeight:600,
                cursor:"pointer", fontFamily:"inherit",
              }}>Continue →</motion.button>
          </motion.div>
        ) : (
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {mode === "register" && (
              <div>
                <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                                display:"block", marginBottom:6 }}>Username (optional)</label>
                <input style={inp} value={form.username}
                       onChange={e => set("username", e.target.value)}
                       placeholder="e.g. Rahul"
                       onFocus={e => e.target.style.borderColor=C.dark}
                       onBlur={e => e.target.style.borderColor=C.border} />
              </div>
            )}
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                              display:"block", marginBottom:6 }}>Email *</label>
              <input type="email" style={inp} value={form.email}
                     onChange={e => set("email", e.target.value)}
                     placeholder="you@example.com"
                     onFocus={e => e.target.style.borderColor=C.dark}
                     onBlur={e => e.target.style.borderColor=C.border} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                              display:"block", marginBottom:6 }}>Password *</label>
              <input type="password" style={inp} value={form.password}
                     onChange={e => set("password", e.target.value)}
                     placeholder="••••••••"
                     onFocus={e => e.target.style.borderColor=C.dark}
                     onBlur={e => e.target.style.borderColor=C.border} />
            </div>

            <AnimatePresence>
              {errMsg && (
                <motion.div
                  initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                  style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:8,
                            padding:"10px 14px", fontSize:13, color:C.danger }}>
                  {errMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button type="submit" disabled={status==="loading"}
              whileHover={status!=="loading" ? { scale:1.01 } : {}}
              whileTap={status!=="loading" ? { scale:0.98 } : {}}
              style={{ background:status==="loading"?C.textMuted:C.dark,
                       color:"#fff", border:"none", padding:"13px", borderRadius:10,
                       fontSize:15, fontWeight:600,
                       cursor:status==="loading"?"not-allowed":"pointer",
                       fontFamily:"inherit", marginTop:4 }}>
              {status==="loading" ? "Please wait…"
                : mode === "login" ? "Sign in →" : "Create account →"}
            </motion.button>

            <div style={{ textAlign:"center", fontSize:13, color:C.textMuted }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <span style={{ color:C.dark, fontWeight:600, cursor:"pointer" }}
                    onClick={() => { setMode(m => m==="login"?"register":"login"); setErrMsg(""); }}>
                {mode === "login" ? "Sign up" : "Sign in"}
              </span>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── RESULT CARD ───────────────────────────────────────────
function ResultCard({ result, onReport }) {
  const lv = LEVEL_TOKENS[result.trust_level] || LEVEL_TOKENS.caution;
  const [showReviewForm, setShowReviewForm] = useState(false);

  return (
    <div style={{
      background:"#fff",
      border:`1.5px solid ${lv.border}`,
      borderRadius:24, padding:32,
      boxShadow:`0 0 0 4px ${lv.glow}, 0 20px 60px rgba(0,0,0,0.08)`,
    }}>
      <TrustSummary result={result} />

      <div style={{ height:1, background:"#F1F5F9", margin:"24px 0" }} />
      <ReasonsSection reasons={result.reasons} trustScore={result.trust_score}
                      confidence={result.confidence} />
      <VerifiedChecks checks={result.verified_checks} availability={result.data_availability} />

      <div style={{ height:1, background:"#F1F5F9", margin:"24px 0" }} />

      {/* Rating */}
      <div style={{ marginBottom:24 }}>
        <RatingCard summary={result.rating_summary}
                    onWriteReview={() => setShowReviewForm(v => !v)} />
      </div>

      {/* Inline review form */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity:0, height:0, marginBottom:0 }}
            animate={{ opacity:1, height:"auto", marginBottom:24 }}
            exit={{ opacity:0, height:0, marginBottom:0 }}
            transition={{ duration:0.4, ease:[0.16,1,0.3,1] }}
            style={{ overflow:"hidden" }}>
            <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0",
                          borderRadius:16, padding:24 }}>
              <ReviewForm domain={result.domain}
                          onSuccess={() => setShowReviewForm(false)}
                          onCancel={() => setShowReviewForm(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews */}
      <div style={{ marginBottom:24 }}>
        <ReviewList domain={result.domain} onWriteReview={() => setShowReviewForm(true)} />
      </div>

      <CommunityReports communityData={result.community_data}
                        onReport={onReport} domain={result.domain} />

      {/* CTA row */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        <motion.button
          whileHover={{ scale:1.02, boxShadow:`0 8px 24px ${C.redGlow}` }}
          whileTap={{ scale:0.97 }}
          onClick={() => onReport(result.domain)}
          style={{ flex:1, minWidth:160, background:C.red, color:"#fff", border:"none",
                   padding:"14px", borderRadius:12, fontSize:14, fontWeight:600,
                   cursor:"pointer", fontFamily:"inherit",
                   boxShadow:`0 4px 14px ${C.redGlow}` }}>
          🚨 Report a scam
        </motion.button>
        <motion.button
          whileHover={{ scale:1.02, boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}
          whileTap={{ scale:0.97 }}
          onClick={() => setShowReviewForm(v => !v)}
          style={{ flex:1, minWidth:160, background:C.dark, color:"#fff", border:"none",
                   padding:"14px", borderRadius:12, fontSize:14, fontWeight:600,
                   cursor:"pointer", fontFamily:"inherit" }}>
          ★ Write a review
        </motion.button>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────
export default function HomePage() {
  const [query, setQuery]             = useState("");
  const [result, setResult]           = useState(null);
  const [searching, setSearching]     = useState(false);
  const [searchErr, setSearchErr]     = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [searchesLeft, setSearchesLeft]     = useState(null);
  const [tab, setTab]                 = useState("feed");
  const [showModal, setShowModal]     = useState(false);
  const [modalDomain, setModalDomain] = useState("");
  const [showSignIn, setShowSignIn]   = useState(false);
  const [upvoted, setUpvoted]         = useState({});
  const [feed, setFeed]               = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [top, setTop]                 = useState([]);
  const [topLoading, setTopLoading]   = useState(true);
  const [user, setUser]               = useState(() => {
    const t = localStorage.getItem("truxera_token");
    const e = localStorage.getItem("truxera_email");
    return t ? { token:t, email:e } : null;
  });
  const resultRef                     = useRef(null);
  const howItWorksRef                 = useRef(null);

  function handleSignInSuccess(email) {
    const token = localStorage.getItem("truxera_token");
    setUser({ token, email });
    setSearchesLeft(null);
    setShowSignIn(false);
  }

  function handleSignOut() {
    localStorage.removeItem("truxera_token");
    localStorage.removeItem("truxera_email");
    setUser(null);
  }

  useEffect(() => {
    fetch(`${API}/reports/recent?limit=20`)
      .then(r => r.json()).then(d => setFeed(Array.isArray(d) ? d : []))
      .catch(() => setFeed([])).finally(() => setFeedLoading(false));
    fetch(`${API}/websites/top?limit=5`)
      .then(r => r.json()).then(d => setTop(Array.isArray(d) ? d : []))
      .catch(() => setTop([])).finally(() => setTopLoading(false));
  }, []);

  async function search(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setResult(null); setSearchErr("");
    try {
      const token = localStorage.getItem("truxera_token");
      const headers = token ? { "Authorization": `Bearer ${token}` } : {};
      const res  = await fetch(`${API}/website/${encodeURIComponent(query.trim())}`,
                               { headers });
      const data = await res.json();

      // Guest limit reached
      if (res.status === 429 && data.detail?.error === "LOGIN_REQUIRED") {
        setShowLimitModal(true);
        setSearchesLeft(0);
        return;
      }

      if (!res.ok) throw new Error(data.detail || "Check failed");
      setResult(data);

      // Update remaining count from response
      if (data.searches_remaining !== undefined) {
        setSearchesLeft(data.searches_remaining);
      }
    } catch (err) {
      if (err.message !== "Check failed")
        setSearchErr(err.message || "Could not check this website. Please try again.");
    } finally {
      setSearching(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 150);
    }
  }

  async function upvote(id) {
    if (upvoted[id]) return;
    setUpvoted(u => ({ ...u, [id]: true }));
    setFeed(f => f.map(r => r.id === id ? { ...r, upvotes:(r.upvotes||0)+1 } : r));
    try { await fetch(`${API}/report/${id}/upvote`, { method:"POST" }); } catch {}
  }

  function openReport(domain = "") { setModalDomain(domain); setShowModal(true); }

  // ── Btn helper ──
  const Btn = ({ children, onClick, variant="primary", style={} }) => {
    const base = {
      border:"none", padding:"11px 22px", borderRadius:10, fontSize:14,
      fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
    };
    const variants = {
      primary: { background:C.red, color:"#fff", boxShadow:`0 4px 12px ${C.redGlow}` },
      dark:    { background:C.dark, color:"#fff" },
      ghost:   { background:"transparent", color:C.textSub, border:`1.5px solid ${C.border}` },
    };
    return (
      <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}
              onMouseEnter={e => e.currentTarget.style.opacity="0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}>
        {children}
      </button>
    );
  };

  return (
    <div style={{ fontFamily:"'Inter','DM Sans',sans-serif", background:C.bg,
                  minHeight:"100vh", color:C.text }}>
      <GlobalStyles />

      {/* ── NAV ── */}
      <nav style={{
        borderBottom:`1px solid ${C.border}`, background:"rgba(255,255,255,0.85)",
        backdropFilter:"blur(12px)", padding:"0 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        height:60, position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:32, height:32,
            background:`linear-gradient(135deg, ${C.red}, ${C.redDark})`,
            borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 4px 12px ${C.redGlow}`,
          }}>
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L9 5.5H13.5L9.5 8.5L11 13L7 10L3 13L4.5 8.5L0.5 5.5H5L7 1Z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800,
                         letterSpacing:"-0.5px" }}>TRUXERA</span>
          <span style={{ background:"#FEF2F2", color:C.danger, fontSize:10, fontWeight:700,
                         padding:"2px 7px", borderRadius:5, letterSpacing:"0.5px" }}>INDIA</span>
        </div>
        <div className="hide-mobile" style={{ display:"flex", alignItems:"center", gap:24 }}>
          <span style={{ fontSize:14, fontWeight:500, color:C.textSub, cursor:"pointer",
                         transition:"color 0.15s" }}
                onClick={() => howItWorksRef.current?.scrollIntoView({ behavior:"smooth", block:"start" })}
                onMouseEnter={e => e.currentTarget.style.color=C.text}
                onMouseLeave={e => e.currentTarget.style.color=C.textSub}>
            How it works
          </span>
          <span style={{ fontSize:14, fontWeight:500, color:C.textSub, cursor:"pointer",
                         transition:"color 0.15s" }}
                onClick={() => openReport()}
                onMouseEnter={e => e.currentTarget.style.color=C.text}
                onMouseLeave={e => e.currentTarget.style.color=C.textSub}>
            Report a scam
          </span>
          {user ? (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8,
                            background:"#F1F5F9", borderRadius:99, padding:"6px 14px" }}>
                <div style={{ width:26, height:26, borderRadius:"50%", background:C.red,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>
                  {(user.email||"U")[0].toUpperCase()}
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:C.text, maxWidth:140,
                               overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user.email}
                </span>
              </div>
              <button onClick={handleSignOut} style={{
                background:"transparent", border:`1.5px solid ${C.border}`,
                padding:"7px 14px", borderRadius:9, fontSize:13, fontWeight:500,
                cursor:"pointer", fontFamily:"inherit", color:C.textSub, transition:"all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=C.danger; e.currentTarget.style.color=C.danger; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.textSub; }}>
                Sign out
              </button>
            </div>
          ) : (
            <Btn variant="dark" style={{ padding:"8px 18px", fontSize:13 }}
                 onClick={() => setShowSignIn(true)}>
              Sign in
            </Btn>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        background:"linear-gradient(160deg, #fff 0%, #F8F9FB 100%)",
        borderBottom:`1px solid ${C.border}`, padding:"72px 24px 60px",
        position:"relative", overflow:"hidden",
      }}>
        {/* Background decoration */}
        <div style={{
          position:"absolute", top:-80, right:-80, width:400, height:400,
          borderRadius:"50%", background:`radial-gradient(circle, ${C.redGlow} 0%, transparent 70%)`,
          pointerEvents:"none",
        }} />
        <div style={{
          position:"absolute", bottom:-60, left:-60, width:300, height:300,
          borderRadius:"50%", background:"radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
          pointerEvents:"none",
        }} />

        <div style={{ maxWidth:680, margin:"0 auto", textAlign:"center", position:"relative" }}>
          <motion.div
            variants={heroBadge} initial="hidden" animate="visible"
            style={{
              display:"inline-flex", alignItems:"center", gap:8,
              background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
              borderRadius:99, padding:"6px 16px", marginBottom:28,
            }}>
            <motion.span
              animate={{ scale:[1,1.4,1] }}
              transition={{ duration:1.5, repeat:Infinity, ease:"easeInOut" }}
              style={{ width:7, height:7, borderRadius:"50%", background:C.danger,
                       display:"inline-block" }} />
            <span style={{ fontSize:13, color:C.danger, fontWeight:600 }}>
              Real data only — no invented scores or fake reports
            </span>
          </motion.div>

          <motion.h1
            variants={heroTitle} initial="hidden" animate="visible"
            style={{
              fontFamily:"'Syne',sans-serif",
              fontSize:"clamp(36px,6vw,60px)", fontWeight:800,
              lineHeight:1.06, letterSpacing:"-2.5px", marginBottom:20,
            }}>
            Check any website.<br />
            <span style={{
              background:`linear-gradient(135deg, ${C.red}, #F97316)`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>Before you pay.</span>
          </motion.h1>

          <motion.p
            variants={heroSub} initial="hidden" animate="visible"
            style={{ fontSize:18, color:C.textSub, lineHeight:1.7, marginBottom:40,
                      maxWidth:500, margin:"0 auto 40px" }}>
            Trust scores from WHOIS, Google Safe Browsing, and verified community reports.
            Every number is real.
          </motion.p>

          {/* Search */}
          <motion.form
            variants={heroSearch} initial="hidden" animate="visible"
            onSubmit={search} style={{
            display:"flex", gap:10, alignItems:"center",
            background:"#fff", border:`2px solid ${C.border}`,
            borderRadius:16, padding:"10px 10px 10px 20px",
            boxShadow:"0 4px 24px rgba(0,0,0,0.08)",
            transition:"border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={e => { e.currentTarget.style.borderColor=C.red; e.currentTarget.style.boxShadow=`0 4px 24px ${C.redGlow}`; }}
          onBlur={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow="0 4px 24px rgba(0,0,0,0.08)"; }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
                 style={{ flexShrink:0, color:C.textMuted }}>
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input value={query} onChange={e => setQuery(e.target.value)}
                   placeholder="Enter website e.g. quickjobs247.in"
                   style={{ flex:1, border:"none", outline:"none", fontSize:16,
                            fontFamily:"inherit", background:"transparent", color:C.text }} />
            <button type="submit" disabled={searching} style={{
              background: searching ? C.textMuted : C.red,
              color:"#fff", border:"none", padding:"12px 28px", borderRadius:10,
              fontSize:15, fontWeight:600, cursor: searching ? "not-allowed" : "pointer",
              fontFamily:"inherit", whiteSpace:"nowrap",
              boxShadow:`0 4px 12px ${C.redGlow}`,
              transition:"all 0.2s",
            }}>
              {searching ? "Checking…" : "Check now →"}
            </button>
          </motion.form>
          <p style={{ marginTop:12, fontSize:13, color:C.textMuted }}>
            Free · No sign-up needed · Results based on real data only
          </p>

          {/* Remaining searches hint — only shown to guests */}
          {searchesLeft !== null && (
            <motion.div
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
              style={{ marginTop:10, display:"inline-flex", alignItems:"center", gap:6,
                       background: searchesLeft === 0 ? "#FEF2F2" : "#FFFBEB",
                       border: `1px solid ${searchesLeft === 0 ? "#FCA5A5" : "#FCD34D"}`,
                       borderRadius:99, padding:"5px 14px", fontSize:13, fontWeight:600,
                       color: searchesLeft === 0 ? C.danger : "#D97706" }}>
              {searchesLeft === 0
                ? "🔒 No free searches left — sign in to continue"
                : `🔍 ${searchesLeft} free search${searchesLeft !== 1 ? "es" : ""} remaining`}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── SKELETON ── */}
      <AnimatePresence>
        {searching && (
          <motion.div key="skeleton"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ maxWidth:860, margin:"32px auto", padding:"0 24px" }}>
            <ResultSkeleton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ERROR ── */}
      <AnimatePresence>
        {searchErr && !searching && (
          <motion.div key="error"
            initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ maxWidth:860, margin:"32px auto", padding:"0 24px" }}>
            <div style={{ background:"#FEF2F2", border:"1.5px solid #FCA5A5", borderRadius:14,
                          padding:"16px 20px", fontSize:14, color:C.danger,
                          display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:20 }}>⚠</span> {searchErr}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RESULT ── */}
      <AnimatePresence>
        {result && !searching && (
          <motion.div key="result"
            ref={resultRef}
            variants={resultCard} initial="hidden" animate="visible"
            style={{ maxWidth:860, margin:"32px auto", padding:"0 24px" }}>
            <ResultCard result={result} onReport={openReport} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HOW IT WORKS ── */}
      <div ref={howItWorksRef} style={{ background:"#fff", borderTop:`1px solid ${C.border}`,
                    borderBottom:`1px solid ${C.border}`, padding:"56px 24px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800,
                          letterSpacing:"-0.5px", marginBottom:8 }}>
              How Truxera works
            </div>
            <p style={{ fontSize:15, color:C.textSub }}>
              Every score is built from real, verifiable signals
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:20 }}>
            {[
              { n:"01", title:"WHOIS lookup",         desc:"Domain registration age and registrar. New domains are flagged as higher risk.", icon:"🗓", color:"#3B82F6" },
              { n:"02", title:"Google Safe Browsing", desc:"Google's threat database — checks for malware, phishing, and social engineering.", icon:"🔍", color:"#10B981" },
              { n:"03", title:"Community reports",    desc:"Verified user reports are the strongest signal. Each is reviewed before affecting the score.", icon:"👥", color:C.red },
            ].map(s => (
              <div key={s.n} style={{
                background:"#F8FAFC", border:`1px solid ${C.border}`,
                borderRadius:16, padding:24, transition:"all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor=C.borderHover; }}
              onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; e.currentTarget.style.borderColor=C.border; }}>
                <div style={{ width:44, height:44, borderRadius:12, marginBottom:16,
                              background:`${s.color}15`, border:`1px solid ${s.color}30`,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:22 }}>
                  {s.icon}
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:s.color,
                              letterSpacing:"1px", marginBottom:6, textTransform:"uppercase" }}>
                  SIGNAL {s.n}
                </div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>{s.title}</div>
                <p style={{ fontSize:13, color:C.textSub, lineHeight:1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"40px 24px",
                    display:"grid", gridTemplateColumns:"1fr 320px",
                    gap:28, alignItems:"start" }}
           className="grid-1-mobile">

        {/* FEED */}
        <div>
          {/* Tabs */}
          <div style={{ display:"flex", gap:4, marginBottom:20,
                        background:"#F1F5F9", borderRadius:12, padding:4 }}>
            {[["feed","Recent reports"],["top","Most reported"]].map(([v,l]) => (
              <button key={v} onClick={() => setTab(v)} style={{
                flex:1, padding:"9px 16px", borderRadius:9, border:"none",
                fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                background: tab===v ? "#fff" : "transparent",
                color: tab===v ? C.text : C.textMuted,
                boxShadow: tab===v ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition:"all 0.2s",
              }}>{l}</button>
            ))}
          </div>

          {tab === "feed" && (
            feedLoading
              ? <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {[1,2,3].map(i => <CardSkeleton key={i} />)}
                </div>
              : feed.length > 0
                ? <motion.div
                    key="feed"
                    variants={staggerContainer(0.06)}
                    initial="hidden" animate="visible"
                    style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {feed.map((r, i) => {
                      const cat = CATS[r.scam_category] || CATS.other;
                      return (
                        <motion.div
                          key={r.id||i}
                          variants={staggerItem}
                          whileHover={{ y:-2, boxShadow:"0 8px 24px rgba(0,0,0,0.08)", borderColor:"#CBD5E1" }}
                          style={{
                            background:"#fff", border:`1px solid ${C.border}`,
                            borderRadius:14, padding:20,
                          }}>
                          <div style={{ display:"flex", alignItems:"flex-start",
                                        justifyContent:"space-between", gap:12, marginBottom:12 }}>
                            <div style={{ flex:1 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8,
                                            marginBottom:8, flexWrap:"wrap" }}>
                                <span style={{ fontSize:12, padding:"3px 10px", borderRadius:99,
                                               background:"#F1F5F9", color:C.textSub, fontWeight:600 }}>
                                  {r.domain}
                                </span>
                                <span style={{ fontSize:12, padding:"3px 10px", borderRadius:99,
                                               background:"#F1F5F9", color:C.textSub, fontWeight:500 }}>
                                  {cat.icon} {cat.label}
                                </span>
                                <Badge type="pending">Pending</Badge>
                              </div>
                              <p style={{ fontSize:14, fontWeight:500, lineHeight:1.45, color:C.text }}>
                                {r.title}
                              </p>
                            </div>
                            {r.amount_paid != null && (
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <div style={{ fontSize:17, fontWeight:800, color:C.danger }}>
                                  {inr(r.amount_paid)}
                                </div>
                                <div style={{ fontSize:10, color:C.textMuted }}>reported lost</div>
                              </div>
                            )}
                          </div>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <span style={{ fontSize:12, color:C.textMuted }}>{ago(r.created_at)}</span>
                            <motion.button
                              whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
                              onClick={() => upvote(r.id)}
                              style={{
                                border:`1.5px solid ${upvoted[r.id] ? "#6EE7B7" : C.border}`,
                                background: upvoted[r.id] ? "#ECFDF5" : "transparent",
                                borderRadius:8, padding:"5px 12px", fontSize:12,
                                cursor: upvoted[r.id] ? "default" : "pointer",
                                color: upvoted[r.id] ? C.safe : C.textSub,
                                fontFamily:"inherit", display:"flex", alignItems:"center", gap:5,
                              }}>
                              👍 {(r.upvotes||0)+(upvoted[r.id]?1:0)} this happened to me
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                : <EmptyState icon="📋" title="No community reports yet"
                    message="Be the first to report a scam website and help protect others in India."
                    action={{ label:"Report a scam", onClick:() => openReport() }} />
          )}

          {tab === "top" && (
            topLoading
              ? <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[1,2,3].map(i => <CardSkeleton key={i} />)}
                </div>
              : top.length > 0
                ? <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {top.map((s, i) => {
                      const lvc = LEVEL_TOKENS[s.trust_level] || LEVEL_TOKENS.dangerous;
                      return (
                        <div key={s.domain} style={{
                          background:"#fff", border:`1px solid ${C.border}`,
                          borderRadius:14, padding:20,
                          display:"flex", alignItems:"center", gap:16,
                          transition:"all 0.2s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor=C.borderHover; e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.07)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow=""; }}>
                          <span style={{ fontSize:22, fontWeight:800, color:"#E2E8F0",
                                         fontFamily:"'Syne',sans-serif", minWidth:36 }}>
                            #{i+1}
                          </span>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8,
                                          marginBottom:8, flexWrap:"wrap" }}>
                              <span style={{ fontSize:14, fontWeight:600 }}>{s.domain}</span>
                              <span style={{ fontSize:11, padding:"2px 9px", borderRadius:99,
                                             background:lvc.bg, color:lvc.color,
                                             border:`1px solid ${lvc.border}`, fontWeight:600 }}>
                                {lvc.icon} {lvc.label}
                              </span>
                            </div>
                            <div style={{ background:"#F1F5F9", borderRadius:99, height:6, overflow:"hidden" }}>
                              <div style={{ height:"100%", borderRadius:99, background:lvc.color,
                                            width:`${s.trust_score??0}%`,
                                            transition:"width 0.8s ease" }} />
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontSize:15, fontWeight:700, color:C.danger }}>
                              {s.reports_count} report{s.reports_count!==1?"s":""}
                            </div>
                            <div style={{ fontSize:11, color:C.textMuted }}>
                              {s.total_loss ? inr(s.total_loss)+" lost" : "Loss data unavailable"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                : <EmptyState icon="📊" title="No sites with community reports yet"
                    message="The leaderboard will populate as users submit verified reports." />
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Report CTA */}
          <div style={{
            background:`linear-gradient(135deg, #FEF2F2, #FEE2E2)`,
            border:`1px solid #FCA5A5`, borderRadius:16, padding:22,
          }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#991B1B", marginBottom:8 }}>
              Been scammed? 😤
            </div>
            <p style={{ fontSize:13, color:"#7F1D1D", lineHeight:1.65, marginBottom:16 }}>
              Your report warns thousands of others. Takes 2 minutes. Stay anonymous if you want.
            </p>
            <button onClick={() => openReport()} style={{
              width:"100%", background:C.red, color:"#fff", border:"none",
              padding:"12px", borderRadius:10, fontSize:14, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit",
              boxShadow:`0 4px 12px ${C.redGlow}`,
              transition:"all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background=C.redDark}
            onMouseLeave={e => e.currentTarget.style.background=C.red}>
              Report a scam →
            </button>
          </div>

          {/* Data promise */}
          <div style={{ background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",
                        border:"1px solid #BFDBFE", borderRadius:16, padding:20 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1D4ED8", marginBottom:8 }}>
              ℹ Our data promise
            </div>
            <p style={{ fontSize:13, color:"#1E40AF", lineHeight:1.65 }}>
              Every score, count, and flag is sourced from a real API call or verified user
              submission. If data is unavailable, we say so — we never invent numbers.
            </p>
          </div>

          {/* Categories */}
          <div style={{ background:"#fff", border:`1px solid ${C.border}`,
                        borderRadius:16, padding:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.textSub,
                          textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>
              Browse by category
            </div>
            {Object.entries(CATS).filter(([k]) => k !== "other").map(([k, v]) => (
              <div key={k} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"9px 0", borderBottom:`1px solid #F8FAFC`, cursor:"pointer",
                transition:"all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.paddingLeft="4px"}
              onMouseLeave={e => e.currentTarget.style.paddingLeft="0"}>
                <span style={{ fontSize:13, color:C.textSub }}>{v.icon} {v.label}</span>
                <Badge type="nodata">No data</Badge>
              </div>
            ))}
          </div>

          {/* Chrome extension */}
          <div style={{ background:`linear-gradient(135deg, ${C.dark}, #1E293B)`,
                        borderRadius:16, padding:22, color:"#fff" }}>
            <div style={{ fontSize:24, marginBottom:10 }}>🧩</div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>Chrome Extension</div>
            <p style={{ fontSize:12, color:"rgba(255,255,255,0.55)", lineHeight:1.65, marginBottom:16 }}>
              Get instant trust scores while browsing. Auto-warns before you pay on any site.
            </p>
            <button style={{
              width:"100%", background:"rgba(255,255,255,0.1)", color:"#fff",
              border:"1px solid rgba(255,255,255,0.15)", padding:"10px", borderRadius:9,
              fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit",
              transition:"all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.1)"}>
              Coming soon — Join waitlist
            </button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop:`1px solid ${C.border}`, background:"#fff",
                    padding:"32px 24px", marginTop:40 }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex",
                      justifyContent:"space-between", alignItems:"center",
                      flexWrap:"wrap", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, background:C.red, borderRadius:7,
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L9 5.5H13.5L9.5 8.5L11 13L7 10L3 13L4.5 8.5L0.5 5.5H5L7 1Z" fill="white"/>
              </svg>
            </div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800 }}>
              TRUXERA
            </span>
            <span style={{ fontSize:12, color:C.textMuted }}>— honest data, always</span>
          </div>
          <div style={{ display:"flex", gap:20 }}>
            {["Privacy","Terms","Report abuse","API"].map(l => (
              <span key={l} style={{ fontSize:13, color:C.textMuted, cursor:"pointer",
                                     transition:"color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.color=C.text}
                    onMouseLeave={e => e.currentTarget.style.color=C.textMuted}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

    <AnimatePresence>
      {showModal && (
        <motion.div
          variants={modalOverlay} initial="hidden" animate="visible" exit="exit"
          style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.7)",
                    backdropFilter:"blur(4px)", zIndex:300,
                    display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          onClick={() => setShowModal(false)}>
          <motion.div
            variants={modalPanel} initial="hidden" animate="visible" exit="exit"
            style={{ background:"#fff", borderRadius:20, padding:32, width:"100%",
                      maxWidth:520, maxHeight:"92vh", overflowY:"auto",
                      boxShadow:"0 24px 80px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>
            <ReportModal onClose={() => setShowModal(false)} defaultDomain={modalDomain} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          onSuccess={handleSignInSuccess}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showLimitModal && (
        <SearchLimitModal
          onClose={() => setShowLimitModal(false)}
          onSignIn={() => { setShowLimitModal(false); setShowSignIn(true); }}
          onSignUp={() => { setShowLimitModal(false); setShowSignIn(true); }}
        />
      )}
    </AnimatePresence>
    </div>
  );
}
