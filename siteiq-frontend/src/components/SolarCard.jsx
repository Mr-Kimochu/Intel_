import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import Modal from "./Modal";

const VIABILITY_CONFIG = {
  excellent: { color: "#22c55e", label: "Excellent" },
  good:      { color: "#84cc16", label: "Good"      },
  moderate:  { color: "#f59e0b", label: "Moderate"  },
  poor:      { color: "#ef4444", label: "Poor"       },
};

function Chart({ monthly, annual, color, height = 120 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={monthly} margin={{ top: 0, right: 4, bottom: 0, left: -14 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="month" tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 9 }} unit=" kWh" width={42} />
        <Tooltip
          formatter={(v) => [`${v} kWh/m²/day`, "Solar GHI"]}
          labelStyle={{ fontSize: 11 }}
          contentStyle={{ fontSize: 11 }}
        />
        <ReferenceLine y={annual} stroke="#9ca3af" strokeDasharray="4 2" />
        <Bar dataKey="solar_ghi" fill={color} opacity={0.75} radius={[2,2,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function SolarCard({ climate }) {
  const [modal, setModal] = useState(false);
  if (!climate?.monthly) return null;

  const { monthly, summary, period } = climate;
  const viability = summary?.solar_viability ?? "moderate";
  const cfg       = VIABILITY_CONFIG[viability] ?? VIABILITY_CONFIG.moderate;
  const annual    = summary?.annual_solar_ghi ?? 0;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            background: cfg.color, color: "#fff", fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.05em",
            padding: "2px 8px", borderRadius: 20,
          }}>
            {cfg.label}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
            {annual} kWh/m²/day
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

      <Chart monthly={monthly} annual={annual} color={cfg.color} height={110} />

      <p style={{ margin: "6px 0 0", fontSize: 10, color: "#9ca3af" }}>
        {period ?? "2015–2024"} mean · NASA POWER
      </p>

      <Modal open={modal} onClose={() => setModal(false)} title={`Solar Potential · ${period ?? "2015–2024"}`}>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
          {summary?.solar_note}
        </p>
        <Chart monthly={monthly} annual={annual} color={cfg.color} height={260} />
        <p style={{ margin: "12px 0 0", fontSize: 11, color: "#9ca3af" }}>
          GHI = Global Horizontal Irradiance. Values averaged from {period ?? "2015–2024"}
          monthly observations. Reference line = annual mean.
        </p>
      </Modal>
    </>
  );
}