'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { Card, CardContent } from '@repo/ui';
import { BookOpen, ArrowRight } from 'lucide-react';

export default function RulebooksPage() {
  return (
    <div>
      <DashboardHeader
        title="Rulebooks"
        description="Browse compliance rules and rulebook versions"
      />
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-sm font-semibold">Rulebook Browser</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              View rulebook versions, sections, structured rules, source pages, and index status.
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
