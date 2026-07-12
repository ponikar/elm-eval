'use client';

import { cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui';
import { SeverityBadge } from './severity-badge';
import { ReviewStatusBadge } from './review-status-badge';
import { CategoryBadge } from './category-badge';

interface Finding {
  id: string;
  title: string;
  category: string;
  severity: string;
  confidence: number;
  reviewStatus: string;
  auditEvidence: { pageNumber: number; quote: string };
}

interface FindingsTableProps {
  findings: Finding[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export function FindingsTable({ findings, selectedId, onSelect }: FindingsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Finding</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {findings.map((finding) => (
          <TableRow
            key={finding.id}
            onClick={() => onSelect?.(finding.id)}
            className={cn('cursor-pointer', selectedId === finding.id && 'bg-accent')}
          >
            <TableCell className="font-medium max-w-[200px] truncate">{finding.title}</TableCell>
            <TableCell>
              <CategoryBadge category={finding.category as never} />
            </TableCell>
            <TableCell>
              <SeverityBadge severity={finding.severity as never} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {Math.round(finding.confidence * 100)}%
            </TableCell>
            <TableCell>
              <ReviewStatusBadge status={finding.reviewStatus as never} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
