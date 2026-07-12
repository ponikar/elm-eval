import type { QualityGateResult } from "@repo/domain";

export const QUALITY_GATES = {
  minimumCriticalFindingRecall: 0.95,
  minimumFindingPrecision: 0.9,
  minimumCitationPrecision: 0.98,
  minimumRuleReferenceAccuracy: 0.98,
  minimumSchemaValidity: 1.0,
  maximumCriticalRegressions: 0,
  maximumHallucinatedFindingRate: 0.02,
  minimumCapCompleteness: 0.95,
  maximumAverageExecutionCostUsd: 0.2,
  maximumP95PipelineLatencyMs: 20000,
} as const;

export type { QualityGateResult };

export function evaluateQualityGate(
  metrics: Record<string, number>,
): QualityGateResult {
  const failures: string[] = [];
  const get = (key: string): number => metrics[key] ?? 0;

  if (get("criticalFindingRecall") < QUALITY_GATES.minimumCriticalFindingRecall) {
    failures.push(
      `Critical finding recall ${get("criticalFindingRecall").toFixed(2)} below ${QUALITY_GATES.minimumCriticalFindingRecall}`,
    );
  }

  if (get("findingPrecision") < QUALITY_GATES.minimumFindingPrecision) {
    failures.push(
      `Finding precision ${get("findingPrecision").toFixed(2)} below ${QUALITY_GATES.minimumFindingPrecision}`,
    );
  }

  if (get("auditCitationPrecision") < QUALITY_GATES.minimumCitationPrecision) {
    failures.push(
      `Audit citation precision ${get("auditCitationPrecision").toFixed(2)} below ${QUALITY_GATES.minimumCitationPrecision}`,
    );
  }

  if (get("ruleReferenceAccuracy") < QUALITY_GATES.minimumRuleReferenceAccuracy) {
    failures.push(
      `Rule reference accuracy ${get("ruleReferenceAccuracy").toFixed(2)} below ${QUALITY_GATES.minimumRuleReferenceAccuracy}`,
    );
  }

  if (get("schemaValidity") < QUALITY_GATES.minimumSchemaValidity) {
    failures.push(
      `Schema validity ${get("schemaValidity").toFixed(2)} below ${QUALITY_GATES.minimumSchemaValidity}`,
    );
  }

  if (get("criticalRegressions") > QUALITY_GATES.maximumCriticalRegressions) {
    failures.push(
      `${get("criticalRegressions")} critical regressions exceed maximum of ${QUALITY_GATES.maximumCriticalRegressions}`,
    );
  }

  if (get("hallucinatedFindingRate") > QUALITY_GATES.maximumHallucinatedFindingRate) {
    failures.push(
      `Hallucinated finding rate ${get("hallucinatedFindingRate").toFixed(3)} exceeds ${QUALITY_GATES.maximumHallucinatedFindingRate}`,
    );
  }

  if (get("capCompleteness") < QUALITY_GATES.minimumCapCompleteness) {
    failures.push(
      `CAP completeness ${get("capCompleteness").toFixed(2)} below ${QUALITY_GATES.minimumCapCompleteness}`,
    );
  }

  return {
    passed: failures.length === 0,
    reasons: failures,
  };
}
