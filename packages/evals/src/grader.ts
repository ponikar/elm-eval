import {
  type AuditFinding,
  type EvalCase,
  EvalCaseSchema,
  type EvaluationAgentOutput,
  EvaluationAgentOutputSchema,
  type FailureType,
  FailureTypeSchema,
  type GraderResult,
  GraderResultSchema,
} from '@repo/domain';

export const DETERMINISTIC_GRADER_VERSION = 'deterministic-v1';

export interface GradeEvaluationCaseInput {
  evalCase: EvalCase;
  agentOutput: EvaluationAgentOutput | unknown;
  executionId: string;
  resultId: string;
  createdAt: string;
  graderVersion?: string;
}

interface Match {
  expectedIndex: number;
  actualIndex: number;
}

interface CandidateMatch extends Match {
  score: number;
}

interface FlowEdge {
  to: number;
  reverseIndex: number;
  capacity: number;
  cost: number;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsNormalized(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalize(needle);
  return normalizedNeedle.length > 0 && normalize(haystack).includes(normalizedNeedle);
}

function containsExpectedTerms(haystack: string, expected: string): boolean {
  const actualTerms = new Set(normalize(haystack).split(' ').filter(Boolean));
  const expectedTerms = normalize(expected).split(' ').filter(Boolean);
  return expectedTerms.length > 0 && expectedTerms.every((term) => actualTerms.has(term));
}

function findingText(finding: AuditFinding): string {
  return [
    finding.title,
    finding.description,
    finding.correctiveAction.action,
    finding.correctiveAction.ownerRole,
    finding.correctiveAction.verificationMethod,
  ].join(' ');
}

function citationIsSupported(evalCase: EvalCase, finding: AuditFinding): boolean {
  const page = evalCase.input.auditPages.find(
    ({ pageNumber }) => pageNumber === finding.auditEvidence.pageNumber,
  );
  return page !== undefined && containsNormalized(page.text, finding.auditEvidence.quote);
}

function expectedEvidenceMatches(
  expected: EvalCase['expected'][number],
  finding: AuditFinding,
): boolean {
  if (!expected.auditEvidence) return false;
  return (
    expected.auditEvidence.pageNumber === finding.auditEvidence.pageNumber &&
    containsExpectedTerms(finding.auditEvidence.quote, expected.auditEvidence.textContains)
  );
}

function candidateScore(expected: EvalCase['expected'][number], finding: AuditFinding): number {
  const evidenceMatches = expectedEvidenceMatches(expected, finding);
  const ruleMatches =
    expected.applicableRule !== undefined &&
    expected.applicableRule.ruleId === finding.applicableRule.ruleId;
  const categoryMatches = expected.category === finding.category;

  if (expected.auditEvidence || expected.applicableRule) {
    if (!evidenceMatches && !ruleMatches) return 0;
  } else if (expected.category && !categoryMatches) {
    return 0;
  }

  return (
    (evidenceMatches ? 8 : 0) +
    (ruleMatches ? 4 : 0) +
    (categoryMatches ? 2 : 0) +
    (expected.severity === finding.severity ? 1 : 0)
  );
}

function matchFindings(evalCase: EvalCase, findings: AuditFinding[]): Match[] {
  const expectedIndexes = evalCase.expected.flatMap((expected, index) =>
    expected.findingShouldExist ? [index] : [],
  );
  const candidates: CandidateMatch[] = [];
  for (const [expectedIndex, expected] of evalCase.expected.entries()) {
    if (!expected.findingShouldExist) continue;
    for (const [actualIndex, finding] of findings.entries()) {
      const score = candidateScore(expected, finding);
      if (score > 0) candidates.push({ expectedIndex, actualIndex, score });
    }
  }
  candidates.sort(
    (left, right) =>
      left.expectedIndex - right.expectedIndex ||
      left.actualIndex - right.actualIndex ||
      right.score - left.score,
  );

  const expectedNodeByIndex = new Map(
    expectedIndexes.map((expectedIndex, offset) => [expectedIndex, offset + 1]),
  );
  const actualOffset = expectedIndexes.length + 1;
  const sink = actualOffset + findings.length;
  const graph: FlowEdge[][] = Array.from({ length: sink + 1 }, () => []);

  function addEdge(from: number, to: number, capacity: number, cost: number): FlowEdge {
    const forward: FlowEdge = {
      to,
      reverseIndex: graph[to]?.length ?? 0,
      capacity,
      cost,
    };
    const reverse: FlowEdge = {
      to: from,
      reverseIndex: graph[from]?.length ?? 0,
      capacity: 0,
      cost: -cost,
    };
    graph[from]?.push(forward);
    graph[to]?.push(reverse);
    return forward;
  }

  for (const expectedIndex of expectedIndexes) {
    const node = expectedNodeByIndex.get(expectedIndex);
    if (node !== undefined) addEdge(0, node, 1, 0);
  }
  for (const actualIndex of findings.keys()) {
    addEdge(actualOffset + actualIndex, sink, 1, 0);
  }
  const candidateEdges = candidates.flatMap((candidate) => {
    const expectedNode = expectedNodeByIndex.get(candidate.expectedIndex);
    if (expectedNode === undefined) return [];
    return [
      {
        candidate,
        edge: addEdge(expectedNode, actualOffset + candidate.actualIndex, 1, -candidate.score),
      },
    ];
  });

  while (true) {
    const distances = Array<number>(graph.length).fill(Number.POSITIVE_INFINITY);
    const previousNodes = Array<number>(graph.length).fill(-1);
    const previousEdges = Array<number>(graph.length).fill(-1);
    distances[0] = 0;

    for (let iteration = 0; iteration < graph.length - 1; iteration += 1) {
      let changed = false;
      for (const [from, edges] of graph.entries()) {
        if (!Number.isFinite(distances[from])) continue;
        for (const [edgeIndex, edge] of edges.entries()) {
          const distance = (distances[from] ?? 0) + edge.cost;
          if (edge.capacity > 0 && distance < (distances[edge.to] ?? Number.POSITIVE_INFINITY)) {
            distances[edge.to] = distance;
            previousNodes[edge.to] = from;
            previousEdges[edge.to] = edgeIndex;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }

    if (previousNodes[sink] === -1) break;
    for (let node = sink; node !== 0; node = previousNodes[node] ?? 0) {
      const previousNode = previousNodes[node];
      const previousEdge = previousEdges[node];
      if (previousNode === undefined || previousNode < 0 || previousEdge === undefined) break;
      const edge = graph[previousNode]?.[previousEdge];
      if (!edge) break;
      edge.capacity -= 1;
      const reverse = graph[node]?.[edge.reverseIndex];
      if (reverse) reverse.capacity += 1;
    }
  }

  return candidateEdges
    .filter(({ edge }) => edge.capacity === 0)
    .map(({ candidate }) => ({
      expectedIndex: candidate.expectedIndex,
      actualIndex: candidate.actualIndex,
    }))
    .sort((left, right) => left.expectedIndex - right.expectedIndex);
}

function ratio(numerator: number, denominator: number, emptyValue: number): number {
  return denominator === 0 ? emptyValue : numerator / denominator;
}

function capContainsRequiredFacts(
  expected: EvalCase['expected'][number],
  finding: AuditFinding,
): boolean {
  const cap = [
    finding.correctiveAction.action,
    finding.correctiveAction.ownerRole,
    finding.correctiveAction.verificationMethod,
    finding.correctiveAction.priority,
    String(finding.correctiveAction.deadlineDays),
  ].join(' ');
  return (expected.requiredCorrectiveActionFacts ?? []).every((fact) =>
    containsNormalized(cap, fact),
  );
}

function addFailure(
  failures: Set<FailureType>,
  messages: string[],
  failure: FailureType,
  message: string,
): void {
  failures.add(failure);
  messages.push(message);
}

function duplicateFindingIndexes(findings: AuditFinding[]): Set<number> {
  const seen = new Map<string, number>();
  const duplicates = new Set<number>();
  for (const [index, finding] of findings.entries()) {
    const signature = [
      finding.applicableRule.ruleId,
      finding.auditEvidence.pageNumber,
      normalize(finding.auditEvidence.quote),
    ].join('|');
    if (seen.has(signature)) duplicates.add(index);
    else seen.set(signature, index);
  }
  return duplicates;
}

export function gradeEvaluationCase(input: GradeEvaluationCaseInput): GraderResult {
  const evalCase = EvalCaseSchema.parse(input.evalCase);
  const parsedOutput = EvaluationAgentOutputSchema.safeParse(input.agentOutput);
  const findings = parsedOutput.success ? parsedOutput.data.findings : [];
  const rejectedFindings = parsedOutput.success ? parsedOutput.data.rejectedFindings : [];
  const positiveExpected = evalCase.expected.filter(({ findingShouldExist }) => findingShouldExist);
  const criticalExpectedIndexes = new Set(
    evalCase.expected.flatMap((expected, index) =>
      expected.findingShouldExist &&
      (expected.severity === 'CRITICAL' ||
        (expected.severity === undefined && evalCase.criticality === 'CRITICAL'))
        ? [index]
        : [],
    ),
  );
  const matches = matchFindings(evalCase, findings);
  const matchedExpected = new Set(matches.map(({ expectedIndex }) => expectedIndex));
  const matchedActual = new Set(matches.map(({ actualIndex }) => actualIndex));
  const failures = new Set<FailureType>();
  const messages: string[] = [];

  if (!parsedOutput.success) {
    addFailure(failures, messages, 'SCHEMA_ERROR', 'Agent output did not match the output schema.');
  }
  for (const rejection of rejectedFindings) {
    const failureType = FailureTypeSchema.safeParse(rejection.code);
    addFailure(
      failures,
      messages,
      failureType.success ? failureType.data : 'PIPELINE_ERROR',
      `Agent pipeline rejected ${rejection.title ?? 'a finding'}: ${rejection.message}`,
    );
  }
  if (positiveExpected.length === 0 && rejectedFindings.length > 0) {
    addFailure(
      failures,
      messages,
      'FALSE_POSITIVE_FINDING',
      `${rejectedFindings.length} finding(s) were produced for a trusted negative case and rejected.`,
    );
  }

  for (const [index, expected] of evalCase.expected.entries()) {
    if (expected.findingShouldExist && !matchedExpected.has(index)) {
      addFailure(failures, messages, 'MISSED_FINDING', `Expected finding ${index} was not found.`);
    }
  }

  let correctCategoryCount = 0;
  let correctSeverityCount = 0;
  let criticalUnderclassificationCount = 0;
  let correctRuleReferenceCount = 0;
  let completeCorrectiveActionCount = 0;

  for (const { expectedIndex, actualIndex } of matches) {
    const expected = evalCase.expected[expectedIndex];
    const finding = findings[actualIndex];
    if (!expected || !finding) continue;

    if (expected.category === undefined || expected.category === finding.category) {
      correctCategoryCount += 1;
    } else {
      addFailure(
        failures,
        messages,
        'WRONG_CATEGORY',
        `Finding ${finding.id} has category ${finding.category}; expected ${expected.category}.`,
      );
    }

    if (expected.severity === undefined || expected.severity === finding.severity) {
      correctSeverityCount += 1;
    } else {
      addFailure(
        failures,
        messages,
        'WRONG_SEVERITY',
        `Finding ${finding.id} has severity ${finding.severity}; expected ${expected.severity}.`,
      );
      if (expected.severity === 'CRITICAL') {
        criticalUnderclassificationCount += 1;
        addFailure(
          failures,
          messages,
          'CRITICAL_UNDERCLASSIFICATION',
          `Finding ${finding.id} under-classifies a critical finding.`,
        );
      }
    }

    if (expected.auditEvidence && !expectedEvidenceMatches(expected, finding)) {
      addFailure(
        failures,
        messages,
        'INVALID_AUDIT_CITATION',
        `Finding ${finding.id} does not cite the expected audit evidence.`,
      );
    }

    if (
      expected.applicableRule === undefined ||
      (expected.applicableRule.ruleId === finding.applicableRule.ruleId &&
        expected.applicableRule.rulebookVersion === finding.applicableRule.rulebookVersion)
    ) {
      correctRuleReferenceCount += 1;
    } else {
      addFailure(
        failures,
        messages,
        'INVALID_RULE_REFERENCE',
        `Finding ${finding.id} has an incorrect rule reference.`,
      );
    }

    if (capContainsRequiredFacts(expected, finding)) {
      completeCorrectiveActionCount += 1;
    } else {
      addFailure(
        failures,
        messages,
        'INCOMPLETE_CAP',
        `Finding ${finding.id} corrective action is missing required facts.`,
      );
    }
  }

  const supportedCitationCount = findings.filter((finding) =>
    citationIsSupported(evalCase, finding),
  ).length;
  for (const finding of findings) {
    if (!citationIsSupported(evalCase, finding)) {
      addFailure(
        failures,
        messages,
        'INVALID_AUDIT_CITATION',
        `Finding ${finding.id} cites text not present on its audit page.`,
      );
    }
  }

  const duplicateIndexes = duplicateFindingIndexes(findings);
  if (duplicateIndexes.size > 0) {
    addFailure(
      failures,
      messages,
      'DUPLICATE_FINDING',
      `${duplicateIndexes.size} duplicate finding(s) were produced.`,
    );
  }

  const unsupportedActual = findings.filter((_, index) => !matchedActual.has(index));
  for (const finding of unsupportedActual) {
    addFailure(
      failures,
      messages,
      'FALSE_POSITIVE_FINDING',
      `Finding ${finding.id} does not match a trusted expected finding.`,
    );
  }

  const forbiddenClaimFindingIds = new Set<string>();
  const forbiddenClaims = evalCase.expected.flatMap(({ forbiddenClaims: claims }) => claims ?? []);
  for (const finding of findings) {
    if (forbiddenClaims.some((claim) => containsNormalized(findingText(finding), claim))) {
      forbiddenClaimFindingIds.add(finding.id);
      addFailure(
        failures,
        messages,
        'UNSUPPORTED_FINDING',
        `Finding ${finding.id} contains a forbidden claim.`,
      );
    }
  }

  const hallucinatedIndexes = new Set(
    findings.flatMap((finding, index) =>
      !matchedActual.has(index) || forbiddenClaimFindingIds.has(finding.id) ? [index] : [],
    ),
  );
  const expectedFindingCount = positiveExpected.length;
  const expectedCriticalFindingCount = criticalExpectedIndexes.size;
  const actualFindingCount = findings.length + rejectedFindings.length;
  const matchedFindingCount = matches.length;
  const matchedCriticalFindingCount = matches.filter(({ expectedIndex }) =>
    criticalExpectedIndexes.has(expectedIndex),
  ).length;
  const cleanNegative = expectedFindingCount === 0;

  const result: GraderResult = {
    id: input.resultId,
    executionId: input.executionId,
    graderVersion: input.graderVersion ?? DETERMINISTIC_GRADER_VERSION,
    passed: failures.size === 0,
    deterministicPassed: failures.size === 0,
    findingRecall: ratio(matchedFindingCount, expectedFindingCount, 1),
    criticalFindingRecall: ratio(matchedCriticalFindingCount, expectedCriticalFindingCount, 1),
    findingPrecision: ratio(matchedFindingCount, actualFindingCount, cleanNegative ? 1 : 0),
    categoryAccuracy: ratio(correctCategoryCount, matchedFindingCount, cleanNegative ? 1 : 0),
    severityAccuracy: ratio(correctSeverityCount, matchedFindingCount, cleanNegative ? 1 : 0),
    criticalUnderclassificationCount,
    auditCitationPrecision: ratio(
      supportedCitationCount,
      actualFindingCount,
      cleanNegative ? 1 : 0,
    ),
    ruleReferenceAccuracy: ratio(
      correctRuleReferenceCount,
      actualFindingCount,
      cleanNegative ? 1 : 0,
    ),
    hallucinatedFindingRate: ratio(
      hallucinatedIndexes.size + (cleanNegative ? rejectedFindings.length : 0),
      actualFindingCount,
      0,
    ),
    correctiveActionCompleteness: ratio(
      completeCorrectiveActionCount,
      matchedFindingCount,
      cleanNegative ? 1 : 0,
    ),
    schemaValidity: parsedOutput.success ? 1 : 0,
    failureTypes: [...failures],
    details: {
      counts: {
        expectedFindingCount,
        expectedCriticalFindingCount,
        actualFindingCount,
        matchedFindingCount,
        matchedCriticalFindingCount,
        correctCategoryCount,
        correctSeverityCount,
        criticalUnderclassificationCount,
        supportedCitationCount,
        correctRuleReferenceCount,
        completeCorrectiveActionCount,
        hallucinatedFindingCount:
          hallucinatedIndexes.size + (cleanNegative ? rejectedFindings.length : 0),
        schemaValidOutputCount: parsedOutput.success ? 1 : 0,
        outputCount: 1,
      },
      messages,
      matches: matches.flatMap(({ expectedIndex, actualIndex }) => {
        const finding = findings[actualIndex];
        return finding ? [{ expectedIndex, actualFindingId: finding.id }] : [];
      }),
    },
    createdAt: input.createdAt,
  };

  return GraderResultSchema.parse(result);
}
