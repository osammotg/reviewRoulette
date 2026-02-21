"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface AnalyticsData {
  summary: {
    landingViews: number;
    reviewClicks: number;
    spinAttempts: number;
    wins: number;
    claims: number;
    capHits: number;
  };
  rates: {
    winRate: number;
    claimRate: number;
    reviewClickRate: number;
  };
  timeSeries: { date: string; wins: number; spins: number; claims: number }[];
  prizeBreakdown: {
    prizeId: string;
    label: string;
    emoji: string | null;
    wins: number;
    claims: number;
  }[];
  avgMinutesToClaim: number | null;
}

export default function AnalyticsDashboard({
  restaurantId,
  restaurantName,
  initialPeriod,
}: {
  restaurantId: string;
  restaurantName: string;
  initialPeriod: "7d" | "30d";
}) {
  const [period, setPeriod] = useState<"7d" | "30d">(initialPeriod);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/restaurants/${restaurantId}/analytics?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [restaurantId, period]);

  return (
    <div className="space-y-6">
      {/* Period switcher */}
      <div className="flex gap-2">
        {(["7d", "30d"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p
                ? "bg-white text-gray-900"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Last {p === "7d" ? "7 days" : "30 days"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Page views" value={data.summary.landingViews} />
            <StatCard label="Review clicks" value={data.summary.reviewClicks} sub={`${data.rates.reviewClickRate}% of views`} />
            <StatCard label="Spins" value={data.summary.spinAttempts} />
            <StatCard label="Wins" value={data.summary.wins} sub={`${data.rates.winRate}% win rate`} color="emerald" />
            <StatCard label="Claims" value={data.summary.claims} sub={`${data.rates.claimRate}% claim rate`} color="blue" />
            <StatCard
              label="Cap hits"
              value={data.summary.capHits}
              sub={data.avgMinutesToClaim !== null ? `avg ${data.avgMinutesToClaim}m to claim` : undefined}
              color={data.summary.capHits > 0 ? "amber" : undefined}
            />
          </div>

          {/* Time series chart */}
          <div className="bg-gray-900 rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4 text-gray-300">
              Spins vs wins vs claims — {restaurantName}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.timeSeries} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "none", borderRadius: 8 }}
                  labelStyle={{ color: "#9CA3AF" }}
                />
                <Line type="monotone" dataKey="spins" stroke="#6B7280" dot={false} strokeWidth={2} name="Spins" />
                <Line type="monotone" dataKey="wins" stroke="#10B981" dot={false} strokeWidth={2} name="Wins" />
                <Line type="monotone" dataKey="claims" stroke="#3B82F6" dot={false} strokeWidth={2} name="Claims" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-end">
              <Legend color="#6B7280" label="Spins" />
              <Legend color="#10B981" label="Wins" />
              <Legend color="#3B82F6" label="Claims" />
            </div>
          </div>

          {/* Prize breakdown */}
          {data.prizeBreakdown.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-4 text-gray-300">Prize breakdown</h3>
              <div className="space-y-2">
                {data.prizeBreakdown
                  .sort((a, b) => b.wins - a.wins)
                  .map((p) => (
                    <div
                      key={p.prizeId}
                      className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                    >
                      <span className="text-sm">
                        {p.emoji ?? "🎁"} {p.label}
                      </span>
                      <div className="flex gap-4 text-sm text-gray-400">
                        <span>
                          <span className="text-emerald-400 font-medium">{p.wins}</span> wins
                        </span>
                        <span>
                          <span className="text-blue-400 font-medium">{p.claims}</span> claims
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-400 text-sm">Failed to load analytics.</p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  color?: "emerald" | "blue" | "amber";
}) {
  const valueClass = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    undefined: "text-white",
  }[color ?? "undefined"];

  return (
    <div className="bg-gray-900 rounded-2xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueClass}`}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-full" style={{ background: color }} />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}
