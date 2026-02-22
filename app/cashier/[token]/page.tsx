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
      <main className="min-h-dvh flex items-center justify-center bg-[#F8F5F0]">
        <div className="text-[#9CA3AF] animate-pulse">Loading...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-4 bg-[#F8F5F0]">
        <div className="text-5xl">❌</div>
        <p className="text-[#DC2626] text-center text-lg font-semibold">
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
    <main className="min-h-dvh flex flex-col items-center px-4 py-8 safe-top safe-bottom gap-5 bg-[#F8F5F0]">
      {/* Restaurant name */}
      <p className="text-[#9CA3AF] text-sm font-medium tracking-wide uppercase">
        {data.restaurantName} — Cashier
      </p>

      {/* Status badge */}
      <div
        className={`w-full max-w-sm rounded-2xl py-4 px-6 text-center font-bold text-xl tracking-wide ${
          isRedeemed
            ? "bg-[#F1ECE4] text-[#9CA3AF]"
            : "bg-[#D9F0E3] text-[#15803D]"
        }`}
      >
        {isRedeemed ? `REDEEMED at ${claimedAtFormatted}` : "NOT REDEEMED"}
      </div>

      {/* Prize */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        {data.prize.imageUrl ? (
          <Image
            src={data.prize.imageUrl}
            alt={data.prize.label}
            width={100}
            height={100}
            className="rounded-[20px] object-cover"
          />
        ) : (
          <div className="text-6xl">{data.prize.emoji ?? "🎁"}</div>
        )}

        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1F2937]">{data.prize.label}</h1>
          {data.prize.description && (
            <p className="text-[#6B7280] text-sm mt-1">{data.prize.description}</p>
          )}
        </div>
      </div>

      {/* Time info */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-4 space-y-2 text-sm shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between">
          <span className="text-[#6B7280]">Won at</span>
          <span className="font-mono font-semibold text-[#1F2937]">{wonAt}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B7280]">Current time</span>
          <LiveClock
            timezone={data.timezone}
            className="font-mono font-semibold text-[#1F2937]"
          />
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B7280]">Time since win</span>
          <ElapsedTime since={data.wonAt} className="font-mono font-semibold text-[#D97706]" />
        </div>
      </div>

      {/* Redeem button */}
      {!isRedeemed ? (
        <button
          onClick={handleRedeem}
          disabled={redeeming}
          className="w-full max-w-sm bg-[#15803D] hover:bg-[#166534] disabled:bg-[#F1ECE4] disabled:text-[#9CA3AF] text-white font-bold text-lg rounded-full py-5 shadow-[0_4px_20px_rgba(21,128,61,0.2)] active:scale-95 transition-all"
        >
          {redeeming ? "Redeeming..." : "Redeem now"}
        </button>
      ) : (
        <div className="w-full max-w-sm bg-[#F1ECE4] rounded-2xl py-5 px-6 text-center">
          <p className="text-[#9CA3AF] font-semibold">
            Already redeemed at {claimedAtFormatted}
          </p>
        </div>
      )}

      <p className="text-[#9CA3AF] text-xs text-center max-w-xs">
        Staff only — do not share this page with customers.
      </p>
    </main>
  );
}
