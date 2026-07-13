'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
} from '@repo/ui';
import { GitCompare, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { trpc } from '@/trpc/react';

const metricLabels: Record<string, string> = {
  findingRecall: 'Finding Recall',
  criticalFindingRecall: 'Critical Recall',
  findingPrecision: 'Finding Precision',
  categoryAccuracy: 'Category Accuracy',
  severityAccuracy: 'Severity Accuracy',
  auditCitationPrecision: 'Citation Precision',
  ruleReferenceAccuracy: 'Rule Accuracy',
  capCompleteness: 'CAP Completeness',
  schemaValidity: 'Schema Validity',
  averageExecutionCostUsd: 'Avg Cost',
  p95PipelineLatencyMs: 'P95 Latency',
  criticalUnderclassificationCount: 'Critical Underclassifications',
  hallucinatedFindingRate: 'Hallucinated Finding Rate',
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatMetric(key: string, value: number) {
  if (key === 'averageExecutionCostUsd') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(value);
  }
  if (key === 'p95PipelineLatencyMs') return `${Math.round(value)}ms`;
  if (key === 'criticalUnderclassificationCount') return String(Math.round(value));
  return formatPercent(value);
}

function formatDelta(key: string, delta: number) {
  const prefix = delta > 0 ? '+' : '';
  if (key === 'averageExecutionCostUsd') return `${prefix}${formatMetric(key, delta)}`;
  if (key === 'p95PipelineLatencyMs') return `${prefix}${Math.round(delta)}ms`;
  if (key === 'criticalUnderclassificationCount') return `${prefix}${Math.round(delta)}`;
  return `${prefix}${Math.round(delta * 100)} pts`;
}

function decisionVariant(decision: 'APPROVED' | 'BLOCKED') {
  return decision === 'APPROVED' ? 'default' : 'destructive';
}

function classificationVariant(classification: string) {
  if (classification === 'IMPROVEMENT') return 'default';
  if (classification === 'REGRESSION') return 'destructive';
  if (classification === 'STABLE_PASS') return 'secondary';
  return 'outline';
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="outline" className="max-w-[16rem] truncate">
        {value}
      </Badge>
    </div>
  );
}

function AgentCard({
  title,
  icon: Icon,
  agent,
  onRun,
  isRunning,
}: {
  title: string;
  icon: React.ElementType;
  agent:
    | {
        id: string;
        name: string;
        model: string;
        promptVersion: string;
        rulebookVersionId: string;
        retrievalTopK: number;
      }
    | undefined;
  onRun?: () => void;
  isRunning?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4" />
          {title}
        </CardTitle>
        <CardDescription>{agent?.name ?? 'Unavailable'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SummaryRow label="Model" value={agent?.model ?? '—'} />
        <SummaryRow label="Prompt" value={agent?.promptVersion ?? '—'} />
        <SummaryRow label="Rulebook" value={agent?.rulebookVersionId ?? '—'} />
        <SummaryRow label="Retrieval top K" value={String(agent?.retrievalTopK ?? '—')} />
        {onRun && (
          <Button size="sm" className="mt-2 w-full" disabled={!agent || isRunning} onClick={onRun}>
            {isRunning ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Running...
              </>
            ) : (
              `Run ${title}`
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const evalCases = trpc.evalCase.list.useQuery();
  const agents = trpc.agentVersion.list.useQuery();
  const runs = trpc.comparison.listRuns.useQuery();
  const runSummaries = trpc.evaluationRun.listSummaries.useQuery();
  const comparisons = trpc.comparison.listComparisons.useQuery();
  const latestComparison = trpc.comparison.getLatest.useQuery();
  const [selectedComparisonId, setSelectedComparisonId] = useState('');
  const [baselineRunId, setBaselineRunId] = useState('');
  const [candidateRunId, setCandidateRunId] = useState('');
  const [pollingRunId, setPollingRunId] = useState<string | null>(null);

  const hasActiveRun =
    runSummaries.data?.some((r) => r.status === 'PENDING' || r.status === 'RUNNING') ?? false;

  useEffect(() => {
    if (!hasActiveRun) {
      setPollingRunId(null);
      return;
    }
    const activeRun = runSummaries.data?.find(
      (r) => r.status === 'PENDING' || r.status === 'RUNNING',
    );
    if (activeRun) setPollingRunId(activeRun.id);
  }, [hasActiveRun, runSummaries.data]);

  useEffect(() => {
    if (!pollingRunId) return;
    const interval = setInterval(() => {
      runSummaries.refetch();
      runs.refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingRunId, runSummaries, runs]);

  const triggerRun = trpc.evaluationRun.triggerRun.useMutation({
    onSuccess: async (data) => {
      setPollingRunId(data.runId);
      await runSummaries.refetch();
      router.push('/runs');
    },
  });

  const comparisonDetail = trpc.comparison.get.useQuery(
    { comparisonId: selectedComparisonId },
    { enabled: Boolean(selectedComparisonId) },
  );

  const createComparison = trpc.comparison.create.useMutation({
    onSuccess: async (comparison) => {
      setSelectedComparisonId(comparison.id);
      await Promise.all([
        utils.comparison.listComparisons.invalidate(),
        utils.comparison.getLatest.invalidate(),
        utils.comparison.get.invalidate({ comparisonId: comparison.id }),
      ]);
    },
  });

  useEffect(() => {
    if (selectedComparisonId || !latestComparison.data) return;
    setSelectedComparisonId(latestComparison.data.id);
  }, [latestComparison.data, selectedComparisonId]);

  useEffect(() => {
    if (!runs.data?.length || baselineRunId || candidateRunId) return;
    const baselineAgent = agents.data?.find((item) => item.type === 'baseline');
    const candidateAgent = agents.data?.find((item) => item.type === 'candidate');
    const baselineRun = runs.data.find((item) => item.agentVersionName === baselineAgent?.name);
    const candidateRun = runs.data.find((item) => item.agentVersionName === candidateAgent?.name);
    if (baselineRun) setBaselineRunId(baselineRun.id);
    if (candidateRun) setCandidateRunId(candidateRun.id);
  }, [agents.data, baselineRunId, candidateRunId, runs.data]);

  const activeComparison = comparisonDetail.data ?? latestComparison.data ?? null;
  const trusted = evalCases.data?.filter((item) => item.status === 'TRUSTED') ?? [];
  const critical = trusted.filter((item) => item.criticality === 'CRITICAL');
  const baselineAgent = agents.data?.find((item) => item.type === 'baseline');
  const candidateAgent = agents.data?.find((item) => item.type === 'candidate');

  const highlightedCases = useMemo(() => {
    if (!activeComparison) return [];
    return activeComparison.cases.filter(
      (item) => item.classification === 'REGRESSION' || item.classification === 'IMPROVEMENT',
    );
  }, [activeComparison]);

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Version Compare"
        description="Persist, inspect, and approve or block baseline-versus-candidate evaluation deltas."
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
          <AgentCard
            title="Baseline"
            icon={ShieldCheck}
            agent={baselineAgent}
            onRun={() => {
              if (baselineAgent) triggerRun.mutate({ agentVersionId: baselineAgent.id });
            }}
            isRunning={triggerRun.isPending}
          />
          <AgentCard
            title="Candidate"
            icon={GitCompare}
            agent={candidateAgent}
            onRun={() => {
              if (candidateAgent) triggerRun.mutate({ agentVersionId: candidateAgent.id });
            }}
            isRunning={triggerRun.isPending}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suite readiness</CardTitle>
              <CardDescription>
                Trusted coverage available for persisted comparison runs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SummaryRow label="Trusted cases" value={String(trusted.length)} />
              <SummaryRow label="Critical cases" value={String(critical.length)} />
              <SummaryRow label="Completed runs" value={String(runs.data?.length ?? 0)} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Persisted Comparison</CardTitle>
              <CardDescription>
                Compare two completed runs over the same frozen suite and persist the release
                decision.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={baselineRunId} onValueChange={setBaselineRunId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Baseline run" />
                  </SelectTrigger>
                  <SelectContent>
                    {runs.data?.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.agentVersionName} · {run.suiteName} v{run.suiteVersion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={candidateRunId} onValueChange={setCandidateRunId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Candidate run" />
                  </SelectTrigger>
                  <SelectContent>
                    {runs.data?.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.agentVersionName} · {run.suiteName} v{run.suiteVersion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={
                    !baselineRunId ||
                    !candidateRunId ||
                    baselineRunId === candidateRunId ||
                    createComparison.isPending
                  }
                  onClick={() => createComparison.mutate({ baselineRunId, candidateRunId })}
                >
                  {createComparison.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Persisting
                    </>
                  ) : (
                    'Persist comparison'
                  )}
                </Button>
              </div>

              <Select value={selectedComparisonId} onValueChange={setSelectedComparisonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Latest comparison" />
                </SelectTrigger>
                <SelectContent>
                  {comparisons.data?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.baselineAgentName} vs {item.candidateAgentName} ·{' '}
                      {item.qualityGateDecision}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {createComparison.error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {createComparison.error.message}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality Gate</CardTitle>
              <CardDescription>
                Persisted gate result from the latest selected comparison.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeComparison ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={decisionVariant(activeComparison.qualityGate.decision)}>
                      {activeComparison.qualityGate.decision}
                    </Badge>
                    <Badge variant="outline">
                      {activeComparison.summary.criticalRegressionCount} critical regressions
                    </Badge>
                  </div>
                  {activeComparison.qualityGate.reasons.length > 0 ? (
                    <div className="space-y-2">
                      {activeComparison.qualityGate.reasons.map((reason) => (
                        <div key={reason} className="rounded-lg border px-3 py-2 text-sm">
                          {reason}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                      Candidate meets the configured release gate.
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <ShieldAlert className="size-4 text-muted-foreground" />
                  <span>Persist a comparison to evaluate the quality gate.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {comparisonDetail.isLoading && selectedComparisonId ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : activeComparison ? (
          <>
            <div className="grid gap-4 xl:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-semibold">
                    {activeComparison.summary.improvementCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Improvements</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-semibold">
                    {activeComparison.summary.regressionCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Regressions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-semibold">
                    {activeComparison.summary.criticalRegressionCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Critical Regressions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-semibold">
                    {formatMetric('averageExecutionCostUsd', activeComparison.costDeltaUsd)}
                  </div>
                  <p className="text-xs text-muted-foreground">Average Cost Delta</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Metric Deltas</CardTitle>
                  <CardDescription>
                    Candidate metrics are evaluated from persisted grader counts and execution
                    usage.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Baseline</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Delta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(activeComparison.metrics).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="font-medium">{metricLabels[key] ?? key}</TableCell>
                          <TableCell>{formatMetric(key, value.baseline)}</TableCell>
                          <TableCell>{formatMetric(key, value.candidate)}</TableCell>
                          <TableCell>
                            <span
                              className={
                                value.delta > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : value.delta < 0
                                    ? 'text-destructive'
                                    : 'text-muted-foreground'
                              }
                            >
                              {formatDelta(key, value.delta)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Case Outcomes</CardTitle>
                  <CardDescription>
                    Improvements and regressions are persisted per trusted case.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {highlightedCases.length > 0 ? (
                    <div className="space-y-3">
                      {highlightedCases.map((item) => (
                        <div key={item.id} className="rounded-lg border p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium">{item.evalCase.name}</div>
                            <Badge variant={classificationVariant(item.classification)}>
                              {item.classification.replaceAll('_', ' ')}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={item.isCritical ? 'destructive' : 'secondary'}>
                              {item.evalCase.criticality}
                            </Badge>
                            {item.failureTypes.map((failure) => (
                              <Badge key={failure} variant="outline">
                                {failure}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
                      This comparison produced no regressions or improvements.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <GitCompare className="size-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No persisted comparison yet</p>
                <p className="text-sm text-muted-foreground">
                  Complete baseline and candidate runs, then persist a comparison here to unlock
                  metrics and quality-gate evidence.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Default Quality Gate Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {[
                  ['Critical finding recall', '>= 0.95'],
                  ['Finding precision', '>= 0.90'],
                  ['Audit citation precision', '>= 0.98'],
                  ['Rule-reference accuracy', '>= 0.98'],
                  ['Schema validity', '= 1.00'],
                  ['CAP completeness', '>= 0.95'],
                  ['Critical regressions', '= 0'],
                  ['Hallucinated finding rate', '<= 0.02'],
                ].map(([metric, target]) => (
                  <TableRow key={metric}>
                    <TableCell className="font-medium">{metric}</TableCell>
                    <TableCell className="text-right">{target}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
