"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Props {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string | null;
    googleUrl: string | null;
    slug: string;
  };
}

export default function LandingClient({ restaurant }: Props) {
  const router = useRouter();

  useEffect(() => {
    // Track landing_view once per browser session
    const key = `lv_${restaurant.id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      fetch(`/api/r/${restaurant.slug}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "landing_view" }),
      }).catch(() => {});
    }
  }, [restaurant.id, restaurant.slug]);

  function handleReviewClick() {
    fetch(`/api/r/${restaurant.slug}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "review_click" }),
    }).catch(() => {});

    if (restaurant.googleUrl) {
      window.open(restaurant.googleUrl, "_blank", "noopener,noreferrer");
    }

    // Proceed to spin after a short delay to let the new tab open
    setTimeout(() => {
      router.push(`/r/${restaurant.slug}/spin`);
    }, 400);
  }

  function handleSkip() {
    router.push(`/r/${restaurant.slug}/spin`);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-[#F8F5F0] safe-top safe-bottom">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo / Restaurant name */}
        <div className="flex flex-col items-center gap-4">
          {restaurant.logoUrl ? (
            <Image
              src={restaurant.logoUrl}
              alt={restaurant.name}
              width={96}
              height={96}
              className="rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
            />
          ) : (
            <div className="w-24 h-24 rounded-[20px] bg-[#F1ECE4] flex items-center justify-center text-4xl shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              🍽️
            </div>
          )}
          <h2 className="text-lg font-semibold text-[#6B7280] text-center">
            {restaurant.name}
          </h2>
        </div>

        {/* Hero text */}
        <div className="text-center space-y-3">
          <h1 className="text-[30px] font-semibold text-[#1F2937] tracking-tight">
            Spin &amp; Win
          </h1>
          <p className="text-[#6B7280] text-base">
            Tap spin for a chance to win a reward. No purchase required.
          </p>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-4">
          {restaurant.googleUrl && (
            <button
              onClick={handleReviewClick}
              className="w-full bg-[#D97706] hover:bg-[#B45309] text-white font-semibold rounded-full py-4 px-6 text-base flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(217,119,6,0.25)] active:scale-95 transition-all"
            >
              <span>⭐</span>
              <span>Leave a Google review first</span>
              <span className="text-amber-200 ml-auto text-sm">↗</span>
            </button>
          )}

          <button
            onClick={handleSkip}
            className="w-full text-[#9CA3AF] font-medium py-3 text-sm active:text-[#6B7280] transition-colors"
          >
            Skip and continue →
          </button>
        </div>

        <p className="text-xs text-[#9CA3AF] text-center max-w-xs">
          Leaving a review is completely optional and does not affect your reward.
        </p>
      </div>
    </main>
  );
}
