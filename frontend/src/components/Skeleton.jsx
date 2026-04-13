export function Sk({ w = "100%", h = 16, r = 8, style = {} }) {
  return <div className="sk" style={{ width:w, height:h, borderRadius:r, flexShrink:0, ...style }} />;
}

export function CardSkeleton() {
  return (
    <div style={{ background:"#fff", border:"1px solid #E8ECF0", borderRadius:14, padding:20 }}>
      <div style={{ display:"flex", gap:12, marginBottom:14 }}>
        <Sk w={40} h={40} r={10} />
        <div style={{ flex:1 }}>
          <Sk w="55%" h={14} style={{ marginBottom:8 }} />
          <Sk w="80%" h={12} />
        </div>
      </div>
      <Sk w="100%" h={12} style={{ marginBottom:6 }} />
      <Sk w="70%" h={12} />
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <div style={{ background:"#fff", border:"1px solid #E8ECF0", borderRadius:24, padding:32 }}>
      <div style={{ display:"flex", gap:16, marginBottom:28 }}>
        <Sk w={80} h={80} r={40} />
        <div style={{ flex:1 }}>
          <Sk w="40%" h={18} style={{ marginBottom:12 }} />
          <Sk w="25%" h={36} style={{ marginBottom:10 }} />
          <Sk w="30%" h={28} />
        </div>
      </div>
      <Sk w="100%" h={10} r={99} style={{ marginBottom:24 }} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:24 }}>
        {[1,2,3].map(i => <Sk key={i} h={72} r={12} />)}
      </div>
      <div style={{ display:"flex", gap:12 }}>
        <Sk h={48} style={{ flex:1 }} r={12} />
        <Sk h={48} style={{ flex:1 }} r={12} />
      </div>
    </div>
  );
}
