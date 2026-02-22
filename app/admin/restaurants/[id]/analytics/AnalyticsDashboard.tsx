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
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              period === p
                ? "bg-[#D97706] text-white"
                : "bg-[#F1ECE4] text-[#6B7280] hover:text-[#1F2937]"
            }`}
          >
            Last {p === "7d" ? "7 days" : "30 days"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#F1ECE4] rounded-2xl h-24 animate-pulse" />
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
          <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <h3 className="font-semibold text-sm mb-4 text-[#6B7280]">
              Spins vs wins vs claims — {restaurantName}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.timeSeries} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E0D8", borderRadius: 8 }}
                  labelStyle={{ color: "#6B7280" }}
                />
                <Line type="monotone" dataKey="spins" stroke="#9CA3AF" dot={false} strokeWidth={2} name="Spins" />
                <Line type="monotone" dataKey="wins" stroke="#D97706" dot={false} strokeWidth={2} name="Wins" />
                <Line type="monotone" dataKey="claims" stroke="#15803D" dot={false} strokeWidth={2} name="Claims" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-end">
              <Legend color="#9CA3AF" label="Spins" />
              <Legend color="#D97706" label="Wins" />
              <Legend color="#15803D" label="Claims" />
            </div>
          </div>

          {/* Prize breakdown */}
          {data.prizeBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <h3 className="font-semibold text-sm mb-4 text-[#6B7280]">Prize breakdown</h3>
              <div className="space-y-2">
                {data.prizeBreakdown
                  .sort((a, b) => b.wins - a.wins)
                  .map((p) => (
                    <div
                      key={p.prizeId}
                      className="flex items-center justify-between py-2 border-b border-[#F1ECE4] last:border-0"
                    >
                      <span className="text-sm text-[#1F2937]">
                        {p.emoji ?? "🎁"} {p.label}
                      </span>
                      <div className="flex gap-4 text-sm text-[#9CA3AF]">
                        <span>
                          <span className="text-[#D97706] font-medium">{p.wins}</span> wins
                        </span>
                        <span>
                          <span className="text-[#15803D] font-medium">{p.claims}</span> claims
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-[#9CA3AF] text-sm">Failed to load analytics.</p>
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
    emerald: "text-[#15803D]",
    blue: "text-blue-500",
    amber: "text-[#D97706]",
    undefined: "text-[#1F2937]",
  }[color ?? "undefined"];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <p className="text-xs text-[#9CA3AF] mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueClass}`}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-[#9CA3AF] mt-1">{sub}</p>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-full" style={{ background: color }} />
      <span className="text-xs text-[#9CA3AF]">{label}</span>
    </div>
  );
}
