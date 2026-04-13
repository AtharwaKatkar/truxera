export function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      body { background: #F8F9FB; font-family: 'Inter', 'DM Sans', sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased; }

      /* ── Animations ── */
      @keyframes fadeUp    { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
      @keyframes scaleIn   { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
      @keyframes pulse     { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      @keyframes spin      { to { transform:rotate(360deg); } }
      @keyframes shimmer   { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
      @keyframes scoreCount{ from { opacity:0; transform:scale(0.5); } to { opacity:1; transform:scale(1); } }
      @keyframes barFill   { from { width:0; } to { width:var(--w); } }
      @keyframes glowPulse { 0%,100% { box-shadow:var(--glow-start); } 50% { box-shadow:var(--glow-end); } }
      @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
      @keyframes float     { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }

      .fade-up   { animation: fadeUp   0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
      .fade-in   { animation: fadeIn   0.3s ease forwards; }
      .scale-in  { animation: scaleIn  0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
      .slide-down{ animation: slideDown 0.3s ease forwards; }

      /* ── Skeleton ── */
      .sk { background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.6s infinite; border-radius:8px; }

      /* ── Scrollbar ── */
      ::-webkit-scrollbar { width:6px; height:6px; }
      ::-webkit-scrollbar-track { background:#F1F5F9; }
      ::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:99px; }
      ::-webkit-scrollbar-thumb:hover { background:#94A3B8; }

      /* ── Focus ── */
      *:focus-visible { outline:2px solid #3B82F6; outline-offset:2px; border-radius:6px; }

      /* ── Transitions ── */
      button, a { transition: all 0.18s cubic-bezier(0.4,0,0.2,1); }

      /* ── Mobile ── */
      @media (max-width: 768px) {
        .hide-mobile { display: none !important; }
        .stack-mobile { flex-direction: column !important; }
        .full-mobile  { width: 100% !important; }
        .grid-1-mobile { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}
