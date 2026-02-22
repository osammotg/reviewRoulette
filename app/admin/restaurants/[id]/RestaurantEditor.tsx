"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Restaurant } from "@/app/generated/prisma/client";

interface ParsedGoogleResult {
  reviewUrl: string;
  mapsUrl: string;
}

function parseGoogleInput(input: string): ParsedGoogleResult | null {
  const text = input.trim();

  // 1. Direct Place ID (ChIJ...)
  const placeIdMatch = text.match(/ChIJ[A-Za-z0-9_-]{10,}/);
  if (placeIdMatch) {
    const placeId = placeIdMatch[0];
    return {
      reviewUrl: `https://search.google.com/local/writereview?placeid=${placeId}`,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    };
  }

  // 2. Hex CID from Maps URL or iframe embed (handles %3A URL encoding)
  const decoded = text.replace(/%3A/gi, ":");
  const cidMatch = decoded.match(/!1s(0x[0-9a-f]+):(0x[0-9a-f]+)/i);
  if (cidMatch) {
    const cid = BigInt(cidMatch[2]).toString();
    return {
      reviewUrl: `https://search.google.com/local/writereview?cid=${cid}`,
      mapsUrl: `https://www.google.com/maps?cid=${cid}`,
    };
  }

  return null;
}

const TIMEZONES = [
  "Europe/Zurich",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const INPUT_CLASS =
  "w-full bg-[#F8F5F0] border border-[#E5E0D8] rounded-xl px-4 py-2.5 text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#D97706] text-sm";

export default function RestaurantEditor({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [googleRaw, setGoogleRaw] = useState("");
  const [parsedGoogle, setParsedGoogle] = useState<ParsedGoogleResult | null>(null);
  const [linkType, setLinkType] = useState<"review" | "maps">("review");
  const [form, setForm] = useState({
    name: restaurant.name,
    slug: restaurant.slug,
    logoUrl: restaurant.logoUrl ?? "",
    googleUrl: restaurant.googleUrl ?? "",
    timezone: restaurant.timezone,
    dailyWinCap: restaurant.dailyWinCap?.toString() ?? "",
    active: restaurant.active,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          logoUrl: form.logoUrl || null,
          googleUrl: form.googleUrl || null,
          timezone: form.timezone,
          dailyWinCap: form.dailyWinCap ? parseInt(form.dailyWinCap) : null,
          active: form.active,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${restaurant.name}"? This cannot be undone.`)) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <h2 className="font-semibold text-base text-[#1F2937]">Restaurant settings</h2>

      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#6B7280] mb-1 block">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] mb-1 block">Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
              required
              pattern="[a-z0-9-]+"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[#6B7280] mb-1 block">Logo URL</label>
          <input
            type="url"
            value={form.logoUrl}
            onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
            className={INPUT_CLASS}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[#6B7280] mb-1 block">Google review URL</label>
          <textarea
            value={googleRaw}
            onChange={(e) => {
              const raw = e.target.value;
              setGoogleRaw(raw);
              if (raw.trim() === "") {
                setParsedGoogle(null);
                return;
              }
              const result = parseGoogleInput(raw);
              setParsedGoogle(result);
              if (result) {
                setLinkType("review");
                setForm((f) => ({ ...f, googleUrl: result.reviewUrl }));
              }
            }}
            className={`${INPUT_CLASS} resize-none h-20`}
            placeholder="Paste your Google Maps URL, embed code, or Place ID (ChIJ...)"
          />

          {googleRaw.trim() !== "" && parsedGoogle ? (
            <div className="space-y-2">
              <p className="text-[#15803D] text-xs font-medium">✓ Restaurant ID found</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLinkType("review");
                    setForm((f) => ({ ...f, googleUrl: parsedGoogle.reviewUrl }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    linkType === "review"
                      ? "bg-[#D97706] text-white"
                      : "bg-[#F1ECE4] text-[#6B7280] hover:bg-[#E5DDD0] hover:text-[#1F2937]"
                  }`}
                >
                  Write review link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLinkType("maps");
                    setForm((f) => ({ ...f, googleUrl: parsedGoogle.mapsUrl }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    linkType === "maps"
                      ? "bg-[#D97706] text-white"
                      : "bg-[#F1ECE4] text-[#6B7280] hover:bg-[#E5DDD0] hover:text-[#1F2937]"
                  }`}
                >
                  Maps link
                </button>
              </div>
              <p className="text-[#9CA3AF] text-xs truncate">{form.googleUrl}</p>
            </div>
          ) : googleRaw.trim() !== "" ? (
            <p className="text-[#DC2626] text-xs">
              ⚠️ Could not extract ID — paste a Google Maps URL, embed code, or Place ID (ChIJ...)
            </p>
          ) : (
            <input
              type="text"
              value={form.googleUrl}
              onChange={(e) => setForm((f) => ({ ...f, googleUrl: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="https://search.google.com/local/writereview?..."
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#6B7280] mb-1 block">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              className={INPUT_CLASS}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#6B7280] mb-1 block">Daily win cap</label>
            <input
              type="number"
              value={form.dailyWinCap}
              onChange={(e) => setForm((f) => ({ ...f, dailyWinCap: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="Unlimited"
              min={1}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-[#6B7280]">Promotion active</span>
        </label>

        {error && <p className="text-[#DC2626] text-sm">{error}</p>}
        {success && <p className="text-[#15803D] text-sm">Saved.</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#D97706] hover:bg-[#B45309] text-white font-semibold px-5 py-2.5 rounded-full text-sm disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-[#DC2626] hover:text-red-700 px-4 py-2.5 rounded-xl bg-[#F1ECE4] text-sm ml-auto transition-colors"
          >
            {deleting ? "Deleting..." : "Delete restaurant"}
          </button>
        </div>
      </form>
    </section>
  );
}
