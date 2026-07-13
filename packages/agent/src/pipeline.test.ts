import type { AgentVersion, ComplianceRule, RuleChunk, SupplierAudit } from '@repo/domain';
import { describe, expect, it } from 'vitest';
import type {
  ModelProvider,
  StructuredGenerationRequest,
  StructuredGenerationResult,
} from './model-provider.js';
import { ModelProviderError } from './model-provider.js';
import { AuditAgentPipeline, type RuleRetriever } from './pipeline.js';

const audit: SupplierAudit = {
  id: 'a',
  supplierName: 'S',
  factoryName: 'F',
  auditStandard: 'RBA',
  auditDate: '2026',
  documentName: 'a.pdf',
  pages: [
    { pageNumber: 1, text: 'No issues.' },
    { pageNumber: 2, text: 'Cartons blocked Emergency Exit B.' },
  ],
};
const version: AgentVersion = {
  id: 'v',
  name: 'V',
  model: 'gemini-2.5-flash',
  promptVersion: 'p',
  systemPrompt: 'audit',
  temperature: 0,
  rulebookVersionId: 'rb',
  retrievalTopK: 3,
  extractionSchemaVersion: 's',
  correctiveActionPromptVersion: 'c',
  timeoutMs: 100,
  maxRetries: 1,
  createdAt: '2026',
  type: 'baseline',
};
const rule: ComplianceRule = {
  id: 'EXIT',
  rulebookId: 'rb',
  rulebookVersion: '8',
  sectionId: '1',
  sectionTitle: 'Exit',
  category: 'HEALTH_AND_SAFETY',
  requirementText: 'Clear exits',
  sourcePage: 1,
};
const chunk: RuleChunk = {
  id: 'c',
  ruleId: 'EXIT',
  rulebookId: 'rb',
  rulebookVersion: '8',
  text: 'Clear exits',
  pageNumber: 1,
  metadata: { sectionId: '1', sectionTitle: 'Exit', category: 'HEALTH_AND_SAFETY' },
};
class Provider implements ModelProvider {
  calls = 0;
  constructor(
    private outputs: unknown[],
    private errors: Array<Error | undefined> = [],
  ) {}
  async generateStructured<I, O>(
    r: StructuredGenerationRequest<I, O>,
  ): Promise<StructuredGenerationResult<O>> {
    const i = this.calls++;
    if (this.errors[i]) throw this.errors[i];
    return {
      output: r.schema.parse(this.outputs[i]),
      model: r.model,
      latencyMs: 1,
      costUsd: 0.001,
      tokenUsage: { input: 1, output: 1 },
    };
  }
}
const retriever: RuleRetriever = {
  search: async (_q, c, k) => c.slice(0, k).map((chunk) => ({ chunk, score: 0.9 })),
};
const candidate = {
  candidates: [
    {
      title: 'Emergency exit blocked',
      description: 'Cartons blocked the emergency exit.',
      category: 'HEALTH_AND_SAFETY',
      auditEvidence: { pageNumber: 2, quote: 'Cartons blocked Emergency Exit B' },
      confidence: 0.9,
    },
  ],
};
const finding = (page = 2, priority = 'URGENT') => ({
  title: 'Emergency exit blocked',
  description: 'Cartons blocked the emergency exit during audit.',
  category: 'HEALTH_AND_SAFETY',
  severity: 'CRITICAL',
  auditEvidence: { pageNumber: page, quote: 'Cartons blocked Emergency Exit B' },
  applicableRule: { ruleId: 'EXIT', rulebookVersion: '8' },
  confidence: 0.9,
  correctiveAction: {
    action: 'Remove cartons immediately.',
    ownerRole: 'Safety manager',
    deadlineDays: 1,
    verificationMethod: 'Photo and inspection',
    priority,
  },
});
const input = {
  audit,
  agentVersion: version,
  rulebook: { id: 'rb', version: '8' },
  rules: [rule],
  ruleChunks: [chunk],
};
describe('AuditAgentPipeline', () => {
  it('processes every page and validates findings', async () => {
    const p = new Provider([{ candidates: [] }, candidate, finding()]);
    const result = await new AuditAgentPipeline({
      provider: p,
      retriever,
      createId: () => 'f',
    }).run(input);
    expect(p.calls).toBe(3);
    expect(result.usage.costUsd).toBe(0.003);
    expect(result.findings).toHaveLength(1);
    expect(
      result.traces.filter((t) => t.stage === 'CANDIDATE_EXTRACTION' && t.outputSummary),
    ).toHaveLength(2);
  });
  it('rejects wrong-page citations', async () => {
    const result = await new AuditAgentPipeline({
      provider: new Provider([{ candidates: [] }, candidate, finding(1)]),
      retriever,
    }).run(input);
    expect(result.findings).toHaveLength(0);
    expect(result.rejectedFindings[0]?.code).toBe('INVALID_AUDIT_CITATION');
  });
  it('retries only transient errors', async () => {
    const p = new Provider(
      [undefined, { candidates: [] }, candidate, finding()],
      [new ModelProviderError('rate', 'TRANSIENT')],
    );
    await new AuditAgentPipeline({ provider: p, retriever }).run(input);
    expect(p.calls).toBe(4);
    const bad = new Provider([], [new ModelProviderError('auth', 'PERMANENT')]);
    await expect(new AuditAgentPipeline({ provider: bad, retriever }).run(input)).rejects.toThrow(
      'auth',
    );
    expect(bad.calls).toBe(1);
  });
  it('rejects mixed rulebook snapshots before model use', async () => {
    const p = new Provider([]);
    await expect(
      new AuditAgentPipeline({ provider: p, retriever }).run({
        ...input,
        rules: [{ ...rule, rulebookVersion: '7' }],
      }),
    ).rejects.toThrow('snapshot');
    expect(p.calls).toBe(0);
  });
});
