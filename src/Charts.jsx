import { useEffect, useId, useRef, useState } from 'react';

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// series: [{ label, color, data: number[], fill?: bool, dashed?: bool }]
// labels: string for each point (shown on the x axis and in the tooltip)
export function LineChart({ series, labels, height = 280, fmt = (v) => v.toFixed(2) }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const gid = useId();
  const pad = { l: 4, r: 62, t: 14, b: 26 };
  const n = series[0].data.length;

  let min = Infinity, max = -Infinity;
  for (const s of series) for (const v of s.data) { if (v < min) min = v; if (v > max) max = v; }
  const span = max - min || 1;
  min -= span * 0.1; max += span * 0.1;

  const iw = Math.max(10, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const x = (i) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * iw);
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * ih;
  const line = (d) => d.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

  const yTicks = [0, 1, 2, 3].map((k) => min + ((k + 0.5) / 4) * (max - min));
  const xTicks = [0.08, 0.36, 0.64, 0.92].map((f) => Math.round(f * (n - 1)));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - pad.l) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const h = hover != null && hover < n ? hover : null;

  return (
    <div className="chart" ref={ref}>
      <svg width={w} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img"
        aria-label={`Line chart: ${series.map((s) => s.label).join(' and ')}`}>
        <defs>
          {series.map((s, k) => (
            <linearGradient key={k} id={`${gid}-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {yTicks.map((v, k) => (
          <g key={k}>
            <line x1={pad.l} x2={pad.l + iw} y1={y(v)} y2={y(v)} className="grid" />
            <text x={w - 4} y={y(v) + 4} textAnchor="end" className="axis">{fmt(v)}</text>
          </g>
        ))}
        {xTicks.map((i, k) => (
          <text key={k} x={x(i)} y={height - 6} textAnchor="middle" className="axis">{labels[i]}</text>
        ))}
        {series.map((s, k) => (
          <g key={k}>
            {s.fill && (
              <path d={`${line(s.data)}L${x(n - 1)},${pad.t + ih}L${x(0)},${pad.t + ih}Z`} fill={`url(#${gid}-${k})`} />
            )}
            <path d={line(s.data)} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.25 : 1.75}
              strokeDasharray={s.dashed ? '4 4' : undefined} strokeLinejoin="round" />
            {h == null && <circle cx={x(n - 1)} cy={y(s.data[n - 1])} r="3" fill={s.color} />}
          </g>
        ))}
        {h != null && (
          <g>
            <line x1={x(h)} x2={x(h)} y1={pad.t} y2={pad.t + ih} className="cross" />
            {series.map((s, k) => (
              <circle key={k} cx={x(h)} cy={y(s.data[h])} r="3.5" fill="#000" stroke={s.color} strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {h != null && (
        <div className="tip" style={x(h) > w / 2 ? { right: w - x(h) + 12 } : { left: x(h) + 12 }}>
          <div className="tip-date">{labels[h]}</div>
          {series.map((s, k) => (
            <div key={k} className="tip-row">
              <i style={{ background: s.color }} />
              <span>{s.label}</span>
              <b>{fmt(s.data[h])}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ data, color, width = 72, height = 24 }) {
  let min = Infinity, max = -Infinity;
  for (const v of data) { if (v < min) min = v; if (v > max) max = v; }
  const span = max - min || 1;
  const n = data.length;
  const d = data
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (n - 1 || 1)) * width).toFixed(1)},${(2 + (1 - (v - min) / span) * (height - 4)).toFixed(1)}`)
    .join('');
  return (
    <svg width={width} height={height} aria-hidden="true" className="spark">
      <path d={d} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

// parts: [{ label, value, color }]
export function Donut({ parts, centerTop, centerMain, size = 190 }) {
  const [hot, setHot] = useState(null);
  const r = 70, c = 2 * Math.PI * r;
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  let acc = 0;
  const hp = hot != null ? parts[hot] : null;
  return (
    <svg width={size} height={size} viewBox="0 0 190 190" role="img" aria-label="Portfolio allocation donut chart">
      <g transform="rotate(-90 95 95)">
        {parts.map((p, i) => {
          const len = (p.value / total) * c;
          const gap = parts.length > 1 ? 2 : 0;
          const el = (
            <circle key={p.label} cx="95" cy="95" r={r} fill="none" stroke={p.color}
              strokeWidth={hot === i ? 20 : 15}
              strokeDasharray={`${Math.max(0.5, len - gap)} ${c}`} strokeDashoffset={-acc}
              opacity={hot == null || hot === i ? 1 : 0.35}
              onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}
              style={{ transition: 'stroke-width .15s, opacity .15s' }} />
          );
          acc += len;
          return el;
        })}
      </g>
      <text x="95" y="86" textAnchor="middle" className="donut-top">{hp ? hp.label : centerTop}</text>
      <text x="95" y="110" textAnchor="middle" className="donut-main">
        {hp ? `${((hp.value / total) * 100).toFixed(1)}%` : centerMain}
      </text>
    </svg>
  );
}
