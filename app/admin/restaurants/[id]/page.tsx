import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth";
import Link from "next/link";
import RestaurantEditor from "./RestaurantEditor";
import PrizeManager from "./PrizeManager";
import QRGenerator from "./QRGenerator";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: { prizes: { orderBy: { createdAt: "asc" } } },
  });

  if (!restaurant) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">
          ← Restaurants
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold">{restaurant.name}</h1>
      </div>

      <RestaurantEditor restaurant={restaurant} />
      <PrizeManager restaurant={restaurant} prizes={restaurant.prizes} />
      <QRGenerator slug={restaurant.slug} />
    </div>
  );
}
