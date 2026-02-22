"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";

const LS_KEY = "qr_use_localhost";

export default function QRGenerator({ slug }: { slug: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [useLocalhost, setUseLocalhost] = useState(false);

  // Sync with dev toolbar toggle
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    setUseLocalhost(localStorage.getItem(LS_KEY) === "1");
    function handle() {
      setUseLocalhost(localStorage.getItem(LS_KEY) === "1");
    }
    window.addEventListener("qr-host-changed", handle);
    return () => window.removeEventListener("qr-host-changed", handle);
  }, []);

  const appUrl =
    typeof window !== "undefined"
      ? process.env.NODE_ENV === "development" && useLocalhost
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
      : "";
  const landingUrl = `${appUrl}/r/${slug}`;

  useEffect(() => {
    if (!appUrl) return;
    QRCode.toDataURL(landingUrl, {
      width: 256,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [appUrl, landingUrl]);

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${slug}.png`;
    a.click();
  }

  return (
    <section className="bg-white rounded-2xl p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <h2 className="font-semibold text-base text-[#1F2937]">QR Code</h2>

      <p className="text-sm text-[#6B7280] break-all">{landingUrl}</p>

      {qrDataUrl ? (
        <div className="flex flex-col items-start gap-3">
          <div className="bg-white rounded-2xl p-4 inline-block border border-[#E5E0D8]">
            <Image src={qrDataUrl} alt="QR code" width={200} height={200} />
          </div>
          <button
            onClick={handleDownload}
            className="text-sm bg-[#F1ECE4] hover:bg-[#E5DDD0] text-[#6B7280] hover:text-[#1F2937] px-4 py-2 rounded-xl transition-colors"
          >
            Download PNG
          </button>
        </div>
      ) : (
        <div className="w-32 h-32 bg-[#F1ECE4] rounded-2xl animate-pulse" />
      )}
    </section>
  );
}
