"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Prize, Restaurant } from "@/app/generated/prisma/client";

const INPUT_CLASS =
  "w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#D97706] text-sm";

interface PrizeForm {
  label: string;
  description: string;
  imageUrl: string;
  emoji: string;
  weight: string;
  dailyCap: string;
  active: boolean;
  isFallback: boolean;
}

const emptyForm: PrizeForm = {
  label: "",
  description: "",
  imageUrl: "",
  emoji: "",
  weight: "5",
  dailyCap: "",
  active: true,
  isFallback: false,
};

export default function PrizeManager({
  restaurant,
  prizes,
}: {
  restaurant: Restaurant;
  prizes: Prize[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PrizeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(prize: Prize) {
    setForm({
      label: prize.label,
      description: prize.description ?? "",
      imageUrl: prize.imageUrl ?? "",
      emoji: prize.emoji ?? "",
      weight: prize.weight.toString(),
      dailyCap: prize.dailyCap?.toString() ?? "",
      active: prize.active,
      isFallback: prize.isFallback,
    });
    setEditingId(prize.id);
    setShowForm(true);
    setError(null);
  }

  function startNew() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      label: form.label,
      description: form.description || null,
      imageUrl: form.imageUrl || null,
      emoji: form.emoji || null,
      weight: parseInt(form.weight),
      dailyCap: form.dailyCap ? parseInt(form.dailyCap) : null,
      active: form.active,
      isFallback: form.isFallback,
    };

    try {
      const res = editingId
        ? await fetch(`/api/admin/prizes/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/admin/restaurants/${restaurant.id}/prizes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowForm(false);
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(prizeId: string, label: string) {
    if (!confirm(`Delete "${label}"?`)) return;

    const res = await fetch(`/api/admin/prizes/${prizeId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    }
  }

  async function handleToggleActive(prize: Prize) {
    await fetch(`/api/admin/prizes/${prize.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !prize.active }),
    });
    router.refresh();
  }

  return (
    <section className="bg-white rounded-2xl p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base text-[#1F2937]">Prizes ({prizes.length})</h2>
        {!showForm && (
          <button
            onClick={startNew}
            className="text-sm text-[#6B7280] hover:text-[#1F2937] bg-[#F1ECE4] hover:bg-[#E5DDD0] px-3 py-1.5 rounded-xl transition-colors"
          >
            + Add prize
          </button>
        )}
      </div>

      {/* Prize list */}
      <div className="space-y-2">
        {prizes.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between p-3 rounded-xl ${
              p.active ? "bg-[#F8F5F0]" : "bg-[#F8F5F0] opacity-50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl">{p.emoji ?? "🎁"}</span>
              <div className="min-w-0">
                <span className="font-medium text-sm text-[#1F2937] truncate block">
                  {p.label}
                  {p.isFallback && (
                    <span className="ml-1.5 text-xs bg-[#FDE6C8] text-[#D97706] px-1.5 py-0.5 rounded-full">
                      fallback
                    </span>
                  )}
                </span>
                <span className="text-xs text-[#9CA3AF]">
                  weight {p.weight}
                  {p.dailyCap ? ` · cap ${p.dailyCap}/day` : " · unlimited"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleToggleActive(p)}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                  p.active
                    ? "bg-[#FDE6C8] text-[#D97706]"
                    : "bg-[#F1ECE4] text-[#9CA3AF]"
                }`}
              >
                {p.active ? "Active" : "Off"}
              </button>
              <button
                onClick={() => startEdit(p)}
                className="text-xs text-[#6B7280] hover:text-[#1F2937] px-2 py-1 rounded-lg bg-[#F1ECE4] transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(p.id, p.label)}
                className="text-xs text-[#DC2626] hover:text-red-700 px-2 py-1 rounded-lg bg-[#F1ECE4] transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="border border-[#E5E0D8] rounded-2xl p-4 space-y-3 mt-2 bg-[#F8F5F0]"
        >
          <h3 className="text-sm font-semibold text-[#1F2937]">
            {editingId ? "Edit prize" : "New prize"}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-[#6B7280] mb-1 block">Label *</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                required
                className={INPUT_CLASS}
                placeholder="Free Coffee"
              />
            </div>

            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Emoji</label>
              <input
                type="text"
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                className={INPUT_CLASS}
                placeholder="☕"
                maxLength={4}
              />
            </div>

            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">
                Weight
              </label>
              <input
                type="number"
                value={form.weight}
                onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                required
                min={1}
                className={INPUT_CLASS}
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-[#6B7280] mb-1 block">Image URL</label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                className={INPUT_CLASS}
                placeholder="https://..."
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-[#6B7280] mb-1 block">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={INPUT_CLASS}
                placeholder="Any size, hot or iced"
              />
            </div>

            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">
                Daily cap
              </label>
              <input
                type="number"
                value={form.dailyCap}
                onChange={(e) => setForm((f) => ({ ...f, dailyCap: e.target.value }))}
                className={INPUT_CLASS}
                placeholder="Unlimited"
                min={1}
              />
            </div>

            <div className="flex flex-col gap-2 justify-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="w-3.5 h-3.5"
                />
                <span className="text-xs text-[#6B7280]">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isFallback}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isFallback: e.target.checked }))
                  }
                  className="w-3.5 h-3.5"
                />
                <span className="text-xs text-[#6B7280]">Use as fallback</span>
              </label>
            </div>
          </div>

          {error && <p className="text-[#DC2626] text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#D97706] hover:bg-[#B45309] text-white font-semibold px-4 py-2 rounded-full text-sm disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Add prize"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="text-[#6B7280] hover:text-[#1F2937] px-4 py-2 rounded-xl bg-[#F1ECE4] text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
