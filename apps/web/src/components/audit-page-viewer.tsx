'use client';

import { ScrollArea, Badge } from '@repo/ui';
import { FileText } from 'lucide-react';

interface AuditPage {
  pageNumber: number;
  text: string;
}

interface AuditPageViewerProps {
  pages: AuditPage[];
  highlightPage?: number;
}

export function AuditPageViewer({ pages, highlightPage }: AuditPageViewerProps) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-5">
        {pages.map((page) => (
          <div
            key={page.pageNumber}
            className={`rounded-lg border p-5 transition-all ${
              highlightPage === page.pageNumber
                ? 'border-primary/40 bg-primary/5 shadow-sm'
                : 'bg-background hover:bg-muted/30'
            }`}
          >
            <div className="mb-2.5 flex items-center gap-2">
              <FileText
                className={`h-3.5 w-3.5 ${
                  highlightPage === page.pageNumber ? 'text-primary' : 'text-muted-foreground/50'
                }`}
              />
              <Badge
                variant={highlightPage === page.pageNumber ? 'default' : 'outline'}
                className="text-[11px]"
              >
                Page {page.pageNumber}
              </Badge>
              {highlightPage === page.pageNumber && (
                <span className="text-[11px] text-primary font-medium">Evidence</span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {page.text}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
