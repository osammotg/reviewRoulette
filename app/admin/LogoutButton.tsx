"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-[#6B7280] hover:text-[#1F2937] text-sm px-4 py-2 rounded-xl bg-[#F1ECE4] transition-colors"
    >
      Log out
    </button>
  );
}
