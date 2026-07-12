'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@repo/ui';
import { ArrowRight, Building2, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/dashboard-header';
import { trpc } from '@/trpc/react';

export default function AuditsPage() {
  const audits = trpc.audit.list.useQuery();

  return (
    <div>
      <DashboardHeader
        title="Audit Review"
        description="Review supplier audit findings and evidence"
      />
      <div className="p-8">
        {audits.isLoading ? (
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
        ) : (
          <div className="grid gap-4">
            {audits.data?.map((audit) => (
              <Link key={audit.id} href={`/audits/${audit.id}`}>
                <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-foreground/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {audit.supplierName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          {audit.factoryName}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {audit.auditStandard}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm text-muted-foreground">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Review
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
