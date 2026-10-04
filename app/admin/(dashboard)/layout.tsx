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

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/admin" className="font-bold text-brand">
            ReviewTap
          </Link>
          <Link href="/admin" className="text-slate-600 hover:text-slate-900">
            Businesses
          </Link>
          <a
            href="/admin/export"
            className="text-slate-600 hover:text-slate-900"
          >
            Export CSV
          </a>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">
            {user.email} ({user.role})
          </span>
          <form action={signOut}>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 font-medium">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
