'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  ChevronDown,
  Clock3,
  FileSearch,
  GitBranch,
  Timer,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { trpc } from '@/trpc/react';

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDuration(value?: number) {
  if (value === undefined) return '—';
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${value}ms`;
}

function formatUsd(value?: number) {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatNumber(value?: number) {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

function StatusBadge({
  status,
  passed,
}: {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  passed?: boolean;
}) {
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

function CriticalityBadge({ criticality }: { criticality: 'NORMAL' | 'CRITICAL' }) {
  return (
    <Badge variant={criticality === 'CRITICAL' ? 'destructive' : 'secondary'} className="text-xs">
      {criticality}
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
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
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

export default function TracesPage() {
  const runs = trpc.trace.listRuns.useQuery();
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string>('');

  useEffect(() => {
    if (!runs.data?.length) return;
    if (selectedRunId && runs.data.some((item) => item.run.id === selectedRunId)) return;
    const initialRun = runs.data[0];
    if (initialRun) setSelectedRunId(initialRun.run.id);
  }, [runs.data, selectedRunId]);

  const runOverview = trpc.trace.getRunOverview.useQuery(
    { runId: selectedRunId },
    { enabled: Boolean(selectedRunId) },
  );

  useEffect(() => {
    if (!runOverview.data?.cases.length) return;
    if (
      selectedExecutionId &&
      runOverview.data.cases.some((item) => item.execution.id === selectedExecutionId)
    )
      return;

    const preferred =
      runOverview.data.cases.find((item) => item.execution.status === 'FAILED') ??
      runOverview.data.cases.find((item) => item.execution.passed === false) ??
      runOverview.data.cases[0];
    if (preferred) setSelectedExecutionId(preferred.execution.id);
  }, [runOverview.data, selectedExecutionId]);

  const execution = trpc.trace.getExecution.useQuery(
    { executionId: selectedExecutionId },
    { enabled: Boolean(selectedExecutionId) },
  );

  const selectedCase = useMemo(
    () => runOverview.data?.cases.find((item) => item.execution.id === selectedExecutionId),
    [runOverview.data, selectedExecutionId],
  );

  return (
    <div>
      <DashboardHeader
        title="Failure Traces"
        description="Inspect execution failures, grader outcomes, and stage-by-stage pipeline events"
      />
      <div className="space-y-6 p-8">
        {runs.isLoading ? (
          <TraceSkeleton />
        ) : runs.error ? (
          <ErrorState title="Trace data is unavailable" description={runs.error.message} />
        ) : runs.data && runs.data.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <Card>
                <CardHeader className="space-y-3">
                  <div>
                    <CardTitle className="text-base">Evaluation Run</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose a run and drill into a specific case execution.
                    </p>
                  </div>
                  <Select value={selectedRunId} onValueChange={setSelectedRunId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a run" />
                    </SelectTrigger>
                    <SelectContent>
                      {runs.data.map((item) => (
                        <SelectItem key={item.run.id} value={item.run.id}>
                          {item.run.agentVersionSnapshot.name} · {formatDate(item.run.createdAt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="space-y-4">
                  {runOverview.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : runOverview.data ? (
                    <>
                      <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {runOverview.data.run.agentVersionSnapshot.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {runOverview.data.run.agentVersionSnapshot.model}
                            </p>
                          </div>
                          <StatusBadge status={runOverview.data.run.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>Created</div>
                          <div className="text-right">
                            {formatDate(runOverview.data.run.createdAt)}
                          </div>
                          <div>Suite</div>
                          <div className="truncate text-right">
                            {runOverview.data.run.suiteSnapshot.name}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <StatCard
                          icon={Activity}
                          label="Cases"
                          value={runOverview.data.progress.total}
                        />
                        <StatCard
                          icon={AlertTriangle}
                          label="Failures"
                          value={runOverview.data.progress.failed}
                        />
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <div className="grid gap-6">
                {runOverview.isLoading ? (
                  <TraceWorkspaceSkeleton />
                ) : runOverview.error ? (
                  <ErrorState
                    title="Run overview failed to load"
                    description={runOverview.error.message}
                  />
                ) : runOverview.data ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <StatCard
                        icon={Activity}
                        label="Total Cases"
                        value={runOverview.data.progress.total}
                      />
                      <StatCard
                        icon={CheckCircle2}
                        label="Passed"
                        value={runOverview.data.progress.passed}
                      />
                      <StatCard
                        icon={AlertTriangle}
                        label="Failed"
                        value={runOverview.data.progress.failed}
                      />
                      <StatCard
                        icon={Clock3}
                        label="Running"
                        value={runOverview.data.progress.running}
                      />
                    </div>

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
                                {runOverview.data.cases.map((item) => {
                                  const active = item.execution.id === selectedExecutionId;
                                  return (
                                    <TableRow
                                      key={item.execution.id}
                                      className={active ? 'bg-muted/40' : undefined}
                                    >
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          className="h-auto w-full justify-start px-0 py-0 text-left"
                                          onClick={() => setSelectedExecutionId(item.execution.id)}
                                        >
                                          <div className="space-y-2">
                                            <div className="font-medium">{item.evalCase.name}</div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <CriticalityBadge
                                                criticality={item.evalCase.criticality}
                                              />
                                              <Badge variant="outline" className="text-xs">
                                                {item.traceCount} trace
                                                {item.traceCount === 1 ? '' : 's'}
                                              </Badge>
                                            </div>
                                          </div>
                                        </Button>
                                      </TableCell>
                                      <TableCell>
                                        <StatusBadge
                                          status={item.execution.status}
                                          passed={item.execution.passed}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      <div className="space-y-6">
                        {execution.isLoading ? (
                          <TraceWorkspaceSkeleton />
                        ) : execution.error ? (
                          <ErrorState
                            title="Execution trace failed to load"
                            description={execution.error.message}
                          />
                        ) : !execution.data || !selectedCase ? (
                          <TraceWorkspaceSkeleton />
                        ) : (
                          <>
                            <Card>
                              <CardHeader className="gap-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <CardTitle className="text-base">
                                      {execution.data.evalCase.name}
                                    </CardTitle>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {execution.data.run.agentVersionSnapshot.name} ·{' '}
                                      {execution.data.run.agentVersionSnapshot.model}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <CriticalityBadge
                                      criticality={execution.data.evalCase.criticality}
                                    />
                                    <StatusBadge
                                      status={execution.data.execution.status}
                                      passed={execution.data.execution.passed}
                                    />
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <StatCard
                                  icon={Timer}
                                  label="Latency"
                                  value={formatDuration(execution.data.execution.latencyMs)}
                                />
                                <StatCard
                                  icon={GitBranch}
                                  label="Agent Cost"
                                  value={formatUsd(execution.data.execution.agentCostUsd)}
                                />
                                <StatCard
                                  icon={FileSearch}
                                  label="Input Tokens"
                                  value={formatNumber(execution.data.execution.tokenInput)}
                                />
                                <StatCard
                                  icon={FileSearch}
                                  label="Output Tokens"
                                  value={formatNumber(execution.data.execution.tokenOutput)}
                                />
                              </CardContent>
                            </Card>

                            <Tabs defaultValue="timeline">
                              <TabsList>
                                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                                <TabsTrigger value="grader">Grader</TabsTrigger>
                                <TabsTrigger value="output">Output</TabsTrigger>
                              </TabsList>

                              <TabsContent value="timeline" className="mt-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-base">Stage Timeline</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    {execution.data.execution.errorCode ? (
                                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                                        <div className="font-medium">
                                          {execution.data.execution.errorCode}
                                        </div>
                                        <div className="mt-1 text-destructive/80">
                                          {execution.data.execution.errorMessage ??
                                            'No error message recorded.'}
                                        </div>
                                      </div>
                                    ) : null}

                                    {execution.data.traces.length === 0 ? (
                                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                                        No trace events were recorded for this execution.
                                      </div>
                                    ) : (
                                      execution.data.traces.map((trace) => (
                                        <Collapsible
                                          key={trace.id}
                                          defaultOpen={trace.sequence === 1}
                                          className="rounded-lg border"
                                        >
                                          <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 p-4 text-left">
                                            <div className="space-y-2">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline">#{trace.sequence}</Badge>
                                                <Badge variant="secondary">{trace.stage}</Badge>
                                                <Badge variant="outline">{trace.eventType}</Badge>
                                              </div>
                                              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                                                <div>Started {formatDate(trace.startedAt)}</div>
                                                <div>
                                                  Duration {formatDuration(trace.durationMs)}
                                                </div>
                                                <div>
                                                  Tokens {formatNumber(trace.tokenUsage?.input)} /{' '}
                                                  {formatNumber(trace.tokenUsage?.output)}
                                                </div>
                                                <div>Cost {formatUsd(trace.costUsd)}</div>
                                              </div>
                                            </div>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                          </CollapsibleTrigger>
                                          <CollapsibleContent className="space-y-4 border-t p-4">
                                            {trace.errorCode ? (
                                              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                                                Error Code: {trace.errorCode}
                                              </div>
                                            ) : null}
                                            <div className="grid gap-4 xl:grid-cols-2">
                                              <div className="space-y-2">
                                                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                  Input Summary
                                                </div>
                                                <JsonBlock
                                                  value={
                                                    trace.inputSummary ?? {
                                                      message: 'No input summary recorded.',
                                                    }
                                                  }
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                  Output Summary
                                                </div>
                                                <JsonBlock
                                                  value={
                                                    trace.outputSummary ?? {
                                                      message: 'No output summary recorded.',
                                                    }
                                                  }
                                                />
                                              </div>
                                            </div>
                                          </CollapsibleContent>
                                        </Collapsible>
                                      ))
                                    )}
                                  </CardContent>
                                </Card>
                              </TabsContent>

                              <TabsContent value="grader" className="mt-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-base">Grader Result</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-6">
                                    {execution.data.grader ? (
                                      <>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Badge
                                            variant={
                                              execution.data.grader.passed ? 'default' : 'secondary'
                                            }
                                          >
                                            {execution.data.grader.passed
                                              ? 'Passed Gate'
                                              : 'Failed Gate'}
                                          </Badge>
                                          <Badge variant="outline">
                                            {execution.data.grader.graderVersion}
                                          </Badge>
                                          {execution.data.grader.failureTypes.map((failure) => (
                                            <Badge key={failure} variant="destructive">
                                              {failure}
                                            </Badge>
                                          ))}
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                          <MetricCard
                                            label="Finding Recall"
                                            value={execution.data.grader.findingRecall}
                                          />
                                          <MetricCard
                                            label="Citation Precision"
                                            value={execution.data.grader.auditCitationPrecision}
                                          />
                                          <MetricCard
                                            label="Rule Accuracy"
                                            value={execution.data.grader.ruleReferenceAccuracy}
                                          />
                                          <MetricCard
                                            label="Schema Validity"
                                            value={execution.data.grader.schemaValidity}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <div className="text-sm font-medium">Messages</div>
                                          {execution.data.grader.details.messages.length > 0 ? (
                                            <ul className="space-y-2 text-sm text-muted-foreground">
                                              {execution.data.grader.details.messages.map(
                                                (message, index) => (
                                                  <li
                                                    key={`${message}-${index}`}
                                                    className="rounded-lg border bg-muted/20 px-3 py-2"
                                                  >
                                                    {message}
                                                  </li>
                                                ),
                                              )}
                                            </ul>
                                          ) : (
                                            <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                                              No grader messages were recorded.
                                            </div>
                                          )}
                                        </div>
                                        <div className="space-y-2">
                                          <div className="text-sm font-medium">Count Snapshot</div>
                                          <JsonBlock value={execution.data.grader.details.counts} />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                                        This execution does not have a grader result yet.
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </TabsContent>

                              <TabsContent value="output" className="mt-4">
                                <div className="grid gap-6 xl:grid-cols-2">
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-base">Expected Case</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <JsonBlock value={execution.data.evalCase} />
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-base">Actual Output</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <JsonBlock
                                        value={
                                          execution.data.execution.agentOutput ?? {
                                            message:
                                              'No agent output was recorded for this execution.',
                                          }
                                        }
                                      />
                                    </CardContent>
                                  </Card>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">
        {value === undefined ? '—' : `${Math.round(value * 100)}%`}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Activity className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">No evaluation runs yet</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Run a trusted evaluation suite to inspect case failures, grader results, and pipeline
            traces here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TraceSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
      <TraceWorkspaceSkeleton />
    </div>
  );
}

function TraceWorkspaceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
