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
import { Bot, RotateCcw, Timer, Zap } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { trpc } from '@/trpc/react';

export default function AgentsPage() {
  const agents = trpc.agentVersion.list.useQuery();

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Agent Versions"
        description="Review the exact configuration currently wired into baseline and candidate agents."
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {agents.isLoading ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <Skeleton key={j} className="h-4 w-20" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agent cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {agents.data?.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          <Bot className="h-4.5 w-4.5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <CardDescription>{agent.model}</CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant={agent.type === 'baseline' ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {agent.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <div>
                          <p className="text-[11px] text-muted-foreground/60">Temperature</p>
                          <p className="font-medium">{agent.temperature}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <RotateCcw className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <div>
                          <p className="text-[11px] text-muted-foreground/60">Top K</p>
                          <p className="font-medium">{agent.retrievalTopK}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Timer className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <div>
                          <p className="text-[11px] text-muted-foreground/60">Timeout</p>
                          <p className="font-medium">{agent.timeoutMs}ms</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Comparison table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuration Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Setting</TableHead>
                      {agents.data?.map((agent) => (
                        <TableHead key={agent.id}>{agent.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { label: 'Model', key: 'model' },
                      { label: 'Type', key: 'type' },
                      { label: 'Prompt Version', key: 'promptVersion' },
                      { label: 'Temperature', key: 'temperature' },
                      { label: 'Retrieval Top K', key: 'retrievalTopK' },
                      {
                        label: 'Rulebook Version',
                        key: 'rulebookVersionId',
                      },
                      { label: 'Timeout (ms)', key: 'timeoutMs' },
                      { label: 'Max Retries', key: 'maxRetries' },
                    ].map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="font-medium text-muted-foreground">
                          {row.label}
                        </TableCell>
                        {agents.data?.map((agent) => (
                          <TableCell key={agent.id}>
                            {row.key === 'type' ? (
                              <Badge
                                variant={agent.type === 'baseline' ? 'secondary' : 'default'}
                                className="text-xs"
                              >
                                {String(agent[row.key as keyof typeof agent])}
                              </Badge>
                            ) : (
                              String(agent[row.key as keyof typeof agent])
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
