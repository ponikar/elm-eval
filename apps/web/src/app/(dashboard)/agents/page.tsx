"use client";

import { trpc } from "@/trpc/react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";

export default function AgentsPage() {
  const agents = trpc.agentVersion.list.useQuery();

  return (
    <div>
      <PageHeader
        title="Agent Versions"
        description="Compare agent configurations and track baseline vs candidate"
      />
      <div className="p-6">
        {agents.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              {agents.data?.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <CardDescription>{agent.model}</CardDescription>
                      </div>
                      <Badge
                        variant={
                          agent.type === "baseline" ? "secondary" : "default"
                        }
                      >
                        {agent.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Prompt v:</span>{" "}
                        {agent.promptVersion}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Temperature:</span>{" "}
                        {agent.temperature}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Top K:</span>{" "}
                        {agent.retrievalTopK}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Timeout:</span>{" "}
                        {agent.timeoutMs}ms
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Retries:</span>{" "}
                        {agent.maxRetries}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Schema v:</span>{" "}
                        {agent.extractionSchemaVersion}
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
                      <TableHead>Setting</TableHead>
                      {agents.data?.map((agent) => (
                        <TableHead key={agent.id}>{agent.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Model</TableCell>
                      {agents.data?.map((agent) => (
                        <TableCell key={agent.id}>{agent.model}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Type</TableCell>
                      {agents.data?.map((agent) => (
                        <TableCell key={agent.id}>
                          <Badge
                            variant={
                              agent.type === "baseline" ? "secondary" : "default"
                            }
                          >
                            {agent.type}
                          </Badge>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Prompt Version</TableCell>
                      {agents.data?.map((agent) => (
                        <TableCell key={agent.id}>{agent.promptVersion}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Temperature</TableCell>
                      {agents.data?.map((agent) => (
                        <TableCell key={agent.id}>{agent.temperature}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Retrieval Top K</TableCell>
                      {agents.data?.map((agent) => (
                        <TableCell key={agent.id}>{agent.retrievalTopK}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Rulebook Version</TableCell>
                      {agents.data?.map((agent) => (
                        <TableCell key={agent.id}>
                          {agent.rulebookVersionId}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Timeout (ms)</TableCell>
                      {agents.data?.map((agent) => (
                        <TableCell key={agent.id}>{agent.timeoutMs}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Max Retries</TableCell>
                      {agents.data?.map((agent) => (
                        <TableCell key={agent.id}>{agent.maxRetries}</TableCell>
                      ))}
                    </TableRow>
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
