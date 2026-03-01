"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "📊", label: "Painel" },
  { href: "/partidas", icon: "📅", label: "Partidas" },
  { href: "/jogadores", icon: "👥", label: "Elenco" },
  { href: "/caixa", icon: "💰", label: "Caixa" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Mobile: Bottom bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white shadow-[0_-1px_12px_-4px_rgba(0,0,0,0.08)] md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around py-2.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-all active:scale-90 ${
                  active ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Desktop: Top bar ── */}
      <nav className="hidden md:block sticky top-0 z-20 bg-white/80 backdrop-blur-xl shadow-[0_1px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <span className="text-lg font-bold tracking-tight text-slate-900">
            ⚽ Pelada Manager
          </span>
          <div className="flex gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
