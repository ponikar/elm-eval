'use client';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui';
import { Clock, FileEdit, FlaskConical, ShieldCheck } from 'lucide-react';
import { CategoryBadge } from '@/components/category-badge';
import { DashboardHeader } from '@/components/dashboard-header';
import { SeverityBadge } from '@/components/severity-badge';
import { trpc } from '@/trpc/react';

function CriticalityBadge({ criticality }: { criticality: string }) {
  return (
    <Badge variant={criticality === 'CRITICAL' ? 'destructive' : 'secondary'} className="text-xs">
      {criticality}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; label: string }> = {
    TRUSTED: {
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      label: 'Trusted',
    },
    PENDING_REVIEW: {
      className:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
      label: 'Pending Review',
    },
    DRAFT: {
      className: '',
      label: 'Draft',
    },
  };
  const fallback = { className: '', label: status };
  const config = map[status] ?? fallback;
  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    HUMAN_CREATED: 'Human',
    HUMAN_CORRECTION: 'Correction',
    PRODUCTION_FAILURE: 'Failure',
    GENERATED_APPROVED: 'Generated',
  };
  return (
    <Badge variant="outline" className="text-xs">
      {labels[source] ?? source}
    </Badge>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EvalsPage() {
  const evalCases = trpc.evalCase.list.useQuery();

  const trusted = evalCases.data?.filter((c) => c.status === 'TRUSTED') ?? [];
  const pending = evalCases.data?.filter((c) => c.status === 'PENDING_REVIEW') ?? [];
  const draft = evalCases.data?.filter((c) => c.status === 'DRAFT') ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Eval Suite"
        description="Trusted evaluation cases, pending variations, and suite composition."
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {evalCases.isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-8 w-12 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={FlaskConical}
                label="Total Cases"
                value={evalCases.data?.length ?? 0}
                color="bg-muted text-muted-foreground"
              />
              <StatCard
                icon={ShieldCheck}
                label="Trusted"
                value={trusted.length}
                color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400"
              />
              <StatCard
                icon={Clock}
                label="Pending Review"
                value={pending.length}
                color="bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400"
              />
              <StatCard
                icon={FileEdit}
                label="Draft"
                value={draft.length}
                color="bg-muted text-muted-foreground"
              />
            </div>

            {/* Cases table with tabs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evaluation Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">All ({evalCases.data?.length ?? 0})</TabsTrigger>
                    <TabsTrigger value="trusted">Trusted ({trusted.length})</TabsTrigger>
                    <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                    <TabsTrigger value="draft">Draft ({draft.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <CasesTable cases={evalCases.data ?? []} />
                  </TabsContent>
                  <TabsContent value="trusted">
                    <CasesTable cases={trusted} />
                  </TabsContent>
                  <TabsContent value="pending">
                    <CasesTable cases={pending} />
                  </TabsContent>
                  <TabsContent value="draft">
                    <CasesTable cases={draft} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function CasesTable({
  cases,
}: {
  cases: Array<{
    id: string;
    name: string;
    category: string;
    criticality: string;
    source: string;
    status: string;
    expected: Array<{
      findingShouldExist: boolean;
      severity?: string;
    }>;
  }>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Case</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Criticality</TableHead>
          <TableHead>Expected</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell>
              <CategoryBadge category={c.category as never} />
            </TableCell>
            <TableCell>
              <CriticalityBadge criticality={c.criticality} />
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {c.expected.map((exp, i) => (
                  <span key={i} className="text-xs text-muted-foreground">
                    {exp.findingShouldExist ? 'must find' : 'must not find'}
                    {exp.severity && (
                      <>
                        {' '}
                        <SeverityBadge severity={exp.severity as never} />
                      </>
                    )}
                  </span>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <SourceBadge source={c.source} />
            </TableCell>
            <TableCell>
              <StatusBadge status={c.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
