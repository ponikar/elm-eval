import fs from 'node:fs/promises';
import { z } from 'zod';

const RulebookPageSchema = z.object({
  pageNumber: z.number().int().positive(),
  text: z.string().min(1),
});

export type RulebookPage = z.infer<typeof RulebookPageSchema>;

export class RulebookParser {
  async parseFromJson(filePath: string): Promise<RulebookPage[]> {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (Array.isArray(data)) {
      return data.map((page, i) => ({
        pageNumber: page.pageNumber ?? page.page_number ?? i + 1,
        text: page.text ?? page.content ?? '',
      }));
    }

    if (data.pages && Array.isArray(data.pages)) {
      return data.pages.map((page: Record<string, unknown>, i: number) => ({
        pageNumber: (page['pageNumber'] as number) ?? (page['page_number'] as number) ?? i + 1,
        text: (page['text'] as string) ?? (page['content'] as string) ?? '',
      }));
    }

    throw new Error(
      `Invalid rulebook file format at ${filePath}: expected array or { pages: [...] }`,
    );
  }

  async parseFromText(fullText: string, startPage = 1): Promise<RulebookPage[]> {
    const pageDelimiter = /\n\s*---\s*\n|\n\s*===PAGE\s+\d+===\s*\n/i;
    const rawPages = fullText.split(pageDelimiter).filter((p) => p.trim());

    return rawPages.map((text, i) => ({
      pageNumber: startPage + i,
      text: text.trim(),
    }));
  }

  concatenatePages(pages: RulebookPage[]): string {
    return pages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
      .join('\n\n');
  }
}
