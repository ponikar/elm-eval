"use client";

import { ScrollArea, Badge } from "@repo/ui";

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
      <div className="space-y-4 p-4">
        {pages.map((page) => (
          <div
            key={page.pageNumber}
            className={`rounded-md border p-4 transition-colors ${
              highlightPage === page.pageNumber
                ? "border-blue-300 bg-blue-50"
                : "bg-background"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Page {page.pageNumber}
              </Badge>
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
