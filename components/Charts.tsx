"use client";

const PALETTE = ["#0176d3", "#2e844a", "#fe9339", "#9050e9", "#ba0517", "#06a59a", "#e4a201"];

export function BarChart({ data, height = 220 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", height, padding: "0.5rem 0" }}>
      {data.map((d, i) => (
        <div key={d.label} style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 600 }}>{d.value}</div>
          <div
            style={{
              background: PALETTE[i % PALETTE.length],
              height: `${(d.value / max) * 100}%`,
              borderRadius: "4px 4px 0 0",
              minHeight: 2,
              transition: "height 0.3s",
            }}
          />
          <div style={{ fontSize: "0.68rem", color: "var(--sf-text-weak)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data, size = 180 }: { data: { label: string; value: number }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  let offset = 0;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <svg width={size} height={size}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * circ;
            const seg = (
              <circle
                key={d.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={24}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="700">
          {total}
        </text>
      </svg>
      <div>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", marginBottom: 3 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length] }} />
            {d.label} <span className="muted">({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
