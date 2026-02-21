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
      className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-xl bg-gray-800"
    >
      Log out
    </button>
  );
}
