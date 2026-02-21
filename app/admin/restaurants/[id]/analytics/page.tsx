import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth";
import Link from "next/link";
import AnalyticsDashboard from "./AnalyticsDashboard";

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const { id } = await params;
  const { period } = await searchParams;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });

  if (!restaurant) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">
          ← Restaurants
        </Link>
        <span className="text-gray-600">/</span>
        <Link
          href={`/admin/restaurants/${id}`}
          className="text-gray-400 hover:text-white text-sm"
        >
          {restaurant.name}
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      <AnalyticsDashboard
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        initialPeriod={(period as "7d" | "30d") ?? "7d"}
      />
    </div>
  );
}
