"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { WheelSegment } from "@/components/Wheel";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const Wheel = dynamic(() => import("@/components/Wheel"), { ssr: false });

// 4 empty slots per prize → ~20% of the wheel is coloured, looks honest
const NOOPS_PER_PRIZE = 4;

function buildPaddedSegments(prizes: WheelSegment[]): {
  segments: WheelSegment[];
  mapIndex: (serverIdx: number) => number;
} {
  const result: WheelSegment[] = [];
  const prizePositions: number[] = [];
  const noopPositions: number[] = [];

  prizes.forEach((prize, i) => {
    prizePositions[i] = result.length;
    result.push(prize);
    for (let j = 0; j < NOOPS_PER_PRIZE; j++) {
      noopPositions.push(result.length);
      result.push({ id: `__noop__${i}_${j}`, label: "", emoji: null });
    }
  });

  return {
    segments: result,
    mapIndex: (serverIdx: number) =>
      serverIdx < prizes.length
        ? prizePositions[serverIdx]
        : noopPositions[Math.floor(Math.random() * noopPositions.length)],
  };
}

interface RestaurantData {
  id: string;
  name: string;
  prizes: WheelSegment[];
  googleUrl: string | null;
}

export default function SpinPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [rateLimited, setRateLimited] = useState<{ nextEligibleAt: string | null } | null>(null);
  const spinResultRef = useRef<{ spinId: string; outcome: string } | null>(null);
  const fpRef = useRef<string>("");
  const mapIndexRef = useRef<(idx: number) => number>((i) => i);

  // Load restaurant + prizes
  useEffect(() => {
    fetch(`/api/r/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRestaurant(data);
        const { segments: padded, mapIndex } = buildPaddedSegments(data.prizes);
        setSegments(padded);
        mapIndexRef.current = mapIndex;
      })
      .catch(() => setError("Could not load this promotion."))
      .finally(() => setLoading(false));
  }, [slug]);

  // Load fingerprint
  useEffect(() => {
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        fpRef.current = result.visitorId;
      })
      .catch(() => {});
  }, []);

  async function handleSpin() {
    if (spinning || !restaurant) return;
    setSpinning(true);
    setError(null);

    try {
      const res = await fetch(`/api/r/${slug}/spin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprintToken: fpRef.current }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setRateLimited({ nextEligibleAt: data.nextEligibleAt ?? null });
        setSpinning(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Spin failed");
      }

      const data = await res.json();
      spinResultRef.current = { spinId: data.spinId, outcome: data.outcome };
      setTargetIndex(mapIndexRef.current(data.segmentIndex));
      // spinning stays true — wheel animation will call onSpinComplete
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSpinning(false);
    }
  }

  function handleSpinComplete() {
    const result = spinResultRef.current;
    if (!result) return;
    router.push(`/r/${slug}/result/${result.spinId}`);
  }

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="text-gray-400 animate-pulse text-lg">Loading...</div>
      </main>
    );
  }

  if (error && !spinning) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-red-400 text-center">{error}</p>
        <button
          onClick={() => setError(null)}
          className="text-gray-400 underline text-sm"
        >
          Try again
        </button>
      </main>
    );
  }

  if (rateLimited) {
    const next = rateLimited.nextEligibleAt
      ? new Date(rateLimited.nextEligibleAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="text-5xl">⏳</div>
        <h2 className="text-2xl font-bold">Already spun today</h2>
        <p className="text-gray-400">
          You&apos;ve already spun today. Come back tomorrow
          {next ? ` after ${next}` : ""}.
        </p>
        <p className="text-gray-600 text-sm">One spin per day, per device.</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom gap-8">
      {restaurant && (
        <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">
          {restaurant.name}
        </p>
      )}

      <h1 className="text-3xl font-extrabold text-white text-center">
        Spin the wheel
      </h1>

      {segments.length > 0 && (
        <Wheel
          segments={segments}
          targetIndex={targetIndex}
          onSpinComplete={handleSpinComplete}
          isSpinning={spinning}
        />
      )}

      <button
        onClick={handleSpin}
        disabled={spinning}
        className="w-full max-w-xs bg-red-500 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-xl rounded-2xl py-5 shadow-lg active:scale-95 transition-all"
      >
        {spinning ? "Spinning…" : "Spin"}
      </button>

      <p className="text-xs text-gray-600 text-center max-w-xs">
        One spin per day. No purchase required.
      </p>
    </main>
  );
}
