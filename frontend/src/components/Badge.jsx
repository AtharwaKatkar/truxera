import { C } from "../design/tokens.js";

const BADGE_STYLES = {
  verified:   { bg:"#ECFDF5", color:"#059669", border:"#6EE7B7", dot:"#10B981" },
  pending:    { bg:"#FFFBEB", color:"#D97706", border:"#FCD34D", dot:"#F59E0B" },
  nodata:     { bg:"#F8FAFC", color:"#94A3B8", border:"#E2E8F0", dot:"#CBD5E1" },
  limited:    { bg:"#FFFBEB", color:"#D97706", border:"#FCD34D", dot:"#F59E0B" },
  danger:     { bg:"#FEF2F2", color:"#DC2626", border:"#FCA5A5", dot:"#EF4444" },
  info:       { bg:"#EFF6FF", color:"#2563EB", border:"#BFDBFE", dot:"#3B82F6" },
  community:  { bg:"#ECFDF5", color:"#059669", border:"#6EE7B7", dot:"#10B981" },
};

export function Badge({ type = "nodata", children, dot = false, size = "sm" }) {
  const s = BADGE_STYLES[type] || BADGE_STYLES.nodata;
  const pad = size === "sm" ? "3px 10px" : "5px 14px";
  const fs  = size === "sm" ? 11 : 13;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      background:s.bg, border:`1px solid ${s.border}`,
      borderRadius:99, padding:pad,
      fontSize:fs, fontWeight:600, color:s.color,
      whiteSpace:"nowrap", letterSpacing:"0.01em",
    }}>
      {dot && (
        <span style={{ width:6, height:6, borderRadius:"50%",
                       background:s.dot, flexShrink:0 }} />
      )}
      {children}
    </span>
  );
}
