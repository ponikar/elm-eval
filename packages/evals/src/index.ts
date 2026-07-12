export const QUALITY_GATES = {
  minimumCriticalFindingRecall: 0.95,
  minimumFindingPrecision: 0.9,
  minimumCitationPrecision: 0.98,
  minimumSchemaValidity: 1.0,
  maximumCriticalRegressions: 0,
  maximumHallucinatedFindingRate: 0.02,
  minimumCapCompleteness: 0.95,
  maximumAverageExecutionCostUsd: 0.2,
  maximumP95PipelineLatencyMs: 20000,
} as const;

export interface QualityGateResult {
  passed: boolean;
  failures: string[];
}
