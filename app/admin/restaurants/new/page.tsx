"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function NewRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    googleUrl: "",
    timezone: "Europe/Zurich",
    dailyWinCap: "",
  });

  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: f.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          logoUrl: form.logoUrl || null,
          googleUrl: form.googleUrl || null,
          timezone: form.timezone,
          dailyWinCap: form.dailyWinCap ? parseInt(form.dailyWinCap) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");

      router.push(`/admin/restaurants/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">
          ← Restaurants
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold">New restaurant</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Restaurant name *">
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className={INPUT_CLASS}
            placeholder="My Café"
          />
        </Field>

        <Field label="URL slug *" hint="/r/[slug]">
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
            required
            pattern="[a-z0-9-]+"
            className={INPUT_CLASS}
            placeholder="my-cafe"
          />
        </Field>

        <Field label="Logo URL">
          <input
            type="url"
            value={form.logoUrl}
            onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
            className={INPUT_CLASS}
            placeholder="https://..."
          />
        </Field>

        <Field label="Google review URL">
          <input
            type="url"
            value={form.googleUrl}
            onChange={(e) => setForm((f) => ({ ...f, googleUrl: e.target.value }))}
            className={INPUT_CLASS}
            placeholder="https://maps.google.com/..."
          />
        </Field>

        <Field label="Timezone">
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
        </Field>

        <Field label="Daily win cap" hint="Max total wins per day (leave blank for unlimited)">
          <input
            type="number"
            value={form.dailyWinCap}
            onChange={(e) => setForm((f) => ({ ...f, dailyWinCap: e.target.value }))}
            className={INPUT_CLASS}
            placeholder="e.g. 50"
            min={1}
          />
        </Field>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create restaurant"}
          </button>
          <Link
            href="/admin"
            className="text-gray-400 hover:text-white px-6 py-3 rounded-xl bg-gray-800 font-medium"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

const INPUT_CLASS =
  "w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">
        {label}
        {hint && <span className="text-gray-500 ml-2 text-xs">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
