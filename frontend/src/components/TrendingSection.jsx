/**
 * TrendingSection — trending risky sites + recently checked.
 * All data from real API calls. Shows nothing if empty.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { C, LEVEL_TOKENS } from "../design/tokens.js";
import { CardSkeleton } from "./Skeleton.jsx";
import { EmptyState } from "./EmptyState.jsx";

const API = "";

function ago(iso) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3600000), dy = Math.floor(d / 86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
}

function DomainRow({ domain, trustScore, trustLevel, meta, onClick }) {
  const lv = LEVEL_TOKENS[trustLevel] || LEVEL_TOKENS.caution;
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(0,0,0,0.07)", borderColor: C.borderHover }}
      onClick={() => onClick(domain)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "#fff", border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "12px 16px", cursor: "pointer",
        transition: "all 0.2s",
      }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {domain}
        </div>
        {meta && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{meta}</div>
        )}
      </div>
      {trustScore != null && (
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: lv.color }}>{trustScore}</div>
          <div style={{ fontSize: 10, color: C.textMuted }}>score</div>
        </div>
      )}
      {trustLevel && (
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
          background: lv.bg, color: lv.color, border: `1px solid ${lv.border}`,
          flexShrink: 0,
        }}>
          {lv.icon} {lv.label}
        </span>
      )}
    </motion.div>
  );
}

export function TrendingSection({ onDomainClick }) {
  const [trending, setTrending]         = useState([]);
  const [recent, setRecent]             = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(true);
  const [tab, setTab]                   = useState("trending");

  useEffect(() => {
    fetch(`${API}/websites/trending?limit=8`)
      .then(r => r.json()).then(d => setTrending(Array.isArray(d) ? d : []))
      .catch(() => setTrending([])).finally(() => setTrendLoading(false));

    fetch(`${API}/websites/recently-checked?limit=8`)
      .then(r => r.json()).then(d => setRecent(Array.isArray(d) ? d : []))
      .catch(() => setRecent([])).finally(() => setRecentLoading(false));
  }, []);

  const tabs = [
    { id: "trending", label: "🔥 Trending risky" },
    { id: "recent",   label: "🕐 Recently checked" },
  ];

  const loading = tab === "trending" ? trendLoading : recentLoading;
  const items   = tab === "trending" ? trending : recent;

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16,
                    background: "#F1F5F9", borderRadius: 12, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "8px 14px", borderRadius: 9, border: "none",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            background: tab === t.id ? "#fff" : "transparent",
            color: tab === t.id ? C.text : C.textMuted,
            boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={tab === "trending" ? "📊" : "🕐"}
          title={tab === "trending" ? "No trending sites yet" : "No recent checks yet"}
          message={tab === "trending"
            ? "Sites with recent reports will appear here."
            : "Domains you and others check will appear here."}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((s, i) => (
            <DomainRow
              key={s.domain || i}
              domain={s.domain}
              trustScore={s.trust_score}
              trustLevel={s.trust_level}
              meta={tab === "trending"
                ? `${s.reports_7d} report${s.reports_7d !== 1 ? "s" : ""} this week`
                : s.last_checked ? `Checked ${ago(s.last_checked)}` : null}
              onClick={onDomainClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
