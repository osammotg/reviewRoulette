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
          <h1 className="text-2xl font-bold">Restaurants</h1>
          <p className="text-gray-400 text-sm mt-1">Review Roulette Admin</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/restaurants/new"
            className="bg-white text-gray-900 font-semibold px-4 py-2 rounded-xl text-sm"
          >
            + Add restaurant
          </Link>
          <LogoutButton />
        </div>
      </div>

      {restaurants.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl p-12 text-center">
          <p className="text-gray-400">No restaurants yet.</p>
          <Link
            href="/admin/restaurants/new"
            className="text-white underline text-sm mt-2 inline-block"
          >
            Create your first restaurant →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {restaurants.map((r: typeof restaurants[number]) => (
            <div
              key={r.id}
              className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">{r.name}</h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.active
                        ? "bg-emerald-900 text-emerald-300"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {r.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-0.5">
                  /r/{r.slug} · {r._count.prizes} prizes · {r._count.spins} spins
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/restaurants/${r.id}/analytics`}
                  className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-xl bg-gray-800"
                >
                  Analytics
                </Link>
                <Link
                  href={`/admin/restaurants/${r.id}`}
                  className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-xl bg-gray-800"
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
