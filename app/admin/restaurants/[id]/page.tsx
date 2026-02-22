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
        <Link href="/admin" className="text-[#6B7280] hover:text-[#1F2937] text-sm transition-colors">
          ← Restaurants
        </Link>
        <span className="text-[#9CA3AF]">/</span>
        <h1 className="text-xl font-semibold text-[#1F2937]">{restaurant.name}</h1>
      </div>

      <RestaurantEditor restaurant={restaurant} />
      <PrizeManager restaurant={restaurant} prizes={restaurant.prizes} />
      <QRGenerator slug={restaurant.slug} />
    </div>
  );
}
