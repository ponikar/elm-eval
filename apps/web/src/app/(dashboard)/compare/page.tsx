'use client';

import {
  Badge,
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
import { GitCompare, ShieldAlert, ShieldCheck } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { trpc } from '@/trpc/react';

const defaultGates = [
  ['Critical finding recall', '>= 0.95'],
  ['Finding precision', '>= 0.90'],
  ['Audit citation precision', '>= 0.98'],
  ['Rule-reference accuracy', '>= 0.98'],
  ['Schema validity', '= 1.00'],
  ['CAP completeness', '>= 0.95'],
  ['Critical regressions', '= 0'],
  ['Hallucinated finding rate', '<= 0.02'],
] as const;

export default function ComparePage() {
  const evalCases = trpc.evalCase.list.useQuery();
  const agents = trpc.agentVersion.list.useQuery();

  const trusted = evalCases.data?.filter((item) => item.status === 'TRUSTED') ?? [];
  const critical = trusted.filter((item) => item.criticality === 'CRITICAL');
  const baseline = agents.data?.find((item) => item.type === 'baseline');
  const candidate = agents.data?.find((item) => item.type === 'candidate');

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Version Compare"
        description="Baseline and candidate configuration review before formal evaluation."
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
          <AgentCard title="Baseline" icon={ShieldCheck} agent={baseline} />
          <AgentCard title="Candidate" icon={GitCompare} agent={candidate} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suite readiness</CardTitle>
              <CardDescription>Trusted coverage available for the comparison run.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SummaryRow label="Trusted cases" value={String(trusted.length)} />
              <SummaryRow label="Critical cases" value={String(critical.length)} />
              <SummaryRow
                label="Pending review"
                value={String((evalCases.data?.length ?? 0) - trusted.length)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Delta</CardTitle>
              <CardDescription>
                The candidate should only move forward if changes are intentional and measurable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setting</TableHead>
                    <TableHead>Baseline</TableHead>
                    <TableHead>Candidate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ['Model', baseline?.model, candidate?.model],
                    ['Prompt version', baseline?.promptVersion, candidate?.promptVersion],
                    ['Temperature', baseline?.temperature, candidate?.temperature],
                    ['Retrieval top K', baseline?.retrievalTopK, candidate?.retrievalTopK],
                    ['Timeout (ms)', baseline?.timeoutMs, candidate?.timeoutMs],
                    ['Max retries', baseline?.maxRetries, candidate?.maxRetries],
                  ].map(([label, left, right]) => (
                    <TableRow key={label}>
                      <TableCell className="font-medium">{label}</TableCell>
                      <TableCell>{String(left ?? '—')}</TableCell>
                      <TableCell>{String(right ?? '—')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Quality Gates</CardTitle>
              <CardDescription>
                These thresholds come from the product requirements and define candidate release
                readiness.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm">
                <ShieldAlert className="size-4 text-muted-foreground" />
                <span>Formal pass/fail results unlock once persisted comparison runs exist.</span>
              </div>
              <Table>
                <TableBody>
                  {defaultGates.map(([metric, target]) => (
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
    </div>
  );
}

function AgentCard({
  title,
  icon: Icon,
  agent,
}: {
  title: string;
  icon: React.ElementType;
  agent:
    | {
        name: string;
        model: string;
        promptVersion: string;
        type: string;
        retrievalTopK: number;
      }
    | undefined;
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
        <SummaryRow label="Type" value={agent?.type ?? '—'} />
        <SummaryRow label="Retrieval top K" value={String(agent?.retrievalTopK ?? '—')} />
      </CardContent>
    </Card>
  );
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
