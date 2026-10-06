"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface Tab {
  href: string;
  label: string;
  /** When true, only an exact path match is "active" (used for /admin). */
  exact?: boolean;
  /** Render as a plain anchor (e.g. file download route). */
  external?: boolean;
}

export default function NavTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  function isActive(t: Tab) {
    if (t.exact) return pathname === t.href;
    return pathname === t.href || pathname.startsWith(`${t.href}/`);
  }

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-0.5">
      {tabs.map((t) => {
        const active = isActive(t);
        const className = `whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition ${
          active
            ? "bg-brand text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`;
        return t.external ? (
          <a key={t.href} href={t.href} className={className}>
            {t.label}
          </a>
        ) : (
          <Link key={t.href} href={t.href} className={className}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
