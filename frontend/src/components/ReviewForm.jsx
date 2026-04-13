import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StarPicker } from "./StarRating.jsx";
import { C } from "../design/tokens.js";
import { staggerContainer, staggerItem, slideDown } from "../design/motion.js";

const API = "";

const ISSUE_TYPES = [
  { value:"",                label:"— Select issue type (optional) —" },
  { value:"payment_fraud",   label:"💳 Payment Fraud" },
  { value:"not_delivered",   label:"📦 Not Delivered" },
  { value:"fake_job",        label:"💼 Fake Job Listing" },
  { value:"genuine_purchase",label:"✅ Genuine Purchase" },
  { value:"good_support",    label:"🤝 Good Customer Support" },
  { value:"safe_payment",    label:"🔒 Safe Payment" },
  { value:"refund_received", label:"💰 Refund Received" },
  { value:"other",           label:"❓ Other" },
];

const REVIEW_TYPES = [
  { value:"positive", label:"👍 Positive", color:"#10B981", bg:"#ECFDF5", border:"#6EE7B7" },
  { value:"negative", label:"👎 Negative", color:"#EF4444", bg:"#FEF2F2", border:"#FCA5A5" },
  { value:"neutral",  label:"😐 Neutral",  color:"#6B7280", bg:"#F3F4F6", border:"#E5E7EB" },
];

export function ReviewForm({ domain, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    rating:0, title:"", review_text:"", review_type:"neutral",
    issue_type:"", reviewer_name:"", is_anonymous:false,
    used_or_paid:false, payment_successful:"", received_service:"",
  });
  const [status, setStatus]     = useState("idle");
  const [errMsg, setErrMsg]     = useState("");
  const [fieldErr, setFieldErr] = useState({});
  const set = (k, v) => { setForm(f => ({ ...f, [k]:v })); setFieldErr(e => ({ ...e, [k]:"" })); };

  function validate() {
    const errs = {};
    if (!form.rating)                        errs.rating      = "Please select a star rating.";
    if (!form.title.trim())                  errs.title       = "Please add a short title.";
    if (form.review_text.trim().length < 20) errs.review_text = "Review must be at least 20 characters.";
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("loading"); setErrMsg("");
    try {
      const res = await fetch(`${API}/website/${encodeURIComponent(domain)}/review`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          domain, rating:form.rating, title:form.title.trim(),
          review_text:form.review_text.trim(), review_type:form.review_type,
          issue_type:form.issue_type||null,
          reviewer_name:form.is_anonymous?null:(form.reviewer_name.trim()||null),
          is_anonymous:form.is_anonymous, used_or_paid:form.used_or_paid,
          payment_successful:form.payment_successful===""?null:form.payment_successful==="true",
          received_service:form.received_service===""?null:form.received_service==="true",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Submission failed");
      setStatus("success");
      if (onSuccess) setTimeout(onSuccess, 2200);
    } catch (err) {
      setErrMsg(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  const inp = {
    border:`1.5px solid ${C.border}`, borderRadius:10, padding:"10px 14px",
    fontSize:14, fontFamily:"inherit", outline:"none", width:"100%",
    background:"#fff", color:C.text, transition:"border-color 0.2s",
  };
  const errStyle = { fontSize:12, color:C.danger, marginTop:4 };

  if (status === "success") return (
    <motion.div
      initial={{ opacity:0, scale:0.9 }}
      animate={{ opacity:1, scale:1 }}
      transition={{ type:"spring", stiffness:300, damping:22 }}
      style={{ textAlign:"center", padding:"40px 20px" }}>
      <motion.div
        animate={{ scale:[1,1.3,1], rotate:[0,10,-10,0] }}
        transition={{ duration:0.6 }}
        style={{ fontSize:56, marginBottom:16 }}>✅</motion.div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, marginBottom:8 }}>
        Review submitted!
      </div>
      <p style={{ color:C.textMuted, fontSize:14, lineHeight:1.6 }}>
        Your review is pending verification and will appear once approved.
      </p>
    </motion.div>
  );

  return (
    <motion.form
      variants={staggerContainer(0.05)}
      initial="hidden" animate="visible"
      onSubmit={submit}
      style={{ display:"flex", flexDirection:"column", gap:18 }}>

      <motion.div variants={staggerItem}
        style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700 }}>
        Review: {domain}
      </motion.div>

      {/* Star rating */}
      <motion.div variants={staggerItem}>
        <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                        display:"block", marginBottom:8 }}>Your rating *</label>
        <StarPicker value={form.rating} onChange={v => set("rating", v)} />
        {fieldErr.rating && <div style={errStyle}>{fieldErr.rating}</div>}
      </motion.div>

      {/* Review type */}
      <motion.div variants={staggerItem}>
        <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                        display:"block", marginBottom:8 }}>Experience type *</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {REVIEW_TYPES.map(({ value, label, color, bg, border }) => (
            <motion.button key={value} type="button"
              whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
              onClick={() => set("review_type", value)}
              style={{
                padding:"8px 16px", borderRadius:9, fontSize:13, fontWeight:600,
                cursor:"pointer", fontFamily:"inherit",
                border: form.review_type === value ? `2px solid ${color}` : `1.5px solid ${C.border}`,
                background: form.review_type === value ? bg : "#fff",
                color: form.review_type === value ? color : C.textSub,
                transition:"all 0.2s",
              }}>
              {label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Issue type */}
      <motion.div variants={staggerItem}>
        <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                        display:"block", marginBottom:6 }}>Issue / category</label>
        <select style={inp} value={form.issue_type}
                onChange={e => set("issue_type", e.target.value)}>
          {ISSUE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </motion.div>

      {/* Title */}
      <motion.div variants={staggerItem}>
        <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                        display:"block", marginBottom:6 }}>Review title *</label>
        <input style={{ ...inp, borderColor:fieldErr.title ? C.danger : C.border }}
               value={form.title} onChange={e => set("title", e.target.value)}
               placeholder="Summarise your experience in one line" maxLength={120}
               onFocus={e => e.target.style.borderColor=C.red}
               onBlur={e => e.target.style.borderColor=fieldErr.title?C.danger:C.border} />
        {fieldErr.title && <div style={errStyle}>{fieldErr.title}</div>}
      </motion.div>

      {/* Review text */}
      <motion.div variants={staggerItem}>
        <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                        display:"block", marginBottom:6 }}>
          Detailed review * <span style={{ color:C.textMuted, fontWeight:400 }}>(min 20 chars)</span>
        </label>
        <textarea rows={5} style={{ ...inp, resize:"vertical",
                                    borderColor:fieldErr.review_text?C.danger:C.border }}
                  value={form.review_text} onChange={e => set("review_text", e.target.value)}
                  placeholder="Describe your experience in detail..."
                  onFocus={e => e.target.style.borderColor=C.red}
                  onBlur={e => e.target.style.borderColor=fieldErr.review_text?C.danger:C.border} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          {fieldErr.review_text ? <div style={errStyle}>{fieldErr.review_text}</div> : <div />}
          <span style={{ fontSize:11, color:C.textMuted }}>{form.review_text.length}/2000</span>
        </div>
      </motion.div>

      {/* Experience fields */}
      <motion.div variants={staggerItem}
        style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {[
          { label:"Was payment successful?", key:"payment_successful" },
          { label:"Did you receive service?", key:"received_service" },
        ].map(({ label, key }) => (
          <div key={key}>
            <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                            display:"block", marginBottom:6 }}>{label}</label>
            <select style={inp} value={form[key]} onChange={e => set(key, e.target.value)}>
              <option value="">Not applicable</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        ))}
      </motion.div>

      {/* Checkboxes */}
      <motion.div variants={staggerItem} style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[
          { key:"used_or_paid",  label:"I actually used or paid on this website" },
          { key:"is_anonymous",  label:"Submit anonymously" },
        ].map(({ key, label }) => (
          <label key={key} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <input type="checkbox" checked={form[key]}
                   onChange={e => set(key, e.target.checked)}
                   style={{ width:16, height:16, accentColor:C.red }} />
            <span style={{ fontSize:13, color:C.textSub }}>{label}</span>
          </label>
        ))}
      </motion.div>

      {/* Name */}
      <AnimatePresence>
        {!form.is_anonymous && (
          <motion.div
            variants={slideDown} initial="hidden" animate="visible" exit="exit">
            <label style={{ fontSize:13, fontWeight:600, color:C.textSub,
                            display:"block", marginBottom:6 }}>Your name (optional)</label>
            <input style={inp} value={form.reviewer_name}
                   onChange={e => set("reviewer_name", e.target.value)}
                   placeholder="e.g. Rahul M." maxLength={60}
                   onFocus={e => e.target.style.borderColor=C.red}
                   onBlur={e => e.target.style.borderColor=C.border} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {errMsg && (
          <motion.div
            initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:8,
                     padding:"10px 14px", fontSize:13, color:C.danger }}>
            {errMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons */}
      <motion.div variants={staggerItem} style={{ display:"flex", gap:10 }}>
        <motion.button type="submit" disabled={status==="loading"}
          whileHover={status!=="loading" ? { scale:1.01, boxShadow:`0 6px 20px ${C.redGlow}` } : {}}
          whileTap={status!=="loading" ? { scale:0.98 } : {}}
          style={{ flex:1, background:status==="loading"?C.textMuted:C.red,
                   color:"#fff", border:"none", padding:"13px", borderRadius:10,
                   fontSize:15, fontWeight:600,
                   cursor:status==="loading"?"not-allowed":"pointer",
                   fontFamily:"inherit", boxShadow:`0 4px 12px ${C.redGlow}` }}>
          {status==="loading" ? "Submitting…" : "Submit review →"}
        </motion.button>
        {onCancel && (
          <motion.button type="button" onClick={onCancel}
            whileHover={{ scale:1.01 }} whileTap={{ scale:0.98 }}
            style={{ padding:"13px 20px", borderRadius:10, border:`1.5px solid ${C.border}`,
                     background:"#fff", fontSize:14, cursor:"pointer",
                     fontFamily:"inherit", color:C.textSub }}>
            Cancel
          </motion.button>
        )}
      </motion.div>
      <p style={{ fontSize:12, color:C.textMuted, textAlign:"center" }}>
        Reviews are moderated before publishing. Fake or spam reviews are removed.
      </p>
    </motion.form>
  );
}
