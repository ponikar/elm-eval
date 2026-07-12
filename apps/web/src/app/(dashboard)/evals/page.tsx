"use client";

import { trpc } from "@/trpc/react";
import { PageHeader } from "@/components/page-header";
import { CategoryBadge } from "@/components/category-badge";
import { SeverityBadge } from "@/components/severity-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
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
} from "@repo/ui";

function CriticalityBadge({ criticality }: { criticality: string }) {
  return (
    <Badge
      variant={criticality === "CRITICAL" ? "destructive" : "secondary"}
      className="text-xs"
    >
      {criticality}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    TRUSTED: "bg-green-100 text-green-800 border-green-200",
    PENDING_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
    DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return (
    <Badge variant="outline" className={`text-xs ${config[status] ?? ""}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = {
    HUMAN_CREATED: "Human",
    HUMAN_CORRECTION: "Correction",
    PRODUCTION_FAILURE: "Failure",
    GENERATED_APPROVED: "Generated",
  };
  return (
    <Badge variant="outline" className="text-xs">
      {labels[source] ?? source}
    </Badge>
  );
}

export default function EvalsPage() {
  const evalCases = trpc.evalCase.list.useQuery();

  const trusted = evalCases.data?.filter((c) => c.status === "TRUSTED") ?? [];
  const pending =
    evalCases.data?.filter((c) => c.status === "PENDING_REVIEW") ?? [];
  const draft = evalCases.data?.filter((c) => c.status === "DRAFT") ?? [];

  return (
    <div>
      <PageHeader
        title="Eval Suite"
        description="Trusted evaluation cases for agent quality gates"
      />
      <div className="p-6">
        {evalCases.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="mb-6 grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {evalCases.data?.length ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Cases</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {trusted.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Trusted</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-600">
                    {pending.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-gray-500">
                    {draft.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Draft</p>
                </CardContent>
              </Card>
            </div>

            {/* Cases table with tabs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evaluation Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">
                      All ({evalCases.data?.length ?? 0})
                    </TabsTrigger>
                    <TabsTrigger value="trusted">
                      Trusted ({trusted.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                      Pending ({pending.length})
                    </TabsTrigger>
                    <TabsTrigger value="draft">
                      Draft ({draft.length})
                    </TabsTrigger>
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
    expected: Array<{ findingShouldExist: boolean; severity?: string }>;
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
              <div className="flex gap-1">
                {c.expected.map((exp, i) => (
                  <span key={i} className="text-xs text-muted-foreground">
                    {exp.findingShouldExist ? "must find" : "must not find"}
                    {exp.severity && (
                      <>
                        {" "}
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
