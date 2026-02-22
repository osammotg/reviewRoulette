"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import Link from "next/link";

const LiveClock = dynamic(() => import("@/components/LiveClock"), { ssr: false });
const ElapsedTime = dynamic(() => import("@/components/ElapsedTime"), { ssr: false });

interface SpinResult {
  spinId: string;
  outcome: "win" | "noop";
  spunAt: string;
  prize: {
    id: string;
    label: string;
    description: string | null;
    emoji: string | null;
    imageUrl: string | null;
  } | null;
  claimToken: string | null;
  claimTokenShort: string | null;
  restaurantName: string;
  timezone: string;
  googleUrl?: string | null;
}

const AGING_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export default function ResultPage() {
  const { slug, spinId } = useParams<{ slug: string; spinId: string }>();
  const [result, setResult] = useState<SpinResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [aged, setAged] = useState(false);

  useEffect(() => {
    fetch(`/api/spin/${spinId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setResult(data);
      })
      .catch(() => setError("Could not load result."))
      .finally(() => setLoading(false));
  }, [spinId]);

  // Generate QR code for claim token
  useEffect(() => {
    if (!result?.claimToken) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const claimUrl = `${appUrl}/cashier/${result.claimToken}`;
    QRCode.toDataURL(claimUrl, { width: 180, margin: 2, color: { dark: "#111827", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [result?.claimToken]);

  // Aging check — re-evaluate every 30 seconds
  useEffect(() => {
    if (!result?.spunAt) return;
    function check() {
      setAged(Date.now() - new Date(result!.spunAt).getTime() > AGING_THRESHOLD_MS);
    }
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [result?.spunAt]);

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#F8F5F0]">
        <div className="text-[#9CA3AF] animate-pulse text-lg">Loading...</div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6 bg-[#F8F5F0]">
        <p className="text-[#DC2626] text-center">{error ?? "Result not found."}</p>
      </main>
    );
  }

  const wonAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: result.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(result.spunAt));

  if (result.outcome === "win" && result.prize) {
    return (
      <main
        className={`min-h-dvh flex flex-col items-center px-4 py-8 safe-top safe-bottom gap-5 transition-colors duration-1000 ${
          aged ? "bg-red-50" : "bg-[#F8F5F0]"
        }`}
      >
        {/* Header badge */}
        <div
          className={`w-full max-w-sm rounded-2xl py-3 px-4 text-center font-semibold text-base transition-colors duration-1000 ${
            aged
              ? "bg-red-100 text-[#DC2626]"
              : "bg-[#FDE6C8] text-[#D97706]"
          }`}
        >
          {aged ? "⚠️ VALID – NOT REDEEMED" : "✅ VALID – NOT REDEEMED"}
        </div>

        {/* Prize display */}
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          {result.prize.imageUrl ? (
            <Image
              src={result.prize.imageUrl}
              alt={result.prize.label}
              width={120}
              height={120}
              className="rounded-[20px] object-cover"
            />
          ) : (
            <div className="text-7xl">{result.prize.emoji ?? "🎁"}</div>
          )}

          <div className="text-center">
            <h1 className="text-3xl font-bold text-[#1F2937]">{result.prize.label}</h1>
            {result.prize.description && (
              <p className="text-[#6B7280] mt-1 text-sm">{result.prize.description}</p>
            )}
          </div>

          <p className="text-center text-[#6B7280] text-sm font-medium">
            Show this screen to the cashier
          </p>
        </div>

        {/* Time transparency */}
        <div className="w-full max-w-sm bg-white rounded-2xl p-4 space-y-2 text-sm shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Won at</span>
            <span className="font-mono font-semibold text-[#1F2937]">{wonAt}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Current time</span>
            <LiveClock timezone={result.timezone} className="font-mono font-semibold text-[#1F2937]" />
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B7280]">Time since win</span>
            <ElapsedTime
              since={result.spunAt}
              className={`font-mono font-semibold ${aged ? "text-[#DC2626]" : "text-[#15803D]"}`}
            />
          </div>
          {aged && (
            <p className="text-[#DC2626] text-xs text-center pt-1">
              This reward is still valid — no expiry applies.
            </p>
          )}
        </div>

        {/* Claim code + QR */}
        {result.claimTokenShort && (
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 flex flex-col items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <p className="text-[#6B7280] text-sm">Claim code</p>
            <p className="font-mono text-3xl font-bold tracking-[0.25em] text-[#1F2937]">
              {result.claimTokenShort}
            </p>
            {qrDataUrl && (
              <>
                <p className="text-[#9CA3AF] text-xs">or scan for cashier</p>
                <Image src={qrDataUrl} alt="Claim QR code" width={160} height={160} />
              </>
            )}
          </div>
        )}

        <p className="text-[#9CA3AF] text-xs text-center max-w-xs pb-4">
          {result.restaurantName}
        </p>
      </main>
    );
  }

  // No-win result
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-[#F8F5F0] safe-top safe-bottom gap-8">
      <div className="text-7xl">😔</div>

      <div className="text-center space-y-3">
        <h1 className="text-[30px] font-semibold text-[#1F2937]">Not this time!</h1>
        <p className="text-[#6B7280] text-base">
          Thanks for stopping by. Come back tomorrow for another spin.
        </p>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(result as any).capReached && (
        <div className="w-full max-w-sm bg-white rounded-2xl p-4 text-center shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <p className="text-[#6B7280] text-sm">
            No more prizes available today — check back tomorrow!
          </p>
        </div>
      )}

      {/* Secondary review nudge */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-5 flex flex-col items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <p className="text-[#6B7280] text-sm text-center">
          Enjoyed your visit? A review helps us a lot.
        </p>
        <Link
          href={`/r/${slug}`}
          className="text-[#D97706] text-sm font-medium underline"
        >
          Leave a Google review ↗
        </Link>
      </div>

      <Link
        href={`/r/${slug}`}
        className="text-[#9CA3AF] text-sm"
      >
        ← Back to start
      </Link>
    </main>
  );
}
