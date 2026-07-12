import type { ComplianceRule } from '@repo/domain';

export interface RuleChunk {
  id: string;
  ruleId: string;
  rulebookId: string;
  rulebookVersion: string;
  text: string;
  pageNumber: number;
  metadata: {
    sectionId: string;
    sectionTitle: string;
    category: string;
  };
  embedding?: number[];
  embeddingModel?: string;
}

export class ChunkBuilder {
  buildChunksFromRules(rules: ComplianceRule[]): RuleChunk[] {
    return rules.map((rule) => ({
      id: `chunk-${rule.rulebookId}-${rule.id}`,
      ruleId: rule.id,
      rulebookId: rule.rulebookId,
      rulebookVersion: rule.rulebookVersion,
      text: this.formatChunkText(rule),
      pageNumber: rule.sourcePage,
      metadata: {
        sectionId: rule.sectionId,
        sectionTitle: rule.sectionTitle,
        category: rule.category,
      },
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
