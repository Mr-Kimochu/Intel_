import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function mergeTransects(profile) {
  const byDistance = new Map();

  for (const p of profile.transects.north_south) {
    byDistance.set(p.distance_m, { distance_m: p.distance_m, north_south: p.elevation_m });
  }
  for (const p of profile.transects.east_west) {
    const row = byDistance.get(p.distance_m) || { distance_m: p.distance_m };
    row.east_west = p.elevation_m;
    byDistance.set(p.distance_m, row);
  }

  return [...byDistance.values()].sort((a, b) => a.distance_m - b.distance_m);
}

export default function ElevationProfileChart({ profile }) {
  if (!profile) return null;
  const data = mergeTransects(profile);

  return (
    <div className="profile-chart">
      <h3>Terrain profile ({profile.length_m}m)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="distance_m" tickFormatter={(v) => `${v}m`} fontSize={11} />
          <YAxis tickFormatter={(v) => `${v}m`} width={50} fontSize={11} />
          <Tooltip formatter={(v) => `${v?.toFixed(1)} m`} labelFormatter={(v) => `${v}m from pin`} />
          <Legend />
          <Line type="monotone" dataKey="north_south" name="N–S" stroke="#2f5d1f" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="east_west" name="E–W" stroke="#b5651d" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
