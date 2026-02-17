'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
  AreaChart, Area, ReferenceLine
} from "recharts";

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = [
  "#00ff9f","#ff6b6b","#ffd93d","#6bcbff","#ff8cf0",
  "#ff9f43","#a29bfe","#55efc4","#fd79a8","#74b9ff"
];

const fmt = (bytes) => {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} kB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};

const parseMemory = (v) => {
  if (!v) return 0;
  const m = String(v).match(/^([\d.]+)([kMG]?B)$/);
  if (!m) return 0;
  const mul = { B: 1, kB: 1024, MB: 1048576, GB: 1073741824 };
  return Math.round(parseFloat(m[1]) * (mul[m[2]] || 1));
};

// ─── CSV Parser ───────────────────────────────────────────────────────────────
const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = vals[i]));
    row.FlatBytes = parseMemory(row.Flat);
    row.CumBytes = parseMemory(row.Cum);
    row.Time = new Date(row.Time);
    return row;
  }).filter((r) => !isNaN(r.Time));
};

// ─── Flamebar ────────────────────────────────────────────────────────────────
const FlameBar = ({ name, flat, cum, max, color }) => {
  const flatPct = max > 0 ? (flat / max) * 100 : 0;
  const cumPct  = max > 0 ? (cum  / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ color:"#ccc", fontSize:11, maxWidth:"60%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
        <span style={{ color, fontSize:11 }}>{fmt(flat)} flat · {fmt(cum)} cum</span>
      </div>
      <div style={{ background:"#1a1a2e", borderRadius:3, height:8, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${cumPct}%`, background: color+"33", borderRadius:3 }} />
        <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${flatPct}%`, background: color, borderRadius:3, boxShadow:`0 0 8px ${color}88` }} />
      </div>
    </div>
  );
};

// ─── AI Analysis Panel ────────────────────────────────────────────────────────
const AIPanel = ({ data, buildId }) => {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!data.length) return;
    setLoading(true);
    setAnalysis("");

    const top10 = [...data]
      .sort((a,b) => b.FlatBytes - a.FlatBytes)
      .slice(0,10)
      .map(r => `${r.Name}: flat=${fmt(r.FlatBytes)}, cum=${fmt(r.CumBytes)}, flat%=${r["Flat%"]}, cum%=${r["Cum%"]}, buildID=${r.BuildID}`);

    const prompt = `You are a Go performance engineer. Analyze this heap profile snapshot from a Go server (build: ${buildId || "unknown"}).

Top memory consumers:
${top10.join("\n")}

In 3-4 bullet points, identify:
- Likely memory leak sources or hot paths
- Suspicious allocators (e.g. runtime, encoding, net/http, etc)
- Quick actionable recommendations (pprof flags, sync.Pool, escape analysis, etc.)
- Risk level: LOW / MEDIUM / HIGH

Be concise, technical, direct. No fluff.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const json = await res.json();
      const text = json.content?.map(c => c.text || "").join("") || "No response.";
      setAnalysis(text);
    } catch (e) {
      setAnalysis("⚠ Could not reach Anthropic API.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background:"#0d0d1a", border:"1px solid #1e3a5f", borderRadius:8, padding:20, marginTop:20 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#00ff9f", boxShadow:"0 0 8px #00ff9f" }} />
          <span style={{ color:"#00ff9f", fontFamily:"'JetBrains Mono',monospace", fontSize:13, letterSpacing:2, textTransform:"uppercase" }}>AI Leak Detector</span>
        </div>
        <button onClick={analyze} disabled={loading} style={{
          background: loading ? "#1a1a2e" : "linear-gradient(135deg,#00ff9f22,#00ff9f44)",
          border:"1px solid #00ff9f88", borderRadius:6, color:"#00ff9f", cursor: loading ? "default" : "pointer",
          fontFamily:"'JetBrains Mono',monospace", fontSize:12, padding:"6px 16px", letterSpacing:1,
          transition:"all 0.2s"
        }}>
          {loading ? "Analyzing…" : "⚡ Analyze Build"}
        </button>
      </div>
      {analysis ? (
        <div style={{ color:"#b0c4de", fontFamily:"'JetBrains Mono',monospace", fontSize:12, lineHeight:1.8, whiteSpace:"pre-wrap" }}>
          {analysis}
        </div>
      ) : (
        <div style={{ color:"#3a4a6a", fontFamily:"'JetBrains Mono',monospace", fontSize:12, textAlign:"center", padding:"20px 0" }}>
          Click "Analyze Build" to run AI-powered heap analysis
        </div>
      )}
    </div>
  );
};

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0a0a18", border:"1px solid #1e3a5f", borderRadius:6, padding:"10px 14px", fontFamily:"'JetBrains Mono',monospace" }}>
      <div style={{ color:"#6bcbff", fontSize:11, marginBottom:6 }}>{new Date(label).toLocaleTimeString()}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color: p.color, fontSize:11, marginBottom:2 }}>
          <span style={{ opacity:0.7 }}>{p.name.slice(0,30)}{p.name.length>30?"…":""}: </span>
          <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, accent, sub }) => (
  <div style={{
    background:"#0d0d1a", border:`1px solid ${accent}44`, borderRadius:8,
    padding:"16px 20px", flex:1, minWidth:140,
    boxShadow:`0 0 20px ${accent}11`
  }}>
    <div style={{ color: accent, fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>{label}</div>
    <div style={{ color:"#fff", fontFamily:"'JetBrains Mono',monospace", fontSize:20, fontWeight:700 }}>{value}</div>
    {sub && <div style={{ color:"#4a5a7a", fontFamily:"'JetBrains Mono',monospace", fontSize:10, marginTop:4 }}>{sub}</div>}
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function HeapProfiler({ csvContent = "" }: { csvContent?: string } = {}) {
  const [rawData, setRawData] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [selectedFuncs, setSelectedFuncs] = useState([]);
  const [metric, setMetric] = useState("FlatBytes");
  const [tab, setTab] = useState("timeline");
  const [searchQ, setSearchQ] = useState("");
  const [csvText, setCsvText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef();

  // ── Demo data generator ──
  const loadDemo = () => {
    const names = [
      "runtime.mallocgc","encoding/json.(*encodeState).marshal",
      "net/http.(*Transport).roundTrip","database/sql.(*DB).queryDC",
      "github.com/redis/go-redis.(*Client).Process",
      "sync.(*Pool).Get","bufio.(*Writer).Flush",
      "runtime.growslice","compress/gzip.NewWriter",
      "google.golang.org/grpc.(*ClientConn).Invoke"
    ];
    const rows = [];
    const buildIds = ["build-20250210-a1b2c3","build-20250211-d4e5f6"];
    buildIds.forEach((bid, bi) => {
      const baseTime = Date.now() - (bi * 3600000);
      const baseHeap = {};
      names.forEach(n => baseHeap[n] = Math.random() * 5 * 1024 * 1024);
      for (let t = 0; t < 10; t++) {
        const ts = new Date(baseTime + t * 60000).toISOString();
        names.forEach((name, ni) => {
          baseHeap[name] *= (1 + (Math.random() - 0.4) * 0.15);
          const flat = Math.max(0, baseHeap[name]);
          const cum  = flat * (1.2 + Math.random() * 0.5);
          rows.push({
            Flat: `${(flat/1024).toFixed(1)}kB`, "Flat%": `${(flat/1e7*100).toFixed(1)}%`,
            "Sum%":"", Cum: `${(cum/1024).toFixed(1)}kB`, "Cum%": `${(cum/1e7*100).toFixed(1)}%`,
            Name: name, Time: ts, BuildID: bid, BuildTime: ts
          });
        });
      }
    });
    const csv = [
      "Flat,Flat%,Sum%,Cum,Cum%,Name,Time,BuildID,BuildTime",
      ...rows.map(r => `${r.Flat},${r["Flat%"]},${r["Sum%"]},${r.Cum},${r["Cum%"]},${r.Name},${r.Time},${r.BuildID},${r.BuildTime}`)
    ].join("\n");
    ingestCSV(csv);
  };

  const ingestCSV = (text) => {
    setCsvText(text);
    const parsed = parseCSV(text);
    setRawData(parsed);
    const bs = [...new Set(parsed.map(r => r.BuildID))];
    setBuilds(bs);
    setSelectedBuild(bs[bs.length-1] || null);
    setSelectedFuncs([]);
  };

  // Auto-update when csvContent changes from polling
  useEffect(() => {
    if (csvContent && csvContent.trim()) {
      ingestCSV(csvContent);
    } else {
      // Load demo if no content provided
      loadDemo();
    }
  }, [csvContent]);

  // ── Filtered data ──
  const buildData = rawData.filter(r => !selectedBuild || r.BuildID === selectedBuild);
  const allFuncs = [...new Set(buildData.map(r => r.Name))];
  const filteredFuncs = allFuncs.filter(f => f.toLowerCase().includes(searchQ.toLowerCase()));

  const activeFuncs = selectedFuncs.length > 0 ? selectedFuncs
    : (() => {
      const latest = buildData.reduce((m, r) => r.Time > m ? r.Time : m, new Date(0));
      return [...buildData]
        .filter(r => +r.Time === +latest)
        .sort((a,b) => b.FlatBytes - a.FlatBytes)
        .slice(0,6).map(r => r.Name);
    })();

  const chartData = (() => {
    const times = [...new Set(buildData.map(r => +r.Time))].sort();
    return times.map(t => {
      const row = { time: t };
      activeFuncs.forEach(fn => {
        const found = buildData.find(r => +r.Time === t && r.Name === fn);
        row[fn] = found ? found[metric] : 0;
      });
      return row;
    });
  })();

  const latestSnapshot = (() => {
    const latest = buildData.reduce((m, r) => r.Time > m ? r.Time : m, new Date(0));
    return buildData.filter(r => +r.Time === +latest).sort((a,b) => b.FlatBytes - a.FlatBytes);
  })();

  const totalFlat = latestSnapshot.reduce((s,r) => s + r.FlatBytes, 0);
  const totalCum  = latestSnapshot.reduce((s,r) => s + r.CumBytes, 0);
  const topFunc   = latestSnapshot[0]?.Name?.split("/").pop().split(".")[0] || "—";
  const snapCount = [...new Set(buildData.map(r => +r.Time))].length;

  // ── File drop ──
  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer?.files[0] || e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => ingestCSV(ev.target.result);
    reader.readAsText(file);
  };

  // ── Bar chart data ──
  const barData = latestSnapshot.slice(0,12).map(r => ({
    name: r.Name.split("/").pop().slice(0,22),
    fullName: r.Name,
    flat: r.FlatBytes,
    cum: r.CumBytes,
  }));

  return (
    <div style={{ minHeight:"100vh", background:"#06060f", fontFamily:"'JetBrains Mono',monospace", color:"#ccc" }}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      {/* Header */}
      <div style={{ borderBottom:"1px solid #1a1a35", padding:"18px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#08080f" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:"#00ff9f", boxShadow:"0 0 12px #00ff9f", animation:"pulse 2s infinite" }} />
          <span style={{ color:"#00ff9f", fontSize:15, letterSpacing:3, textTransform:"uppercase", fontWeight:700 }}>heap.pprof</span>
          <span style={{ color:"#2a3a5a", fontSize:11 }}>// go server inspector</span>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input type="file" accept=".csv" ref={fileRef} style={{ display:"none" }} onChange={onDrop} />
          <button onClick={() => fileRef.current.click()} style={{
            background:"#0d0d1a", border:"1px solid #1e3a5f", borderRadius:6,
            color:"#6bcbff", cursor:"pointer", fontSize:11, padding:"7px 14px", letterSpacing:1
          }}>↑ Upload CSV</button>
          <button onClick={loadDemo} style={{
            background:"#0d0d1a", border:"1px solid #ff6b6b44", borderRadius:6,
            color:"#ff6b6b", cursor:"pointer", fontSize:11, padding:"7px 14px", letterSpacing:1
          }}>⚙ Demo Data</button>
        </div>
      </div>

      {isDragging && (
        <div style={{ position:"fixed", inset:0, background:"#00ff9f11", border:"3px dashed #00ff9f", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
          <span style={{ color:"#00ff9f", fontSize:22, letterSpacing:3 }}>DROP CSV HERE</span>
        </div>
      )}

      <div style={{ padding:"20px 28px" }}>
        {/* Build selector + metric */}
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          <div style={{ flex:"1", minWidth:200 }}>
            <div style={{ color:"#3a4a6a", fontSize:10, letterSpacing:2, marginBottom:6, textTransform:"uppercase" }}>Build</div>
            <select value={selectedBuild||""} onChange={e => { setSelectedBuild(e.target.value); setSelectedFuncs([]); }} style={{
              width:"100%", background:"#0d0d1a", border:"1px solid #1e3a5f", borderRadius:6,
              color:"#6bcbff", fontSize:12, padding:"8px 12px", cursor:"pointer"
            }}>
              {builds.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <div style={{ color:"#3a4a6a", fontSize:10, letterSpacing:2, marginBottom:6, textTransform:"uppercase" }}>Metric</div>
            <div style={{ display:"flex", gap:0, border:"1px solid #1e3a5f", borderRadius:6, overflow:"hidden" }}>
              {[["FlatBytes","Flat (live)"],["CumBytes","Cumulative"]].map(([val,lbl]) => (
                <button key={val} onClick={() => setMetric(val)} style={{
                  background: metric===val ? "#00ff9f22" : "#0d0d1a",
                  border:"none", borderRight:"1px solid #1e3a5f",
                  color: metric===val ? "#00ff9f" : "#4a5a7a",
                  cursor:"pointer", fontSize:11, padding:"8px 16px", letterSpacing:1,
                }}>{lbl}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          <StatCard label="Total Flat" value={fmt(totalFlat)} accent="#00ff9f" sub="live heap" />
          <StatCard label="Total Cum"  value={fmt(totalCum)}  accent="#6bcbff" sub="inc children" />
          <StatCard label="Top Alloc"  value={topFunc}        accent="#ffd93d" sub={latestSnapshot[0]?.Name?.slice(0,30)} />
          <StatCard label="Snapshots"  value={snapCount}      accent="#ff6b6b" sub={`${latestSnapshot.length} functions`} />
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #1a1a35", marginBottom:20 }}>
          {[["timeline","Timeline"],["flamebar","Breakdown"],["table","Raw Table"]].map(([key,lbl]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              background:"transparent", border:"none", borderBottom: tab===key ? "2px solid #00ff9f" : "2px solid transparent",
              color: tab===key ? "#00ff9f" : "#4a5a7a", cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace", fontSize:12, letterSpacing:2,
              padding:"10px 20px", textTransform:"uppercase", transition:"color 0.2s"
            }}>{lbl}</button>
          ))}
        </div>

        {/* ── Timeline ── */}
        {tab === "timeline" && (
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            <div style={{ flex:"2", minWidth:320 }}>
              <div style={{ background:"#0d0d1a", border:"1px solid #1a1a35", borderRadius:8, padding:20 }}>
                <div style={{ color:"#3a4a6a", fontSize:10, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Heap Over Time — {metric==="FlatBytes"?"Live Allocations":"Cumulative"}</div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData}>
                    <defs>
                      {activeFuncs.map((fn,i) => (
                        <linearGradient key={fn} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={COLORS[i%COLORS.length]} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={COLORS[i%COLORS.length]} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a35" />
                    <XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleTimeString()} stroke="#2a3a5a" tick={{ fontSize:10, fill:"#3a4a6a" }} />
                    <YAxis tickFormatter={fmt} stroke="#2a3a5a" tick={{ fontSize:10, fill:"#3a4a6a" }} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    {activeFuncs.map((fn,i) => (
                      <Area key={fn} type="monotone" dataKey={fn} stroke={COLORS[i%COLORS.length]}
                        fill={`url(#g${i})`} strokeWidth={2} dot={false} name={fn} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Function selector */}
            <div style={{ flex:"0 0 240px" }}>
              <div style={{ background:"#0d0d1a", border:"1px solid #1a1a35", borderRadius:8, padding:16, height:"100%" }}>
                <div style={{ color:"#3a4a6a", fontSize:10, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Filter Functions</div>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="search…" style={{
                  width:"100%", boxSizing:"border-box", background:"#06060f", border:"1px solid #1e3a5f",
                  borderRadius:4, color:"#ccc", fontFamily:"'JetBrains Mono',monospace", fontSize:11,
                  padding:"6px 10px", marginBottom:10
                }}/>
                <div style={{ maxHeight:320, overflowY:"auto" }}>
                  {filteredFuncs.map((fn,i) => {
                    const active = activeFuncs.includes(fn);
                    const colorIdx = activeFuncs.indexOf(fn);
                    return (
                      <div key={fn} onClick={() => {
                        setSelectedFuncs(prev =>
                          prev.includes(fn) ? prev.filter(f=>f!==fn) : [...prev, fn]
                        );
                      }} style={{
                        padding:"6px 8px", borderRadius:4, cursor:"pointer", marginBottom:2,
                        background: active ? `${COLORS[colorIdx%COLORS.length]}18` : "transparent",
                        border: active ? `1px solid ${COLORS[colorIdx%COLORS.length]}44` : "1px solid transparent",
                        transition:"all 0.15s"
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          {active && <div style={{ width:6, height:6, borderRadius:"50%", background: COLORS[colorIdx%COLORS.length], flexShrink:0 }}/>}
                          <span style={{ color: active ? "#ccc" : "#4a5a7a", fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {fn.split("/").pop()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedFuncs.length > 0 && (
                  <button onClick={() => setSelectedFuncs([])} style={{
                    marginTop:8, width:"100%", background:"transparent", border:"1px solid #ff6b6b33",
                    borderRadius:4, color:"#ff6b6b", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
                    fontSize:10, padding:"5px", letterSpacing:1
                  }}>✕ CLEAR</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Flamebar ── */}
        {tab === "flamebar" && (
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            <div style={{ flex:"1", minWidth:320, background:"#0d0d1a", border:"1px solid #1a1a35", borderRadius:8, padding:20 }}>
              <div style={{ color:"#3a4a6a", fontSize:10, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>Memory Breakdown (Latest Snapshot)</div>
              {latestSnapshot.slice(0,15).map((r,i) => (
                <FlameBar key={r.Name} name={r.Name} flat={r.FlatBytes} cum={r.CumBytes}
                  max={latestSnapshot[0]?.CumBytes || 1} color={COLORS[i%COLORS.length]} />
              ))}
            </div>
            <div style={{ flex:"1", minWidth:320, background:"#0d0d1a", border:"1px solid #1a1a35", borderRadius:8, padding:20 }}>
              <div style={{ color:"#3a4a6a", fontSize:10, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>Top Allocators (Bar)</div>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={barData} layout="vertical" margin={{ left:10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a35" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmt} stroke="#2a3a5a" tick={{ fontSize:9, fill:"#3a4a6a" }} />
                  <YAxis type="category" dataKey="name" stroke="#2a3a5a" tick={{ fontSize:9, fill:"#5a7a9a" }} width={130} />
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background:"#0a0a18", border:"1px solid #1e3a5f", fontFamily:"'JetBrains Mono',monospace", fontSize:11 }} />
                  <Bar dataKey="flat" name="Flat" radius={[0,3,3,0]}>
                    {barData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.85} />)}
                  </Bar>
                  <Bar dataKey="cum" name="Cum" radius={[0,3,3,0]} fillOpacity={0.25}>
                    {barData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Raw Table ── */}
        {tab === "table" && (
          <div style={{ background:"#0d0d1a", border:"1px solid #1a1a35", borderRadius:8, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid #1a1a35" }}>
                    {["Name","Flat","Flat%","Cum","Cum%","BuildID","Time"].map(h => (
                      <th key={h} style={{ color:"#3a4a6a", fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:2, padding:"12px 16px", textAlign:"left", textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestSnapshot.slice(0,40).map((r,i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #10101e", transition:"background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background="#0f0f22"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"10px 16px", fontSize:11, color:"#a0b4cc", maxWidth:300 }}>
                        <span style={{ color: COLORS[i%COLORS.length], marginRight:8 }}>■</span>
                        {r.Name}
                      </td>
                      <td style={{ padding:"10px 16px", fontSize:11, color:"#00ff9f", fontWeight:600 }}>{fmt(r.FlatBytes)}</td>
                      <td style={{ padding:"10px 16px", fontSize:11, color:"#4a5a7a" }}>{r["Flat%"]}</td>
                      <td style={{ padding:"10px 16px", fontSize:11, color:"#6bcbff" }}>{fmt(r.CumBytes)}</td>
                      <td style={{ padding:"10px 16px", fontSize:11, color:"#4a5a7a" }}>{r["Cum%"]}</td>
                      <td style={{ padding:"10px 16px", fontSize:10, color:"#2a4a6a" }}>{r.BuildID}</td>
                      <td style={{ padding:"10px 16px", fontSize:10, color:"#2a4a6a" }}>{r.Time?.toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Panel */}
        <AIPanel data={latestSnapshot} buildId={selectedBuild} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#06060f; }
        ::-webkit-scrollbar-thumb { background:#1e3a5f; border-radius:3px; }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 8px #00ff9f; }
          50% { box-shadow: 0 0 16px #00ff9f, 0 0 32px #00ff9f44; }
        }
        select option { background: #0d0d1a; }
      `}</style>
    </div>
  );
}
