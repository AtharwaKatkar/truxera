import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function StarDisplay({ rating, size = 16, showNumber = true }) {
  if (rating == null) return (
    <span style={{ fontSize:12, color:"#94A3B8", fontStyle:"italic" }}>No ratings yet</span>
  );
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
      <span style={{ display:"inline-flex", gap:2 }}>
        {[1,2,3,4,5].map(s => (
          <span key={s} style={{
            color: s <= Math.round(rating) ? "#F59E0B" : "#E2E8F0",
            fontSize:size,
          }}>★</span>
        ))}
      </span>
      {showNumber && (
        <span style={{ fontSize:size-2, fontWeight:700, color:"#374151" }}>
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}

const LABELS = ["","Terrible","Poor","Average","Good","Excellent"];
const COLORS  = ["","#EF4444","#F97316","#F59E0B","#84CC16","#10B981"];

export function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:8 }}>
        {[1,2,3,4,5].map(n => (
          <motion.span
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            animate={{
              scale: n <= active ? 1.2 : 1,
              color: n <= active ? "#F59E0B" : "#E2E8F0",
            }}
            whileTap={{ scale:0.9 }}
            transition={{ type:"spring", stiffness:500, damping:20 }}
            style={{ fontSize:36, lineHeight:1, cursor:"pointer", display:"inline-block" }}>
            ★
          </motion.span>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {active > 0 && (
          <motion.div
            key={active}
            initial={{ opacity:0, y:-6, scale:0.9 }}
            animate={{ opacity:1, y:0,  scale:1 }}
            exit={{ opacity:0, y:4 }}
            transition={{ duration:0.2 }}
            style={{ fontSize:13, fontWeight:700, color:COLORS[active] }}>
            {LABELS[active]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
