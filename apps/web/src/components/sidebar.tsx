'use client';

import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui';
import {
  Activity,
  BookOpen,
  Bot,
  FileText,
  FlaskConical,
  GitCompare,
  Play,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navSections = [
  {
    label: 'Review',
    items: [
      { href: '/audits', label: 'Audit Review', icon: FileText },
      { href: '/rulebooks', label: 'Rulebooks', icon: BookOpen },
    ],
  },
  {
    label: 'Evaluation',
    items: [
      { href: '/evals', label: 'Eval Suite', icon: FlaskConical },
      { href: '/runs', label: 'Eval Runs', icon: Play },
      { href: '/compare', label: 'Version Compare', icon: GitCompare },
    ],
  },
  {
    label: 'Agents',
    items: [
      { href: '/agents', label: 'Agent Versions', icon: Bot },
      { href: '/traces', label: 'Failure Traces', icon: Activity },
    ],
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2.5 border-b px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Shield className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Audit Lab</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-sidebar-foreground' : 'text-muted-foreground/70',
                          )}
                        />
                        {item.label}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t px-5 py-3">
        <p className="text-[11px] text-muted-foreground/60">Audit Reliability Lab v0.1</p>
      </div>
    </aside>
  );
}
