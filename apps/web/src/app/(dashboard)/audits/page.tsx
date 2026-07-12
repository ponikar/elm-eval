"use client";

import Link from "next/link";
import { trpc } from "@/trpc/react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@repo/ui";

export default function AuditsPage() {
  const audits = trpc.audit.list.useQuery();

  return (
    <div>
      <PageHeader
        title="Audit Review"
        description="Review supplier audit findings and evidence"
      />
      <div className="p-6">
        {audits.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid gap-4">
            {audits.data?.map((audit) => (
              <Link key={audit.id} href={`/audits/${audit.id}`}>
                <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {audit.supplierName}
                        </CardTitle>
                        <CardDescription>
                          {audit.factoryName} &middot; {audit.documentName}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{audit.auditStandard}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{audit.pageCount} pages</span>
                      <span>{audit.findingCount} findings</span>
                      <span>Audit date: {audit.auditDate}</span>
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
