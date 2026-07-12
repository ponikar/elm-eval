"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/trpc/react";
import { PageHeader } from "@/components/page-header";
import { AuditPageViewer } from "@/components/audit-page-viewer";
import { FindingsTable } from "@/components/findings-table";
import { FindingDetail } from "@/components/finding-detail";
import { Badge, Separator } from "@repo/ui";

export default function AuditDetailPage() {
  const params = useParams();
  const auditId = params["id"] as string;
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  const audit = trpc.audit.get.useQuery({ id: auditId });
  const findings = trpc.audit.getFindings.useQuery({ auditId });

  const selectedFinding = findings.data?.find((f) => f.id === selectedFindingId);

  if (audit.isLoading || findings.isLoading) {
    return (
      <div>
        <PageHeader title="Audit Review" description="Loading..." />
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!audit.data) {
    return (
      <div>
        <PageHeader title="Audit Review" description="Not found" />
        <div className="p-6 text-sm text-muted-foreground">Audit not found.</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={audit.data.supplierName}
        description={`${audit.data.factoryName} · ${audit.data.documentName}`}
        actions={
          <Badge variant="outline">{audit.data.auditStandard}</Badge>
        }
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Audit pages */}
        <div className="w-1/2 border-r overflow-hidden">
          <AuditPageViewer
            pages={audit.data.pages}
            highlightPage={selectedFinding?.auditEvidence.pageNumber}
          />
        </div>

        {/* Right panel: Findings */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold">
              Findings ({findings.data?.length ?? 0})
            </h2>
          </div>

          {selectedFinding ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b p-2">
                <button
                  onClick={() => setSelectedFindingId(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  &larr; Back to all findings
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <FindingDetail finding={selectedFinding} />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <FindingsTable
                findings={findings.data ?? []}
                selectedId={selectedFindingId ?? undefined}
                onSelect={setSelectedFindingId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
