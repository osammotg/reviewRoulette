export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      {children}
    </div>
  );
}
