'use client';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  ScrollArea,
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
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Coins,
  GitBranch,
  Loader2,
  Timer,
  XCircle,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
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
  const { variant, icon: Icon } = config[status] ?? { variant: 'outline' as const, icon: Activity };
  return (
    <Badge variant={variant} className="gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

function ExecutionStatusBadge({ status, passed }: { status: string; passed?: boolean }) {
  if (status === 'FAILED') {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <XCircle className="h-3.5 w-3.5" />
        Failed
      </Badge>
    );
  }
  if (status === 'COMPLETED' && passed === true) {
    return (
      <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Passed
      </Badge>
    );
  }
  if (status === 'COMPLETED' && passed === false) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <AlertTriangle className="h-3.5 w-3.5" />
        Failed Grade
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      {status}
    </Badge>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function RunDetailPage() {
  const params = useParams();
  const runId = params['id'] as string;

  const run = trpc.evaluationRun.get.useQuery({ id: runId }, { enabled: Boolean(runId) });

  const isActive = run.data?.run.status === 'PENDING' || run.data?.run.status === 'RUNNING';

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      run.refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive, run]);

  const progressPct = useMemo(() => {
    if (!run.data) return 0;
    const { total, completed, failed } = run.data.progress;
    if (total === 0) return 0;
    return Math.round(((completed + failed) / total) * 100);
  }, [run.data]);

  const totalCost = useMemo(() => {
    if (!run.data) return 0;
    return run.data.cases.reduce(
      (sum, c) => sum + (c.execution.agentCostUsd ?? 0) + (c.execution.evaluatorCostUsd ?? 0),
      0,
    );
  }, [run.data]);

  const avgLatency = useMemo(() => {
    if (!run.data || run.data.cases.length === 0) return 0;
    return (
      run.data.cases.reduce((sum, c) => sum + (c.execution.latencyMs ?? 0), 0) /
      run.data.cases.length
    );
  }, [run.data]);

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Run Detail"
        description={run.data ? `${run.data.run.id.slice(0, 8)}...` : 'Loading run details...'}
      />

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {run.isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="mb-2 h-8 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : run.error ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Run not found</h3>
                <p className="max-w-md text-sm text-muted-foreground">{run.error.message}</p>
              </div>
            </CardContent>
          </Card>
        ) : run.data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Activity}
                label="Status"
                value={
                  <div className="flex items-center gap-2">
                    <RunStatusBadge status={run.data.run.status} />
                    {isActive && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                }
              />
              <StatCard
                icon={GitBranch}
                label="Agent"
                value={
                  <span className="truncate text-lg">{run.data.run.agentVersionSnapshot.name}</span>
                }
              />
              <StatCard icon={Coins} label="Total Cost" value={formatUsd(totalCost)} />
              <StatCard icon={Timer} label="Avg Latency" value={formatDuration(avgLatency)} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {run.data.progress.completed + run.data.progress.failed} /{' '}
                    {run.data.progress.total} cases
                  </span>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {run.data.progress.passed} passed
                  </span>
                  {run.data.progress.failed > 0 && (
                    <span className="text-destructive">{run.data.progress.failed} failed</span>
                  )}
                  {run.data.progress.running > 0 && (
                    <span className="text-blue-600 dark:text-blue-400">
                      {run.data.progress.running} running
                    </span>
                  )}
                </div>
                <Progress value={progressPct} className="h-2" />
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Case Executions</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[640px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>Case</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {run.data.cases.map((item) => (
                          <TableRow key={item.execution.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{item.evalCase.name}</div>
                                <div className="flex flex-wrap items-center gap-1">
                                  <Badge
                                    variant={
                                      item.evalCase.criticality === 'CRITICAL'
                                        ? 'destructive'
                                        : 'secondary'
                                    }
                                    className="text-xs"
                                  >
                                    {item.evalCase.criticality}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <ExecutionStatusBadge
                                status={item.execution.status}
                                passed={item.execution.passed}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="grader">Grader Results</TabsTrigger>
                    <TabsTrigger value="output">Output</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Run Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            ['Agent Model', run.data.run.agentVersionSnapshot.model],
                            ['Prompt Version', run.data.run.agentVersionSnapshot.promptVersion],
                            [
                              'Suite',
                              `${run.data.run.suiteSnapshot.name} v${run.data.run.suiteSnapshot.version}`,
                            ],
                            ['Created', formatDate(run.data.run.createdAt)],
                            ['Started', formatDate(run.data.run.startedAt)],
                            ['Completed', formatDate(run.data.run.completedAt)],
                          ].map(([label, value]) => (
                            <div key={label} className="space-y-1">
                              <div className="text-xs font-medium uppercase text-muted-foreground">
                                {label}
                              </div>
                              <div className="text-sm">{value}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="grader" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Grader Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {run.data.cases.some((c) => c.grader) ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Case</TableHead>
                                <TableHead>Recall</TableHead>
                                <TableHead>Precision</TableHead>
                                <TableHead>Rule Acc</TableHead>
                                <TableHead>Schema</TableHead>
                                <TableHead>Result</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {run.data.cases.map((item) => (
                                <TableRow key={item.execution.id}>
                                  <TableCell className="font-medium">
                                    {item.evalCase.name}
                                  </TableCell>
                                  <TableCell>
                                    {item.grader
                                      ? `${Math.round((item.grader.findingRecall ?? 0) * 100)}%`
                                      : '—'}
                                  </TableCell>
                                  <TableCell>
                                    {item.grader
                                      ? `${Math.round((item.grader.findingPrecision ?? 0) * 100)}%`
                                      : '—'}
                                  </TableCell>
                                  <TableCell>
                                    {item.grader
                                      ? `${Math.round((item.grader.ruleReferenceAccuracy ?? 0) * 100)}%`
                                      : '—'}
                                  </TableCell>
                                  <TableCell>
                                    {item.grader
                                      ? `${Math.round((item.grader.schemaValidity ?? 0) * 100)}%`
                                      : '—'}
                                  </TableCell>
                                  <TableCell>
                                    {item.grader ? (
                                      <Badge
                                        variant={item.grader.passed ? 'secondary' : 'destructive'}
                                        className="text-xs"
                                      >
                                        {item.grader.passed ? 'Passed' : 'Failed'}
                                      </Badge>
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                            No grader results yet.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="output" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Agent Snapshot</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <JsonBlock value={run.data.run.agentVersionSnapshot} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
