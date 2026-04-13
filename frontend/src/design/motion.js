// ── Truxera Motion Design System ─────────────────────────
// All animation variants in one place.
// Import what you need — keeps components clean.

// ── Spring presets ────────────────────────────────────────
export const spring = {
  snappy:  { type:"spring", stiffness:500, damping:30, mass:0.8 },
  smooth:  { type:"spring", stiffness:300, damping:28, mass:1   },
  bouncy:  { type:"spring", stiffness:400, damping:20, mass:0.9 },
  gentle:  { type:"spring", stiffness:200, damping:30, mass:1.2 },
  slow:    { type:"spring", stiffness:120, damping:20, mass:1.5 },
};

export const ease = {
  out:     [0.16, 1, 0.3, 1],
  in:      [0.4, 0, 1, 1],
  inOut:   [0.4, 0, 0.2, 1],
  expo:    [0.19, 1, 0.22, 1],
};

// ── Page / section entrance ───────────────────────────────
export const fadeUp = {
  hidden:  { opacity:0, y:24 },
  visible: { opacity:1, y:0, transition:{ duration:0.5, ease:ease.expo } },
};

export const fadeIn = {
  hidden:  { opacity:0 },
  visible: { opacity:1, transition:{ duration:0.35, ease:ease.out } },
};

export const scaleIn = {
  hidden:  { opacity:0, scale:0.92 },
  visible: { opacity:1, scale:1, transition:{ duration:0.4, ease:ease.expo } },
};

export const slideDown = {
  hidden:  { opacity:0, y:-16, scaleY:0.95 },
  visible: { opacity:1, y:0,   scaleY:1,
             transition:{ duration:0.35, ease:ease.expo } },
  exit:    { opacity:0, y:-10, scaleY:0.97,
             transition:{ duration:0.2, ease:ease.in } },
};

export const slideUp = {
  hidden:  { opacity:0, y:16 },
  visible: { opacity:1, y:0, transition:{ duration:0.35, ease:ease.expo } },
  exit:    { opacity:0, y:8, transition:{ duration:0.2, ease:ease.in } },
};

// ── Stagger container ─────────────────────────────────────
export const staggerContainer = (stagger = 0.07, delay = 0) => ({
  hidden:  {},
  visible: { transition:{ staggerChildren:stagger, delayChildren:delay } },
});

export const staggerItem = {
  hidden:  { opacity:0, y:20 },
  visible: { opacity:1, y:0, transition:{ duration:0.45, ease:ease.expo } },
};

// ── Card interactions ─────────────────────────────────────
export const cardHover = {
  rest:  { y:0,  boxShadow:"0 1px 4px rgba(0,0,0,0.04)", transition:spring.snappy },
  hover: { y:-3, boxShadow:"0 8px 28px rgba(0,0,0,0.10)", transition:spring.snappy },
  tap:   { y:0,  scale:0.99, transition:spring.snappy },
};

export const buttonHover = {
  rest:  { scale:1,    transition:spring.snappy },
  hover: { scale:1.02, transition:spring.snappy },
  tap:   { scale:0.97, transition:spring.snappy },
};

// ── Result card ───────────────────────────────────────────
export const resultCard = {
  hidden:  { opacity:0, y:32, scale:0.97 },
  visible: { opacity:1, y:0,  scale:1,
             transition:{ duration:0.55, ease:ease.expo } },
};

// ── Score ring ────────────────────────────────────────────
export const scoreNumber = {
  hidden:  { opacity:0, scale:0.4 },
  visible: { opacity:1, scale:1,
             transition:{ ...spring.bouncy, delay:0.2 } },
};

// ── Reason cards ─────────────────────────────────────────
export const reasonCard = {
  hidden:  { opacity:0, x:-16 },
  visible: { opacity:1, x:0, transition:{ duration:0.4, ease:ease.expo } },
};

// ── Modal ─────────────────────────────────────────────────
export const modalOverlay = {
  hidden:  { opacity:0 },
  visible: { opacity:1, transition:{ duration:0.25 } },
  exit:    { opacity:0, transition:{ duration:0.2 } },
};

export const modalPanel = {
  hidden:  { opacity:0, scale:0.9,  y:24 },
  visible: { opacity:1, scale:1,    y:0,
             transition:{ ...spring.bouncy, delay:0.05 } },
  exit:    { opacity:0, scale:0.95, y:16,
             transition:{ duration:0.2, ease:ease.in } },
};

// ── Nav ───────────────────────────────────────────────────
export const navItem = {
  rest:  { y:0,   opacity:1 },
  hover: { y:-1,  opacity:0.8, transition:spring.snappy },
};

// ── Hero ──────────────────────────────────────────────────
export const heroBadge = {
  hidden:  { opacity:0, scale:0.8, y:-8 },
  visible: { opacity:1, scale:1,   y:0,
             transition:{ ...spring.bouncy, delay:0.1 } },
};

export const heroTitle = {
  hidden:  { opacity:0, y:32 },
  visible: { opacity:1, y:0,
             transition:{ duration:0.6, ease:ease.expo, delay:0.15 } },
};

export const heroSub = {
  hidden:  { opacity:0, y:20 },
  visible: { opacity:1, y:0,
             transition:{ duration:0.5, ease:ease.expo, delay:0.25 } },
};

export const heroSearch = {
  hidden:  { opacity:0, y:20, scale:0.98 },
  visible: { opacity:1, y:0,  scale:1,
             transition:{ duration:0.5, ease:ease.expo, delay:0.35 } },
};

// ── Stat card ─────────────────────────────────────────────
export const statCard = {
  hidden:  { opacity:0, scale:0.85 },
  visible: (i) => ({
    opacity:1, scale:1,
    transition:{ ...spring.bouncy, delay: 0.3 + i * 0.08 },
  }),
};

// ── Bar fill ──────────────────────────────────────────────
// Use with animate={{ width: `${pct}%` }} + transition={barFill}
export const barFill = { duration:0.9, ease:ease.expo, delay:0.4 };

// ── Score ring stroke ─────────────────────────────────────
export const ringStroke = { duration:1.2, ease:ease.expo, delay:0.3 };

// ── Tab switch ────────────────────────────────────────────
export const tabContent = {
  hidden:  { opacity:0, x:10 },
  visible: { opacity:1, x:0, transition:{ duration:0.3, ease:ease.out } },
  exit:    { opacity:0, x:-10, transition:{ duration:0.2 } },
};
