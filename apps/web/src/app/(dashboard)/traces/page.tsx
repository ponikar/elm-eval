'use client';

import { Card, CardContent } from '@repo/ui';
import { Activity, ArrowRight } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';

export default function TracesPage() {
  return (
    <div>
      <DashboardHeader
        title="Failure Traces"
        description="Investigate pipeline stage failures and model outputs"
      />
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-sm font-semibold">Pipeline Traces</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              View input pages, retrieved rules, actual vs expected output, grader results, token
              usage, cost, stage latency, and failure category.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground/60">
              Coming soon
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
