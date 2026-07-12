'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/trpc/react';
import { DashboardHeader } from '@/components/dashboard-header';
import { AuditPageViewer } from '@/components/audit-page-viewer';
import { FindingsTable } from '@/components/findings-table';
import { FindingDetail } from '@/components/finding-detail';
import { Badge, Skeleton } from '@repo/ui';
import { ArrowLeft } from 'lucide-react';

export default function AuditDetailPage() {
  const params = useParams();
  const auditId = params['id'] as string;
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  const audit = trpc.audit.get.useQuery({ id: auditId });
  const findings = trpc.audit.getFindings.useQuery({ auditId });

  const selectedFinding = findings.data?.find((f) => f.id === selectedFindingId);

  if (audit.isLoading || findings.isLoading) {
    return (
      <div>
        <DashboardHeader title="Audit Review" description="Loading..." />
        <div className="flex h-[calc(100vh-57px)] items-center justify-center">
          <div className="space-y-3 text-center">
            <Skeleton className="mx-auto h-8 w-48" />
            <Skeleton className="mx-auto h-4 w-72" />
          </div>
        </div>
      </div>
    );
  }

  if (!audit.data) {
    return (
      <div>
        <DashboardHeader title="Audit Review" description="Not found" />
        <div className="flex h-[calc(100vh-57px)] items-center justify-center">
          <p className="text-sm text-muted-foreground">Audit not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader
        title={audit.data.supplierName}
        description={`${audit.data.factoryName} · ${audit.data.documentName}`}
        actions={<Badge variant="outline">{audit.data.auditStandard}</Badge>}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Audit pages */}
        <div className="w-1/2 border-r bg-muted/20">
          <AuditPageViewer
            pages={audit.data.pages}
            highlightPage={selectedFinding?.auditEvidence.pageNumber}
          />
        </div>

        {/* Right panel: Findings */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-sm font-semibold">
              Findings
              <span className="ml-1.5 text-muted-foreground font-normal">
                ({findings.data?.length ?? 0})
              </span>
            </h2>
          </div>

          {selectedFinding ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b px-6 py-3">
                <button
                  onClick={() => setSelectedFindingId(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to all findings
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
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
