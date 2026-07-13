'use client';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Coins,
  Play,
  XCircle,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { trpc } from '@/trpc/react';

function formatUsd(value: number) {
  if (value === 0) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatDuration(ms: number) {
  if (ms === 0) return '—';
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function RunStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }
  > = {
    COMPLETED: { variant: 'secondary', icon: CheckCircle2 },
    RUNNING: { variant: 'default', icon: Activity },
    FAILED: { variant: 'destructive', icon: XCircle },
    PENDING: { variant: 'outline', icon: Clock3 },
  };
  const { variant, icon: Icon } = config[status] ?? { variant: 'outline' as const, icon: Play };
  return (
    <Badge variant={variant} className="gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

export default function RunsPage() {
  const runs = trpc.evaluationRun.listSummaries.useQuery();

  const total = runs.data?.length ?? 0;
  const running = runs.data?.filter((r) => r.status === 'RUNNING').length ?? 0;
  const completed = runs.data?.filter((r) => r.status === 'COMPLETED').length ?? 0;
  const failed = runs.data?.filter((r) => r.status === 'FAILED').length ?? 0;
  const totalCost =
    runs.data?.reduce((s, r) => s + r.totalAgentCostUsd + r.totalEvaluatorCostUsd, 0) ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Eval Runs"
        description="Queue, monitor, and inspect persisted evaluation executions."
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {runs.isLoading ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="mb-2 h-4 w-24" />
                    <Skeleton className="h-7 w-16" />
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
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Total runs" value={String(total)} icon={Play} />
              <MetricCard label="Running" value={String(running)} icon={Activity} />
              <MetricCard label="Completed" value={String(completed)} icon={CheckCircle2} />
              <MetricCard label="Failed" value={String(failed)} icon={AlertTriangle} />
              <MetricCard label="Total cost" value={formatUsd(totalCost)} icon={Coins} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Persisted Runs</CardTitle>
                <CardDescription>
                  Each row maps one frozen suite evaluated against one agent version.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {total === 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                    <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
                      <Play className="size-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">No evaluation runs yet</p>
                      <p className="text-sm text-muted-foreground">
                        Frozen suites are ready. The run table will populate once executions are
                        started from the pipeline path.
                      </p>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Suite</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Avg Latency</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.data?.map((run) => {
                        const progressPct =
                          run.progress.total > 0
                            ? Math.round(
                                ((run.progress.completed + run.progress.failed) /
                                  run.progress.total) *
                                  100,
                              )
                            : 0;
                        const totalRunCost = run.totalAgentCostUsd + run.totalEvaluatorCostUsd;

                        return (
                          <TableRow key={run.id}>
                            <TableCell>
                              <RunStatusBadge status={run.status} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{run.agentVersionName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {run.agentVersionModel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {run.suiteName} v{run.suiteVersion}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>
                                    {run.progress.completed + run.progress.failed}/
                                    {run.progress.total}
                                  </span>
                                  <span className="text-muted-foreground/50">|</span>
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {run.progress.passed} pass
                                  </span>
                                  {run.progress.failed > 0 && (
                                    <span className="text-destructive">
                                      {run.progress.failed} fail
                                    </span>
                                  )}
                                </div>
                                <Progress value={progressPct} className="h-1.5" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{formatUsd(totalRunCost)}</span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDuration(run.avgLatencyMs)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(run.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
