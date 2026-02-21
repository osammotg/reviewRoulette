import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import LandingClient from "./LandingClient";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, active: true },
    select: { id: true, name: true, logoUrl: true, googleUrl: true, slug: true },
  });

  if (!restaurant) notFound();

  return <LandingClient restaurant={restaurant} />;
}
