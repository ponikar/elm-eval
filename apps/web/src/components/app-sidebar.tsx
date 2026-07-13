'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@repo/ui';
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
      { href: '/audits', label: 'Audit Review', icon: FileText, badge: '1' },
      { href: '/rulebooks', label: 'Rulebooks', icon: BookOpen },
    ],
  },
  {
    label: 'Evaluation',
    items: [
      { href: '/evals', label: 'Eval Suite', icon: FlaskConical, badge: '10' },
      { href: '/runs', label: 'Eval Runs', icon: Play },
      { href: '/compare', label: 'Version Compare', icon: GitCompare },
    ],
  },
  {
    label: 'Agents',
    items: [
      { href: '/agents', label: 'Agent Versions', icon: Bot, badge: '2' },
      { href: '/traces', label: 'Failure Traces', icon: Activity },
    ],
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon" className="peer/sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" isActive tooltip="Audit Reliability Lab">
              <Link href="/audits">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Shield className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Audit Reliability Lab</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    Supplier audit evaluation
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="[&>svg]:size-4"
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                          {'badge' in item && item.badge ? (
                            <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 text-xs text-sidebar-foreground/60">
          <p className="font-medium text-sidebar-foreground/80">MVP workspace</p>
          <p>Shadcn dashboard shell</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
