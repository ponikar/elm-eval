'use client';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@repo/ui';
import { Building2, Calendar, FileText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/dashboard-header';
import { trpc } from '@/trpc/react';

export default function AuditsPage() {
  const audits = trpc.audit.list.useQuery();
  const totalFindings = audits.data?.reduce((sum, audit) => sum + audit.findingCount, 0) ?? 0;
  const totalPages = audits.data?.reduce((sum, audit) => sum + audit.pageCount, 0) ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Audit Review"
        description="Review supplier audit findings, evidence, and corrective actions."
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {audits.isLoading ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="mb-2 h-4 w-24" />
                    <Skeleton className="h-7 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-72" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-64" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AuditStat label="Audits" value={String(audits.data?.length ?? 0)} icon={Building2} />
              <AuditStat label="Findings" value={String(totalFindings)} icon={ShieldCheck} />
              <AuditStat label="Pages" value={String(totalPages)} icon={FileText} />
              <AuditStat
                label="Latest audit"
                value={audits.data?.[0]?.auditDate ?? '—'}
                icon={Calendar}
              />
            </div>

            <div className="grid gap-4">
              {audits.data?.map((audit) => (
                <Link key={audit.id} href={`/audits/${audit.id}`}>
                  <Card className="hover:border-foreground/20 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{audit.supplierName}</CardTitle>
                          <CardDescription className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {audit.factoryName}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="w-fit text-xs">
                          {audit.auditStandard}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {audit.pageCount} pages
                        </span>
                        <span>{audit.findingCount} findings</span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {audit.auditDate}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-primary">Open review</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AuditStat({
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
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
