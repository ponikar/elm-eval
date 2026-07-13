'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui';
import { Activity, FileSearch, GitBranch, TriangleAlert } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';

const traceStages = [
  ['ingestion', 'Audit pages preserved with page-level extraction status'],
  ['candidate-extraction', 'Candidate findings emitted from complete audit coverage'],
  ['deduplication', 'Duplicate findings merged before rule validation'],
  ['rule-retrieval', 'Relevant rule chunks selected from the chosen rulebook version'],
  ['validation', 'Evidence quotes, rules, and CAP schema checked deterministically'],
  ['grading', 'Expected vs actual matched for recall, precision, and failure types'],
] as const;

export default function TracesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Failure Traces"
        description="Stage-by-stage investigation surfaces for failed evaluations and audit review issues."
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <TraceSummaryCard
            icon={Activity}
            title="Pipeline stages"
            description="Trace events are organized around deterministic pipeline boundaries."
          />
          <TraceSummaryCard
            icon={FileSearch}
            title="Evidence first"
            description="Every failure investigation starts from page-preserved audit evidence and rule references."
          />
          <TraceSummaryCard
            icon={GitBranch}
            title="Version scoped"
            description="Trace review is anchored to the frozen suite, agent snapshot, and grader outputs."
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Trace Stages</CardTitle>
              <CardDescription>
                The UI is prepared for the final trace payload shape already persisted by the
                pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead>What the reviewer inspects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {traceStages.map(([stage, meaning]) => (
                    <TableRow key={stage}>
                      <TableCell className="font-mono text-xs">{stage}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{meaning}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current availability</CardTitle>
              <CardDescription>
                Persisted detailed trace retrieval is the remaining backend dependency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <TriangleAlert className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Viewer shell is in place</p>
                  <p className="text-muted-foreground">
                    The dashboard now exposes the trace surface consistently with the rest of the
                    app. Detailed execution records can slot into this panel without another layout
                    rewrite.
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                Expected trace payloads include input pages, retrieved rules, model output, grader
                decisions, usage, cost, and stage latency.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TraceSummaryCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex gap-3 pt-6">
        <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
