import { redirect } from "next/navigation";

// Root redirects to admin — restaurants are accessed via /r/[slug]
export default function Home() {
  redirect("/admin");
}
