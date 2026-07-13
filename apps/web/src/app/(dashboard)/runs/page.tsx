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
import { Activity, CheckCircle2, Clock3, Play } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { trpc } from '@/trpc/react';

export default function RunsPage() {
  const runs = trpc.evaluationRun.list.useQuery();

  const total = runs.data?.length ?? 0;
  const running = runs.data?.filter((run) => run.status === 'RUNNING').length ?? 0;
  const completed = runs.data?.filter((run) => run.status === 'COMPLETED').length ?? 0;
  const pending = runs.data?.filter((run) => run.status === 'PENDING').length ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Eval Runs"
        description="Queue, monitor, and inspect persisted evaluation executions."
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {runs.isLoading ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
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
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total runs" value={String(total)} icon={Play} />
              <MetricCard label="Running" value={String(running)} icon={Activity} />
              <MetricCard label="Completed" value={String(completed)} icon={CheckCircle2} />
              <MetricCard label="Pending" value={String(pending)} icon={Clock3} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Persisted Runs</CardTitle>
                <CardDescription>
                  Each row maps to one frozen suite evaluated against one agent version.
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
                        <TableHead>Run</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Suite</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.data?.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">{run.id}</TableCell>
                          <TableCell>
                            <Badge variant={run.status === 'COMPLETED' ? 'secondary' : 'outline'}>
                              {run.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {run.suiteSnapshot.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {run.agentVersionSnapshot.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {run.createdAt}
                          </TableCell>
                        </TableRow>
                      ))}
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
