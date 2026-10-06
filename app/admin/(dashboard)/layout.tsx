import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "../actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const isAdmin = user.role === "admin";

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-4 py-5">
      <header className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
          <Link href="/admin" className="font-bold text-brand">
            ReviewTap
          </Link>
          <Link href="/admin" className="text-slate-600 hover:text-slate-900">
            Businesses
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/admin/cards"
                className="text-slate-600 hover:text-slate-900"
              >
                Card pool
              </Link>
              <Link
                href="/admin/users"
                className="text-slate-600 hover:text-slate-900"
              >
                Users
              </Link>
            </>
          )}
          <a
            href="/admin/export"
            className="text-slate-600 hover:text-slate-900"
          >
            Export CSV
          </a>
        </nav>
        <div className="flex items-center justify-between gap-3 text-sm sm:justify-end">
          <span className="truncate text-slate-500">
            {user.email} ({user.role})
          </span>
          <form action={signOut}>
            <button className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-1.5 font-medium">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
