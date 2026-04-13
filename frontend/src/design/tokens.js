// ── Truxera Design Tokens ─────────────────────────────────
export const C = {
  // Brand
  red:      "#E54B4B",
  redDark:  "#C93A3A",
  redGlow:  "rgba(229,75,75,0.18)",

  // Semantic
  safe:     "#10B981",
  safeGlow: "rgba(16,185,129,0.15)",
  safeBg:   "#ECFDF5",
  safeBorder:"#6EE7B7",

  caution:     "#F59E0B",
  cautionGlow: "rgba(245,158,11,0.15)",
  cautionBg:   "#FFFBEB",
  cautionBorder:"#FCD34D",

  risky:     "#F97316",
  riskyGlow: "rgba(249,115,22,0.15)",
  riskyBg:   "#FFF7ED",
  riskyBorder:"#FDBA74",

  danger:     "#EF4444",
  dangerGlow: "rgba(239,68,68,0.18)",
  dangerBg:   "#FEF2F2",
  dangerBorder:"#FCA5A5",

  // Neutrals
  bg:       "#F8F9FB",
  surface:  "#FFFFFF",
  border:   "#E8ECF0",
  borderHover:"#CBD5E1",

  text:     "#0F172A",
  textSub:  "#475569",
  textMuted:"#94A3B8",
  textLight:"#CBD5E1",

  // Info
  info:     "#3B82F6",
  infoBg:   "#EFF6FF",
  infoBorder:"#BFDBFE",

  // Dark surfaces
  dark:     "#0F172A",
  darkCard: "#1E293B",
  darkBorder:"#334155",
};

export const R = {
  sm:  "10px",
  md:  "14px",
  lg:  "18px",
  xl:  "24px",
  xxl: "32px",
};

export const S = {
  sm:  "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  md:  "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  lg:  "0 8px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)",
  xl:  "0 20px 60px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06)",
};

export const LEVEL_TOKENS = {
  safe:      { color: C.safe,    glow: C.safeGlow,    bg: C.safeBg,    border: C.safeBorder,    label:"Safe",      icon:"🛡️" },
  caution:   { color: C.caution, glow: C.cautionGlow, bg: C.cautionBg, border: C.cautionBorder, label:"Caution",   icon:"⚠️" },
  risky:     { color: C.risky,   glow: C.riskyGlow,   bg: C.riskyBg,   border: C.riskyBorder,   label:"Risky",     icon:"🔶" },
  dangerous: { color: C.danger,  glow: C.dangerGlow,  bg: C.dangerBg,  border: C.dangerBorder,  label:"Dangerous", icon:"🚨" },
};

export const CONFIDENCE_TOKENS = {
  none:             { label:"No data",              color: C.textMuted, bg:"#F1F5F9", border:"#E2E8F0" },
  low:              { label:"Limited confidence",   color: C.caution,   bg: C.cautionBg, border: C.cautionBorder },
  preliminary:      { label:"Preliminary analysis", color: C.info,      bg: C.infoBg,    border: C.infoBorder },
  technical:        { label:"Technical only",       color:"#8B5CF6",    bg:"#F5F3FF",    border:"#DDD6FE" },
  community_backed: { label:"Community verified",   color: C.safe,      bg: C.safeBg,    border: C.safeBorder },
};
