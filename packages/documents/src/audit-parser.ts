import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const AuditPageSchema = z.object({
  pageNumber: z.number().int().positive(),
  text: z.string().min(1),
  normalizedText: z.string().optional(),
  extractionStatus: z.enum(['PENDING', 'EXTRACTED', 'FAILED']).default('PENDING'),
  parserVersion: z.string().optional(),
});

export type ParsedAuditPage = z.infer<typeof AuditPageSchema>;

export class AuditParser {
  private readonly version = '1.0.0';

  async parseFromJson(filePath: string): Promise<ParsedAuditPage[]> {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (Array.isArray(data)) {
      return data.map((page) => this.normalizePage(page));
    }

    if (data.pages && Array.isArray(data.pages)) {
      return data.pages.map((page: Record<string, unknown>) => this.normalizePage(page));
    }

    throw new Error(`Invalid audit file format at ${filePath}: expected array or { pages: [...] }`);
  }

  async parseFromText(fullText: string, startPage = 1): Promise<ParsedAuditPage[]> {
    const pageDelimiter = /\n\s*---\s*\n|\n\s*===PAGE\s+\d+===\s*\n/i;
    const rawPages = fullText.split(pageDelimiter).filter((p) => p.trim());

    return rawPages.map((text, i) => ({
      pageNumber: startPage + i,
      text: text.trim(),
      normalizedText: this.normalizeText(text),
      extractionStatus: 'EXTRACTED' as const,
      parserVersion: this.version,
    }));
  }

  private normalizePage(raw: Record<string, unknown>): ParsedAuditPage {
    const pageNumber =
      typeof raw['pageNumber'] === 'number'
        ? raw['pageNumber']
        : typeof raw['page_number'] === 'number'
          ? raw['page_number']
          : 1;

    const text =
      typeof raw['text'] === 'string'
        ? raw['text']
        : typeof raw['content'] === 'string'
          ? raw['content']
          : '';

    return {
      pageNumber,
      text,
      normalizedText: this.normalizeText(text),
      extractionStatus: text.length > 0 ? 'EXTRACTED' : 'FAILED',
      parserVersion: this.version,
    };
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, '  ')
      .replace(/[ ]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
