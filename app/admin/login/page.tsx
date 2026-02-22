"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Login failed");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 bg-[#F8F5F0]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[#1F2937]">Admin Login</h1>
          <p className="text-[#6B7280] text-sm mt-1">Review Roulette</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#6B7280] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white border border-[#E5E0D8] rounded-xl px-4 py-3 text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#D97706]"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-[#6B7280] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white border border-[#E5E0D8] rounded-xl px-4 py-3 text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#D97706]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[#DC2626] text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D97706] hover:bg-[#B45309] text-white font-semibold rounded-full py-3 disabled:opacity-50 transition-colors"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}
