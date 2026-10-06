import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "../actions";
import NavTabs, { type Tab } from "./NavTabs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const isAdmin = user.role === "admin";

  const tabs: Tab[] = [
    { href: "/admin", label: "Businesses", exact: true },
    ...(isAdmin
      ? [
          { href: "/admin/cards", label: "Card pool" },
          { href: "/admin/users", label: "Users" },
          { href: "/admin/export", label: "Export CSV", external: true },
        ]
      : []),
  ];

  const initial = (user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Sticky two-tier header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-4xl px-4">
          {/* Tier 1: brand + account */}
          <div className="flex items-center justify-between gap-3 py-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-indigo-400 text-sm font-black text-white shadow-sm">
                R
              </span>
              <span className="text-base font-extrabold tracking-tight">
                ReviewTap
              </span>
            </Link>

            <div className="flex items-center gap-2.5">
              <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm sm:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                  {initial}
                </span>
                <span className="max-w-[160px] truncate text-slate-600">
                  {user.email}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {user.role}
                </span>
              </span>
              <form action={signOut}>
                <button className="btn-ghost px-3 py-1.5 text-sm">
                  Sign out
                </button>
              </form>
            </div>
          </div>

          {/* Tier 2: tabs below the logo */}
          <div className="pb-2">
            <NavTabs tabs={tabs} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
