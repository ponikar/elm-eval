'use client';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui';
import { BookOpen, FileStack, Search, ShieldCheck } from 'lucide-react';
import { CategoryBadge } from '@/components/category-badge';
import { DashboardHeader } from '@/components/dashboard-header';
import { SeverityBadge } from '@/components/severity-badge';
import { trpc } from '@/trpc/react';

const statCards = [
  { label: 'Rulebook', icon: BookOpen },
  { label: 'Structured rules', icon: FileStack },
  { label: 'Indexed status', icon: Search },
  { label: 'Audit standard', icon: ShieldCheck },
] as const;

export default function RulebooksPage() {
  const rulebook = trpc.audit.getRulebook.useQuery();
  const rules = trpc.audit.getRules.useQuery();

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Rulebooks"
        description="Versioned compliance rules, sections, and retrieval-ready references."
        actions={
          rulebook.data ? (
            <Badge variant="outline">
              {rulebook.data.name} v{rulebook.data.version}
            </Badge>
          ) : null
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {rulebook.isLoading || rules.isLoading ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <Card key={card.label}>
                  <CardContent className="flex items-center gap-3 pt-6">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-72 w-full" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={BookOpen}
                label="Rulebook"
                value={rulebook.data?.version ?? '—'}
                hint={rulebook.data?.name ?? 'Unavailable'}
              />
              <StatCard
                icon={FileStack}
                label="Structured rules"
                value={String(rules.data?.length ?? 0)}
                hint="Queryable sections"
              />
              <StatCard
                icon={Search}
                label="Index status"
                value={rulebook.data?.indexStatus ?? '—'}
                hint="Retrieval state"
              />
              <StatCard
                icon={ShieldCheck}
                label="Audit standard"
                value={rulebook.data?.standard ?? '—'}
                hint={`Effective ${rulebook.data?.effectiveFrom ?? '—'}`}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Structured Rules</CardTitle>
                <CardDescription>
                  Source-linked rule references used for validation and retrieval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Corrective guidance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.data?.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="space-y-1">
                          <div className="font-medium">{rule.sectionTitle}</div>
                          <div className="font-mono text-xs text-muted-foreground">{rule.id}</div>
                        </TableCell>
                        <TableCell>
                          <CategoryBadge category={rule.category} />
                        </TableCell>
                        <TableCell>
                          {rule.severityGuidance?.defaultSeverity ? (
                            <SeverityBadge severity={rule.severityGuidance.defaultSeverity} />
                          ) : (
                            <span className="text-sm text-muted-foreground">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          p.{rule.sourcePage}
                        </TableCell>
                        <TableCell className="max-w-xl text-sm text-muted-foreground">
                          {rule.correctiveActionGuidance?.join(' • ') ?? 'None recorded'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-base font-semibold">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
