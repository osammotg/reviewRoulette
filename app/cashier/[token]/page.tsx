"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";

const LiveClock = dynamic(() => import("@/components/LiveClock"), { ssr: false });
const ElapsedTime = dynamic(() => import("@/components/ElapsedTime"), { ssr: false });

interface ClaimData {
  restaurantName: string;
  timezone: string;
  prize: {
    label: string;
    description: string | null;
    emoji: string | null;
    imageUrl: string | null;
  };
  wonAt: string;
  claimedAt: string | null;
  status: "pending" | "redeemed";
}

export default function CashierPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    fetch(`/api/claim/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(() => setError("Invalid or expired claim token."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleRedeem() {
    if (!data || redeeming) return;
    setRedeeming(true);

    try {
      const res = await fetch(`/api/claim/${token}`, { method: "POST" });
      const result = await res.json();

      setData((prev) =>
        prev
          ? {
              ...prev,
              status: "redeemed",
              claimedAt: result.claimedAt,
            }
          : prev
      );
    } catch {
      setError("Failed to redeem. Please try again.");
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-gray-950">
        <div className="text-gray-400 animate-pulse">Loading...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-4 bg-gray-950">
        <div className="text-5xl">❌</div>
        <p className="text-red-400 text-center text-lg font-semibold">
          {error ?? "Claim not found."}
        </p>
      </main>
    );
  }

  const wonAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: data.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(data.wonAt));

  const claimedAtFormatted = data.claimedAt
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: data.timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(data.claimedAt))
    : null;

  const isRedeemed = data.status === "redeemed";

  return (
    <main className="min-h-dvh flex flex-col items-center px-4 py-8 safe-top safe-bottom gap-5 bg-gray-950">
      {/* Restaurant name */}
      <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">
        {data.restaurantName} — Cashier
      </p>

      {/* Status badge */}
      <div
        className={`w-full max-w-sm rounded-2xl py-4 px-6 text-center font-bold text-xl tracking-wide ${
          isRedeemed ? "bg-gray-700 text-gray-300" : "bg-emerald-600 text-white"
        }`}
      >
        {isRedeemed ? `REDEEMED at ${claimedAtFormatted}` : "NOT REDEEMED"}
      </div>

      {/* Prize */}
      <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-6 flex flex-col items-center gap-4 shadow-xl">
        {data.prize.imageUrl ? (
          <Image
            src={data.prize.imageUrl}
            alt={data.prize.label}
            width={100}
            height={100}
            className="rounded-2xl object-cover"
          />
        ) : (
          <div className="text-6xl">{data.prize.emoji ?? "🎁"}</div>
        )}

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-white">{data.prize.label}</h1>
          {data.prize.description && (
            <p className="text-gray-400 text-sm mt-1">{data.prize.description}</p>
          )}
        </div>
      </div>

      {/* Time info */}
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Won at</span>
          <span className="font-mono font-semibold text-white">{wonAt}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Current time</span>
          <LiveClock
            timezone={data.timezone}
            className="font-mono font-semibold text-white"
          />
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Time since win</span>
          <ElapsedTime since={data.wonAt} className="font-mono font-semibold text-amber-400" />
        </div>
      </div>

      {/* Redeem button */}
      {!isRedeemed ? (
        <button
          onClick={handleRedeem}
          disabled={redeeming}
          className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-lg rounded-2xl py-5 shadow-lg active:scale-95 transition-all"
        >
          {redeeming ? "Redeeming..." : "Redeem now"}
        </button>
      ) : (
        <div className="w-full max-w-sm bg-gray-800 rounded-2xl py-5 px-6 text-center">
          <p className="text-gray-400 font-semibold">
            Already redeemed at {claimedAtFormatted}
          </p>
        </div>
      )}

      <p className="text-gray-700 text-xs text-center max-w-xs">
        Staff only — do not share this page with customers.
      </p>
    </main>
  );
}
