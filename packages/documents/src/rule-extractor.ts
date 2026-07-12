import { GoogleGenAI } from '@google/genai';
import { env } from '@repo/domain';
import { z } from 'zod';

const ComplianceRuleSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  sectionTitle: z.string(),
  category: z.enum([
    'HEALTH_AND_SAFETY',
    'WORKING_HOURS',
    'WAGES_AND_BENEFITS',
    'FORCED_LABOR',
    'CHILD_LABOR',
    'ENVIRONMENT',
    'ETHICS',
    'MANAGEMENT_SYSTEM',
  ]),
  requirementText: z.string(),
  sourcePage: z.number(),
  severityGuidance: z
    .object({
      defaultSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
      escalationConditions: z.array(z.string()).optional(),
    })
    .optional(),
});

export type ExtractedRule = z.infer<typeof ComplianceRuleSchema>;

export interface RuleExtractorConfig {
  apiKey?: string;
  model?: string;
}

export class RuleExtractor {
  private genAI: GoogleGenAI;
  private model: string;

  constructor(config: RuleExtractorConfig = {}) {
    const apiKey = config.apiKey ?? env.GEMINI_API_KEY;
    this.genAI = new GoogleGenAI({ apiKey });
    this.model = config.model ?? env.GEMINI_MODEL;
  }

  async extractRules(rulebookText: string, standardName: string): Promise<ExtractedRule[]> {
    const prompt = this.buildExtractionPrompt(standardName);

    const response = await this.genAI.models.generateContent({
      model: this.model,
      contents: `${prompt}\n\n--- RULEBOOK TEXT ---\n\n${rulebookText}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: z.array(ComplianceRuleSchema),
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned empty response for rule extraction');
    }

    const parsed = JSON.parse(text);
    const validated = z.array(ComplianceRuleSchema).parse(parsed);

    return this.deduplicateRules(validated);
  }

  async extractRulesFromPages(
    pages: Array<{ pageNumber: number; text: string }>,
    standardName: string,
  ): Promise<ExtractedRule[]> {
    const fullText = pages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
      .join('\n\n');

    return this.extractRules(fullText, standardName);
  }

  private buildExtractionPrompt(standardName: string): string {
    return `You are an expert in supplier compliance auditing. Extract ALL compliance rules from this ${standardName} rulebook.

For each rule, produce:
- id: Stable rule ID in format "RULE-{sectionId}-{number}" (e.g., "RULE-3.5-1")
- sectionId: The section/subsection identifier (e.g., "3.5", "4.1")
- sectionTitle: Human-readable section title
- category: One of HEALTH_AND_SAFETY, WORKING_HOURS, WAGES_AND_BENEFITS, FORCED_LABOR, CHILD_LABOR, ENVIRONMENT, ETHICS, MANAGEMENT_SYSTEM
- requirementText: The actual requirement text, cleaned up for clarity
- sourcePage: The page number where this rule appears
- severityGuidance: If the text indicates severity levels or escalation conditions, include them. Otherwise omit.

Rules:
1. Extract EVERY distinct requirement, not just summaries
2. Each rule should be atomic — one testable requirement
3. Preserve exact thresholds (e.g., "80cm minimum", "60 hours per week")
4. Include both prescriptive rules ("must") and descriptive standards ("should")
5. If a section has multiple sub-requirements, create separate rules for each
6. Use the page numbers from the text markers (--- Page N ---)

Return a JSON array of all extracted rules.`;
  }

  private deduplicateRules(rules: ExtractedRule[]): ExtractedRule[] {
    const seen = new Map<string, ExtractedRule>();

    for (const rule of rules) {
      const key = `${rule.sectionId}:${rule.requirementText.slice(0, 100)}`;
      if (!seen.has(key)) {
        seen.set(key, rule);
      }
    }

    return Array.from(seen.values());
  }
}
