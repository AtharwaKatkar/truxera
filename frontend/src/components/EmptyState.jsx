import { motion } from "framer-motion";
import { C } from "../design/tokens.js";

export function EmptyState({ icon = "📭", title, message, action }) {
  return (
    <motion.div
      initial={{ opacity:0, scale:0.95 }}
      animate={{ opacity:1, scale:1 }}
      transition={{ duration:0.4, ease:[0.16,1,0.3,1] }}
      style={{
        textAlign:"center", padding:"40px 24px",
        background:"linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%)",
        border:"1.5px dashed #CBD5E1", borderRadius:16,
      }}>
      <motion.div
        animate={{ y:[0,-6,0] }}
        transition={{ duration:2.5, repeat:Infinity, ease:"easeInOut" }}
        style={{
          width:64, height:64, borderRadius:20,
          background:"#fff", border:"1px solid #E2E8F0",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:28, margin:"0 auto 16px",
          boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
        }}>
        {icon}
      </motion.div>
      {title && (
        <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:8 }}>{title}</div>
      )}
      <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.7,
                  maxWidth:300, margin:"0 auto" }}>
        {message}
      </p>
      {action && (
        <motion.button
          whileHover={{ scale:1.03, boxShadow:`0 6px 18px ${C.redGlow}` }}
          whileTap={{ scale:0.97 }}
          onClick={action.onClick}
          style={{
            marginTop:20, background:C.red, color:"#fff", border:"none",
            padding:"10px 24px", borderRadius:10, fontSize:13, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit",
            boxShadow:`0 4px 12px ${C.redGlow}`,
          }}>
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
