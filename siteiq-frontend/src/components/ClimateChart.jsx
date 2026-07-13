import { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import Modal from "./Modal";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 6, padding: "8px 12px", fontSize: 11,
    }}>
      <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "2px 0", color: p.color }}>
          {p.name}: {p.value}
          {p.name.includes("Rain") ? " mm" : "°C"}
        </p>
      ))}
    </div>
  );
};

function Chart({ data, height = 170 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="month" tick={{ fontSize: 9 }} />
        <YAxis yAxisId="rain" orientation="left"  tick={{ fontSize: 9 }} unit="mm" width={36} />
        <YAxis yAxisId="temp" orientation="right" tick={{ fontSize: 9 }} unit="°"  width={28} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        <Bar yAxisId="rain" dataKey="rainfall_mm" name="Rainfall" fill="#4a9eff" opacity={0.7} radius={[2,2,0,0]} />
        <Line yAxisId="temp" dataKey="temp_max_c" name="Temp max" stroke="#f97316" dot={false} strokeWidth={1.5} />
        <Line yAxisId="temp" dataKey="temp_min_c" name="Temp min" stroke="#6b7280" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default function ClimateChart({ climate }) {
  const [modal, setModal] = useState(false);
  if (!climate?.monthly) return null;

  const { monthly, summary, period } = climate;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
            {summary?.annual_rainfall_mm ?? "—"} mm/yr
          </span>
          <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>
            Wet: {summary?.wet_months?.join(", ") ?? "—"}
          </span>
        </div>
        <button
          onClick={() => setModal(true)}
          style={{
            fontSize: 11, padding: "3px 9px", background: "#f3f4f6",
            border: "1px solid #e5e7eb", borderRadius: 5, cursor: "pointer",
            fontFamily: "var(--font-body)", color: "#374151",
          }}
        >
          Expand
        </button>
      </div>

      <Chart data={monthly} height={155} />

      <p style={{ margin: "6px 0 0", fontSize: 10, color: "#9ca3af" }}>
        {period ?? "2015–2024"} monthly mean · NASA POWER
      </p>

      <Modal open={modal} onClose={() => setModal(false)} title={`Rainfall & Temperature · ${period ?? "2015–2024"}`}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          <div className="stat" style={{ flex: 1, minWidth: 100 }}>
            <span className="stat-label">Annual Rain</span>
            <span className="stat-value" style={{ fontSize: 16 }}>{summary?.annual_rainfall_mm} mm</span>
          </div>
          <div className="stat" style={{ flex: 1, minWidth: 100 }}>
            <span className="stat-label">Wet months</span>
            <span className="stat-value" style={{ fontSize: 12, fontFamily: "var(--font-body)" }}>
              {summary?.wet_months?.join(", ")}
            </span>
          </div>
        </div>
        <Chart data={monthly} height={280} />
        <p style={{ margin: "10px 0 0", fontSize: 11, color: "#9ca3af" }}>
          Monthly averages computed from {period ?? "2015–2024"} actual NASA POWER data.
          More relevant than a 30-year climatological mean for current site planning.
        </p>
      </Modal>
    </>
  );
}