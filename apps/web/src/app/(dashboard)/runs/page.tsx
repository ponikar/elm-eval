'use client';

import { Card, CardContent } from '@repo/ui';
import { ArrowRight, Play } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';

export default function RunsPage() {
  return (
    <div>
      <DashboardHeader title="Eval Runs" description="Track evaluation run progress and results" />
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Play className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-sm font-semibold">Evaluation Runs</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Track cases completed, passed, failed, cost, latency, and pipeline status for each
              evaluation run.
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
