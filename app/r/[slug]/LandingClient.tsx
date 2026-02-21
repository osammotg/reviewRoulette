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
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 safe-top safe-bottom">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo / Restaurant name */}
        <div className="flex flex-col items-center gap-3">
          {restaurant.logoUrl ? (
            <Image
              src={restaurant.logoUrl}
              alt={restaurant.name}
              width={80}
              height={80}
              className="rounded-2xl shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center text-3xl">
              🍽️
            </div>
          )}
          <h1 className="text-2xl font-bold text-white text-center">
            {restaurant.name}
          </h1>
        </div>

        {/* Hero text */}
        <div className="text-center space-y-2">
          <p className="text-4xl font-extrabold text-white tracking-tight">
            Spin &amp; Win
          </p>
          <p className="text-gray-400 text-base">
            Tap spin for a chance to win a reward. No purchase required.
          </p>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          {restaurant.googleUrl && (
            <button
              onClick={handleReviewClick}
              className="w-full bg-white text-gray-900 font-semibold rounded-2xl py-4 px-6 text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              <span>⭐</span>
              <span>Leave a Google review first</span>
              <span className="text-xs text-gray-500 ml-auto">↗</span>
            </button>
          )}

          <button
            onClick={handleSkip}
            className="w-full text-gray-400 font-medium py-3 text-sm active:text-white transition-colors"
          >
            Skip and continue →
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center max-w-xs">
          Leaving a review is completely optional and does not affect your reward.
        </p>
      </div>
    </main>
  );
}
