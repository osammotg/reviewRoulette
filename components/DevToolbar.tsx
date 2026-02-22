"use client";

import { useEffect, useState } from "react";

const LS_KEY = "qr_use_localhost";

// Inner component owns state — only mounted in dev
function DevToolbarInner() {
  const [useLocalhost, setUseLocalhost] = useState(false);

  useEffect(() => {
    setUseLocalhost(localStorage.getItem(LS_KEY) === "1");
  }, []);

  function toggle() {
    const next = !useLocalhost;
    setUseLocalhost(next);
    localStorage.setItem(LS_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event("qr-host-changed"));
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-[#1F2937]/90 backdrop-blur-sm text-white text-xs">
      <p className="text-[#9CA3AF]">
        <span className="font-semibold text-white">Review Roulette</span>
        {" "}— spin-to-win loyalty platform that rewards restaurant guests and drives Google reviews.
      </p>
      <button
        onClick={toggle}
        className={`ml-4 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          useLocalhost
            ? "bg-[#D97706] text-white"
            : "bg-white/10 text-[#9CA3AF] hover:bg-white/20 hover:text-white"
        }`}
      >
        {useLocalhost ? "QR → localhost ✓" : "QR → localhost"}
      </button>
    </div>
  );
}

// Outer component: renders nothing in production
export default function DevToolbar() {
  if (process.env.NODE_ENV !== "development") return null;
  return <DevToolbarInner />;
}
