"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui";

const navItems = [
  { href: "/audits", label: "Audit Review", icon: "FileText" },
  { href: "/rulebooks", label: "Rulebook", icon: "BookOpen" },
  { href: "/evals", label: "Eval Suite", icon: "TestTube" },
  { href: "/agents", label: "Agent Versions", icon: "Bot" },
  { href: "/runs", label: "Eval Run", icon: "Play" },
  { href: "/compare", label: "Version Compare", icon: "GitCompare" },
  { href: "/traces", label: "Failure Trace", icon: "Activity" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="text-sm font-bold tracking-tight">
          Audit Lab
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">Audit Reliability Lab</p>
      </div>
    </aside>
  );
}
