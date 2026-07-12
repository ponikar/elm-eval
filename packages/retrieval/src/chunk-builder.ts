import { z } from 'zod';

const ComplianceRuleSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  sectionTitle: z.string(),
  category: z.string(),
  requirementText: z.string(),
  sourcePage: z.number(),
  severityGuidance: z
    .object({
      defaultSeverity: z.string().optional(),
      escalationConditions: z.array(z.string()).optional(),
    })
    .optional(),
});

export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>;

export interface RuleChunk {
  id: string;
  ruleId: string;
  rulebookId: string;
  chunkText: string;
  embedding?: number[];
}

export class ChunkBuilder {
  buildChunksFromRules(rules: ComplianceRule[], rulebookId: string): RuleChunk[] {
    return rules.map((rule) => ({
      id: `chunk-${rulebookId}-${rule.id}`,
      ruleId: rule.id,
      rulebookId,
      chunkText: this.formatChunkText(rule),
    }));
  }

  private formatChunkText(rule: ComplianceRule): string {
    const parts = [
      `[${rule.sectionId}] ${rule.sectionTitle}`,
      `Category: ${rule.category}`,
      rule.requirementText,
    ];

    if (rule.severityGuidance) {
      if (rule.severityGuidance.defaultSeverity) {
        parts.push(`Default severity: ${rule.severityGuidance.defaultSeverity}`);
      }
      if (
        rule.severityGuidance.escalationConditions &&
        rule.severityGuidance.escalationConditions.length > 0
      ) {
        parts.push(`Escalation: ${rule.severityGuidance.escalationConditions.join('; ')}`);
      }
    }

    return parts.join('\n');
  }
}
