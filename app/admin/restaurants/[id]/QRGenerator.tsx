"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";

export default function QRGenerator({ slug }: { slug: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const appUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
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
    <section className="bg-gray-900 rounded-2xl p-5 space-y-4">
      <h2 className="font-semibold text-base">QR Code</h2>

      <p className="text-sm text-gray-400 break-all">{landingUrl}</p>

      {qrDataUrl ? (
        <div className="flex flex-col items-start gap-3">
          <div className="bg-white rounded-2xl p-4 inline-block">
            <Image src={qrDataUrl} alt="QR code" width={200} height={200} />
          </div>
          <button
            onClick={handleDownload}
            className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl"
          >
            Download PNG
          </button>
        </div>
      ) : (
        <div className="w-32 h-32 bg-gray-800 rounded-2xl animate-pulse" />
      )}
    </section>
  );
}
