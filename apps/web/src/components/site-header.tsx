'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Separator,
  SidebarTrigger,
} from '@repo/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink asChild>
            <Link href="/audits">Audit Reliability Lab</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const label =
            segment === 'audits'
              ? 'Audit Review'
              : segment === 'evals'
                ? 'Eval Suite'
                : segment === 'runs'
                  ? 'Eval Runs'
                  : segment === 'compare'
                    ? 'Version Compare'
                    : segment === 'agents'
                      ? 'Agent Versions'
                      : segment === 'rulebooks'
                        ? 'Rulebooks'
                        : segment === 'traces'
                          ? 'Failure Traces'
                          : segment.replace(/-/g, ' ');

          const isLast = index === segments.length - 1;

          return (
            <div key={href} className="contents">
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="capitalize">{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="capitalize">
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function SiteHeader() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  return (
    <header className="bg-background/95 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <DashboardBreadcrumbs />
    </header>
  );
}
