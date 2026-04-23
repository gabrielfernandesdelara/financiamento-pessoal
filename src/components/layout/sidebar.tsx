"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col gap-2 border-r border-border/60 bg-background px-4 py-6">
      <Link
        href="/"
        className="mb-4 flex items-center gap-2 px-3 py-2 text-lg font-semibold tracking-tight"
      >
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
          <Wallet className="h-5 w-5" />
        </span>
        Financeiro Pessoal
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center justify-between px-2">
        <UserMenu />
        <ThemeToggle />
      </div>
    </aside>
  );
}
