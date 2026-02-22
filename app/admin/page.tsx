import { prisma } from "@/lib/db";
import Link from "next/link";
import { requireAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default async function AdminDashboard() {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { prizes: true, spins: true } } },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1F2937]">Restaurants</h1>
          <p className="text-[#6B7280] text-sm mt-1">Review Roulette Admin</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/restaurants/new"
            className="bg-[#D97706] hover:bg-[#B45309] text-white font-semibold px-5 py-2 rounded-full text-sm transition-colors"
          >
            + Add restaurant
          </Link>
          <LogoutButton />
        </div>
      </div>

      {restaurants.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <p className="text-[#6B7280]">No restaurants yet.</p>
          <Link
            href="/admin/restaurants/new"
            className="text-[#D97706] underline text-sm mt-2 inline-block"
          >
            Create your first restaurant →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {restaurants.map((r: typeof restaurants[number]) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg text-[#1F2937]">{r.name}</h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.active
                        ? "bg-[#FDE6C8] text-[#D97706]"
                        : "bg-[#F1ECE4] text-[#9CA3AF]"
                    }`}
                  >
                    {r.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-[#9CA3AF] text-sm mt-0.5">
                  /r/{r.slug} · {r._count.prizes} prizes · {r._count.spins} spins
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/restaurants/${r.id}/analytics`}
                  className="text-[#6B7280] hover:text-[#1F2937] text-sm px-3 py-2 rounded-xl bg-[#F1ECE4] transition-colors"
                >
                  Analytics
                </Link>
                <Link
                  href={`/admin/restaurants/${r.id}`}
                  className="text-[#6B7280] hover:text-[#1F2937] text-sm px-3 py-2 rounded-xl bg-[#F1ECE4] transition-colors"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
