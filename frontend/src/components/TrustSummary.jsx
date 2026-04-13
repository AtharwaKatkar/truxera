import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { C, LEVEL_TOKENS, CONFIDENCE_TOKENS } from "../design/tokens.js";
import { Badge } from "./Badge.jsx";
import { staggerContainer, staggerItem, scoreNumber, statCard, barFill, ringStroke } from "../design/motion.js";

function inr(n) {
  if (n == null || n === 0) return null;
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n/1000).toFixed(1)}K`;
  return `₹${n}`;
}

// ── Animated counter ──────────────────────────────────────
function AnimatedNumber({ target, duration = 1.2 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{display}</>;
}

// ── Circular SVG ring ─────────────────────────────────────
function ScoreRing({ score, color, glow, size = 130 }) {
  const r    = (size - 18) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;

  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      {/* Glow layer */}
      <motion.div
        initial={{ opacity:0, scale:0.8 }}
        animate={{ opacity:1, scale:1 }}
        transition={{ duration:0.6, delay:0.2 }}
        style={{
          position:"absolute", inset:-12,
          borderRadius:"50%",
          background:`radial-gradient(circle, ${glow} 0%, transparent 70%)`,
          pointerEvents:"none",
        }}
      />
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none"
                stroke="#E8ECF0" strokeWidth={10} />
        {/* Fill — animated */}
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={10} strokeLinecap="round"
          initial={{ strokeDasharray:`0 ${circ}` }}
          animate={{ strokeDasharray:`${fill} ${circ}` }}
          transition={ringStroke}
          style={{ filter:`drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      {/* Score number */}
      <div style={{
        position:"absolute", inset:0,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
      }}>
        <motion.span
          variants={scoreNumber} initial="hidden" animate="visible"
          style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800,
                   color, lineHeight:1 }}>
          <AnimatedNumber target={score} />
        </motion.span>
        <span style={{ fontSize:10, color:C.textMuted, fontWeight:500 }}>/100</span>
      </div>
    </div>
  );
}

export function TrustSummary({ result }) {
  const lv  = LEVEL_TOKENS[result.trust_level] || LEVEL_TOKENS.caution;
  const cm  = CONFIDENCE_TOKENS[result.confidence] || CONFIDENCE_TOKENS.low;
  const cd  = result.community_data || {};

  const stats = [
    { icon:"📋", value: cd.reports_count > 0 ? cd.reports_count : null,
      label:"Reports", empty:"No reports", color:C.danger },
    { icon:"💸", value: cd.total_loss ? inr(cd.total_loss) : null,
      label:"Total lost", empty:"No data", color:"#F97316" },
    { icon:"👍", value: cd.upvotes > 0 ? cd.upvotes : null,
      label:"Upvotes", empty:"No upvotes", color:C.info },
  ];

  const confBadgeType =
    result.confidence === "community_backed" ? "community" :
    result.confidence === "none"             ? "nodata"    :
    result.confidence === "low"              ? "limited"   : "info";

  return (
    <div>
      {/* Domain + badges */}
      <motion.div
        initial={{ opacity:0, y:-10 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4, ease:[0.16,1,0.3,1] }}
        style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:8,
          background:"#F1F5F9", border:"1px solid #E2E8F0",
          padding:"6px 14px", borderRadius:10,
          fontSize:14, fontWeight:600, color:C.text,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke={C.textMuted} strokeWidth="1.3"/>
            <path d="M7 1C7 1 5 4 5 7C5 10 7 13 7 13" stroke={C.textMuted} strokeWidth="1.3"/>
            <path d="M1 7H13" stroke={C.textMuted} strokeWidth="1.3"/>
          </svg>
          {result.domain}
        </div>
        <Badge type={confBadgeType} dot>{cm.label}</Badge>
        {cd.today_reports > 0 && (
          <motion.div
            initial={{ scale:0.7, opacity:0 }}
            animate={{ scale:1, opacity:1 }}
            transition={{ type:"spring", stiffness:400, damping:18 }}>
            <Badge type="danger" dot>{cd.today_reports}× reported today</Badge>
          </motion.div>
        )}
      </motion.div>

      {/* Score ring + level + stats */}
      <div style={{ display:"flex", alignItems:"center", gap:28, flexWrap:"wrap", marginBottom:24 }}>
        <ScoreRing score={result.trust_score} color={lv.color} glow={lv.glow} />

        {/* Level label + bar */}
        <div style={{ flex:1, minWidth:160 }}>
          <motion.div
            initial={{ opacity:0, x:-20 }}
            animate={{ opacity:1, x:0 }}
            transition={{ duration:0.5, ease:[0.16,1,0.3,1], delay:0.15 }}
            style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <motion.span
              animate={{ rotate:[0,8,-8,0] }}
              transition={{ duration:0.6, delay:0.5 }}
              style={{ fontSize:28 }}>
              {lv.icon}
            </motion.span>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:lv.color,
                            fontFamily:"'Syne',sans-serif", lineHeight:1 }}>
                {lv.label}
              </div>
              <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>Trust level</div>
            </div>
          </motion.div>

          {/* Progress bar */}
          <div style={{ background:"#E8ECF0", borderRadius:99, height:7, overflow:"hidden" }}>
            <motion.div
              initial={{ width:0 }}
              animate={{ width:`${result.trust_score}%` }}
              transition={barFill}
              style={{ height:"100%", borderRadius:99, background:lv.color,
                       boxShadow:`0 0 10px ${lv.glow}` }}
            />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between",
                        fontSize:10, color:C.textMuted, marginTop:4 }}>
            <span>Dangerous</span><span>Safe</span>
          </div>
        </div>

        {/* Stat cards */}
        <motion.div
          variants={staggerContainer(0.08, 0.3)}
          initial="hidden" animate="visible"
          style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {stats.map(({ icon, value, label, empty, color }, i) => (
            <motion.div
              key={label}
              custom={i}
              variants={statCard}
              whileHover={{ y:-4, boxShadow:"0 8px 24px rgba(0,0,0,0.10)" }}
              whileTap={{ scale:0.97 }}
              style={{
                background:"#fff", border:"1px solid #E8ECF0",
                borderRadius:14, padding:"14px 18px", textAlign:"center",
                minWidth:88, cursor:"default",
                boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
              }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
              {value != null ? (
                <div style={{ fontSize:20, fontWeight:800, color, lineHeight:1, marginBottom:4 }}>
                  {value}
                </div>
              ) : (
                <div style={{ fontSize:11, color:C.textMuted, fontStyle:"italic", marginBottom:4 }}>
                  {empty}
                </div>
              )}
              <div style={{ fontSize:11, color:C.textMuted, fontWeight:500 }}>{label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
