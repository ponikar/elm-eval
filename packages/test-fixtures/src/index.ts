import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AgentVersion,
  AuditFinding,
  AuditStandard,
  ComplianceRule,
  EvalCase,
  FindingCategory,
  Rulebook,
  SupplierAudit,
} from '@repo/domain';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Audit ───────────────────────────────────────────────────────────────────

export const SEED_AUDIT: SupplierAudit = {
  id: 'audit-seed-001',
  supplierName: 'Shenzhen Golden Electronics Co.',
  factoryName: 'Golden Electronics Assembly Plant #3',
  auditStandard: 'RBA',
  auditDate: '2025-09-15',
  documentName: 'RBA Audit Report - Golden Electronics - Sep 2025',
  pages: [
    {
      pageNumber: 1,
      text: 'RBA VAP Audit Report\nSupplier: Shenzhen Golden Electronics Co.\nFactory: Golden Electronics Assembly Plant #3\nAudit Date: September 12-14, 2025\nAudit Standard: RBA Code of Conduct v8.0\nLead Auditor: Maria Santos\n\nExecutive Summary:\nThe audit covered labor, health and safety, environment, ethics, and management system modules. The facility employs 1,247 workers across three assembly lines producing consumer electronics components.\n\nOverall Score: 68% (Minor Non-conformances: 12, Major Non-conformances: 3, Critical: 1)',
    },
    {
      pageNumber: 2,
      text: 'Section 3: Health and Safety\n\n3.1 Emergency Preparedness\nThe facility maintains fire suppression systems and quarterly evacuation drills were documented.\n\n3.2 Safety Training\nNew hire safety orientation covers 8 of 12 required modules. Workers on Line 2 reported incomplete forklift certification.\n\n3.3 Personal Protective Equipment\nPPE distribution records are maintained. However, safety shoe compliance was observed at approximately 60% during the factory walkthrough.\n\n3.4 Chemical Safety\nSafety Data Sheets are posted in the chemical storage area. Two expired SDS were identified for cleaning solvents used on Line 1.',
    },
    {
      pageNumber: 3,
      text: 'Section 3: Health and Safety (continued)\n\n3.5 Emergency Exits\nPrimary emergency exits on the ground floor were unobstructed and clearly marked.\n\nHowever, during the September 13 afternoon inspection, the secondary emergency exit on the east side of Building B was found partially blocked by stacked cardboard cartons and finished goods pallets. The obstruction reduced the exit width to approximately 40cm, below the required minimum of 80cm.\n\nThe floor supervisor stated the materials had been placed there temporarily two days prior due to warehouse space constraints. No incident had been reported, but the blocked exit would prevent safe evacuation in an emergency.\n\nThis condition was photographed and documented.',
    },
    {
      pageNumber: 4,
      text: "Section 4: Labor\n\n4.1 Working Hours\nThe facility operates two shifts: Day (07:00-19:00) and Night (19:00-07:00). Overtime records for August 2025 show 34 workers exceeded 60 hours per week in three of four weeks, which is beyond the RBA limit of 60 hours per week including overtime.\n\n4.2 Wages and Benefits\nMinimum wage compliance was verified against local regulations. However, wage records for 23 temporary workers were incomplete or unavailable for review during the audit. The HR manager indicated records were being digitized.\n\n4.3 Workers' Rights\nFreedom of association policy is posted in Mandarin and Vietnamese. No evidence of forced or child labor was identified.",
    },
    {
      pageNumber: 5,
      text: 'Section 5: Environment\n\n5.1 Environmental Permits\nAll required environmental permits are current. Wastewater treatment facility was operating within permitted parameters.\n\n5.2 Hazardous Waste\nHazardous waste manifests are properly maintained. Disposal contractor certifications are on file and current.\n\n5.3 Air Emissions\nVOC emissions from the soldering operation are within permitted limits per the most recent stack test (June 2025).\n\n5.4 Energy and Water\nThe facility has implemented LED lighting upgrades and water recycling for cooling systems. No significant non-conformances noted.',
    },
    {
      pageNumber: 6,
      text: 'Section 6: Ethics\n\n6.1 Business Integrity\nNo evidence of corruption, bribery, or improper payments was identified.\n\n6.2 Privacy\nWorker personal information is stored in a locked filing system. Digital records are password-protected.\n\n6.3 Grievance Mechanisms\nA worker complaint hotline is posted, but records show only 2 complaints received in the past 12 months for a facility of 1,247 workers, which may indicate underutilization rather than absence of issues.\n\nSection 7: Management System\n\n7.1 The facility has a documented management system but has not achieved ISO 45001 or ISO 14001 certification. Internal audits are conducted semi-annually.',
    },
  ],
};

// ─── Rulebook ────────────────────────────────────────────────────────────────

export const SEED_RULEBOOK: Rulebook = {
  id: 'rulebook-001',
  name: 'RBA Code of Conduct v8.0',
  version: '8.0',
  standard: 'RBA',
  effectiveFrom: '2025-01-01',
  language: 'en',
  indexStatus: 'INDEXED',
};

export const SEED_RULES: ComplianceRule[] = [
  {
    id: 'HEALTH_SAFETY_EMERGENCY_EXIT',
    rulebookId: 'rulebook-001',
    rulebookVersion: '8.0',
    sectionId: 'HS-3.5',
    sectionTitle: 'Emergency Egress',
    category: 'HEALTH_AND_SAFETY',
    requirementText:
      'All emergency exits must remain unobstructed at all times. Exit pathways must maintain a minimum clear width of 80cm. Blocked emergency exits constitute a critical non-conformance due to immediate life-safety risk.',
    sourcePage: 12,
    severityGuidance: {
      defaultSeverity: 'CRITICAL',
      escalationConditions: ['workers cannot safely evacuate'],
    },
    correctiveActionGuidance: [
      'Remove obstruction immediately',
      'Implement recurring exit inspections',
    ],
  },
  {
    id: 'HEALTH_SAFETY_SAFETY_TRAINING',
    rulebookId: 'rulebook-001',
    rulebookVersion: '8.0',
    sectionId: 'HS-3.2',
    sectionTitle: 'Safety Training',
    category: 'HEALTH_AND_SAFETY',
    requirementText:
      'All workers must complete the full safety orientation program before beginning work. Specialized roles (forklift operators, crane operators) require current certification.',
    sourcePage: 9,
    severityGuidance: {
      defaultSeverity: 'MEDIUM',
      escalationConditions: ['operating heavy machinery without certification'],
    },
    correctiveActionGuidance: [
      'Complete outstanding training modules',
      'Verify certifications for all specialized roles',
    ],
  },
  {
    id: 'HEALTH_SAFETY_PPE',
    rulebookId: 'rulebook-001',
    rulebookVersion: '8.0',
    sectionId: 'HS-3.3',
    sectionTitle: 'Personal Protective Equipment',
    category: 'HEALTH_AND_SAFETY',
    requirementText:
      'Appropriate PPE must be provided to all workers and usage must be enforced. Compliance should be monitored during facility walkthroughs.',
    sourcePage: 10,
    severityGuidance: {
      defaultSeverity: 'MEDIUM',
    },
    correctiveActionGuidance: ['Increase PPE compliance monitoring', 'Replace worn or damaged PPE'],
  },
  {
    id: 'HEALTH_SAFETY_CHEMICAL_SAFETY',
    rulebookId: 'rulebook-001',
    rulebookVersion: '8.0',
    sectionId: 'HS-3.4',
    sectionTitle: 'Chemical Safety Documentation',
    category: 'HEALTH_AND_SAFETY',
    requirementText:
      'Safety Data Sheets must be current and accessible for all chemicals used on-site. Expired documents must be replaced within 30 days of expiration.',
    sourcePage: 11,
    severityGuidance: {
      defaultSeverity: 'HIGH',
      escalationConditions: ['expired SDS for hazardous chemicals'],
    },
    correctiveActionGuidance: [
      'Replace expired SDS within 30 days',
      'Implement SDS review schedule',
    ],
  },
  {
    id: 'LABOR_WORKING_HOURS',
    rulebookId: 'rulebook-001',
    rulebookVersion: '8.0',
    sectionId: 'L-4.1',
    sectionTitle: 'Working Hours',
    category: 'WORKING_HOURS',
    requirementText:
      'Working hours including overtime must not exceed 60 hours per week. Overtime must be voluntary and compensated at legally required rates.',
    sourcePage: 18,
    severityGuidance: {
      defaultSeverity: 'HIGH',
      escalationConditions: ['exceeding 60 hours for 3 or more weeks'],
    },
    correctiveActionGuidance: [
      'Reduce overtime to within limits',
      'Implement overtime tracking and alerts',
    ],
  },
  {
    id: 'LABOR_WAGE_RECORDS',
    rulebookId: 'rulebook-001',
    rulebookVersion: '8.0',
    sectionId: 'L-4.2',
    sectionTitle: 'Wage Records',
    category: 'WAGES_AND_BENEFITS',
    requirementText:
      'Complete and accurate wage records must be maintained for all workers, including temporary and contract workers. Records must be available for audit review.',
    sourcePage: 19,
    severityGuidance: {
      defaultSeverity: 'MEDIUM',
      escalationConditions: ['records unavailable for more than 10% of workers'],
    },
    correctiveActionGuidance: [
      'Digitize and complete all wage records',
      'Ensure records are audit-ready',
    ],
  },
  {
    id: 'ENVIRONMENT_PERMITS',
    rulebookId: 'rulebook-001',
    rulebookVersion: '8.0',
    sectionId: 'E-5.1',
    sectionTitle: 'Environmental Permits',
    category: 'ENVIRONMENT',
    requirementText:
      'All required environmental permits must be current and operations must remain within permitted parameters.',
    sourcePage: 24,
    severityGuidance: {
      defaultSeverity: 'CRITICAL',
    },
    correctiveActionGuidance: ['Renew expired permits immediately'],
  },
  {
    id: 'ETHICS_GRIEVANCE',
    rulebookId: 'rulebook-001',
    rulebookVersion: '8.0',
    sectionId: 'ETH-6.3',
    sectionTitle: 'Grievance Mechanisms',
    category: 'ETHICS',
    requirementText:
      'Workers must have access to effective grievance mechanisms. Low complaint volumes relative to workforce size should be investigated to determine whether the mechanism is accessible and trusted.',
    sourcePage: 30,
    severityGuidance: {
      defaultSeverity: 'LOW',
      escalationConditions: ['complaint rate below 1% of workforce'],
    },
    correctiveActionGuidance: [
      'Survey workers on grievance mechanism awareness',
      'Improve accessibility and trust',
    ],
  },
  {
    id: 'MGMT_SYSTEM_CERTIFICATION',
    rulebookId: 'rulebook-001',
    rulebookVersion: '8.0',
    sectionId: 'MS-7.1',
    sectionTitle: 'Management System',
    category: 'MANAGEMENT_SYSTEM',
    requirementText:
      'Facilities should maintain a documented management system and pursue relevant ISO certifications (ISO 45001, ISO 14001).',
    sourcePage: 34,
    severityGuidance: {
      defaultSeverity: 'LOW',
    },
    correctiveActionGuidance: [
      'Develop certification roadmap',
      'Conduct gap analysis against ISO standards',
    ],
  },
  {
    id: 'LABOR_FREEDOM_ASSOCIATION',
    rulebookId: 'rulebook-001',
    rulebookVersion: '8.0',
    sectionId: 'L-4.3',
    sectionTitle: "Workers' Rights",
    category: 'FORCED_LABOR',
    requirementText:
      'Workers must be free to associate, organize, and bargain collectively. No forced or child labor is permitted under any circumstances.',
    sourcePage: 20,
    severityGuidance: {
      defaultSeverity: 'CRITICAL',
    },
    correctiveActionGuidance: ['Immediate remediation of any forced labor findings'],
  },
];

// ─── Agent versions ──────────────────────────────────────────────────────────

export const SEED_AGENT_VERSIONS: AgentVersion[] = [
  {
    id: 'agent-v1',
    name: 'Gemini 2.5 Flash RBA baseline',
    model: 'gemini-2.5-flash',
    promptVersion: 'prompt-rba-v3',
    systemPrompt:
      'You are a supplier audit compliance officer. Analyze audit report pages against the RBA Code of Conduct. Extract findings with evidence, classify severity, and generate corrective actions.',
    temperature: 0.1,
    rulebookVersionId: 'rulebook-001',
    retrievalTopK: 5,
    extractionSchemaVersion: 'schema-v2',
    correctiveActionPromptVersion: 'cap-v1',
    timeoutMs: 30000,
    maxRetries: 2,
    createdAt: '2025-08-01T00:00:00Z',
    type: 'baseline',
  },
  {
    id: 'agent-v2',
    name: 'Gemini 2.5 Flash Lite RBA candidate',
    model: 'gemini-2.5-flash-lite',
    promptVersion: 'prompt-rba-v4',
    systemPrompt:
      'You are a supplier audit compliance officer. Analyze audit report pages against the RBA Code of Conduct. Extract findings with evidence, classify severity, and generate corrective actions. Be precise about rule citations.',
    temperature: 0.2,
    rulebookVersionId: 'rulebook-001',
    retrievalTopK: 8,
    extractionSchemaVersion: 'schema-v2',
    correctiveActionPromptVersion: 'cap-v2',
    timeoutMs: 25000,
    maxRetries: 3,
    createdAt: '2025-09-10T00:00:00Z',
    type: 'candidate',
  },
];

// ─── Findings (from agent v1 run) ───────────────────────────────────────────

export const MOCK_FINDINGS: AuditFinding[] = [
  {
    id: 'finding-001',
    auditId: 'audit-seed-001',
    agentVersionId: 'agent-v1',
    title: 'Emergency Exit B was obstructed',
    description:
      'The secondary emergency exit on the east side of Building B was partially blocked by stacked cardboard cartons and finished goods pallets, reducing exit width to approximately 40cm.',
    category: 'HEALTH_AND_SAFETY',
    severity: 'CRITICAL',
    auditEvidence: {
      pageNumber: 3,
      quote:
        'the secondary emergency exit on the east side of Building B was found partially blocked',
    },
    applicableRule: {
      ruleId: 'HEALTH_SAFETY_EMERGENCY_EXIT',
      rulebookVersion: '8.0',
    },
    confidence: 0.95,
    correctiveAction: {
      action: 'Remove the obstruction and introduce recurring exit inspections.',
      ownerRole: 'Facility safety manager',
      deadlineDays: 1,
      verificationMethod: 'Photographic evidence and follow-up inspection',
      priority: 'URGENT',
    },
    reviewStatus: 'PENDING',
  },
  {
    id: 'finding-002',
    auditId: 'audit-seed-001',
    agentVersionId: 'agent-v1',
    title: 'Incomplete forklift certification for Line 2 workers',
    description:
      'Workers on Line 2 reported incomplete forklift certification during safety training review.',
    category: 'HEALTH_AND_SAFETY',
    severity: 'MEDIUM',
    auditEvidence: {
      pageNumber: 2,
      quote: 'Workers on Line 2 reported incomplete forklift certification',
    },
    applicableRule: {
      ruleId: 'HEALTH_SAFETY_SAFETY_TRAINING',
      rulebookVersion: '8.0',
    },
    confidence: 0.82,
    correctiveAction: {
      action: 'Complete forklift certification for all affected workers within 30 days.',
      ownerRole: 'Safety training coordinator',
      deadlineDays: 30,
      verificationMethod: 'Training records and certification copies',
      priority: 'MEDIUM',
    },
    reviewStatus: 'PENDING',
  },
  {
    id: 'finding-003',
    auditId: 'audit-seed-001',
    agentVersionId: 'agent-v1',
    title: 'Safety shoe compliance at 60%',
    description:
      'Safety shoe compliance was observed at approximately 60% during the factory walkthrough, below acceptable levels.',
    category: 'HEALTH_AND_SAFETY',
    severity: 'MEDIUM',
    auditEvidence: {
      pageNumber: 2,
      quote: 'safety shoe compliance was observed at approximately 60%',
    },
    applicableRule: {
      ruleId: 'HEALTH_SAFETY_PPE',
      rulebookVersion: '8.0',
    },
    confidence: 0.88,
    correctiveAction: {
      action: 'Increase PPE compliance monitoring and replace worn safety shoes.',
      ownerRole: 'Safety officer',
      deadlineDays: 14,
      verificationMethod: 'Compliance audit and PPE distribution records',
      priority: 'MEDIUM',
    },
    reviewStatus: 'PENDING',
  },
  {
    id: 'finding-004',
    auditId: 'audit-seed-001',
    agentVersionId: 'agent-v1',
    title: 'Expired Safety Data Sheets for cleaning solvents',
    description:
      'Two expired SDS were identified for cleaning solvents used on Line 1, beyond the 30-day replacement window.',
    category: 'HEALTH_AND_SAFETY',
    severity: 'HIGH',
    auditEvidence: {
      pageNumber: 2,
      quote: 'Two expired SDS were identified for cleaning solvents used on Line 1',
    },
    applicableRule: {
      ruleId: 'HEALTH_SAFETY_CHEMICAL_SAFETY',
      rulebookVersion: '8.0',
    },
    confidence: 0.91,
    correctiveAction: {
      action: 'Replace expired SDS within 30 days and implement quarterly SDS review schedule.',
      ownerRole: 'Chemical safety coordinator',
      deadlineDays: 30,
      verificationMethod: 'Updated SDS documents and review schedule',
      priority: 'HIGH',
    },
    reviewStatus: 'PENDING',
  },
  {
    id: 'finding-005',
    auditId: 'audit-seed-001',
    agentVersionId: 'agent-v1',
    title: '34 workers exceeded 60 hours per week',
    description:
      'Overtime records for August 2025 show 34 workers exceeded 60 hours per week in three of four weeks.',
    category: 'WORKING_HOURS',
    severity: 'HIGH',
    auditEvidence: {
      pageNumber: 4,
      quote: '34 workers exceeded 60 hours per week in three of four weeks',
    },
    applicableRule: {
      ruleId: 'LABOR_WORKING_HOURS',
      rulebookVersion: '8.0',
    },
    confidence: 0.94,
    correctiveAction: {
      action: 'Reduce overtime to within RBA limits and implement weekly overtime tracking alerts.',
      ownerRole: 'HR manager',
      deadlineDays: 14,
      verificationMethod: 'Updated overtime records and tracking system',
      priority: 'HIGH',
    },
    reviewStatus: 'PENDING',
  },
  {
    id: 'finding-006',
    auditId: 'audit-seed-001',
    agentVersionId: 'agent-v1',
    title: 'Incomplete wage records for 23 temporary workers',
    description:
      'Wage records for 23 temporary workers were incomplete or unavailable for review during the audit.',
    category: 'WAGES_AND_BENEFITS',
    severity: 'MEDIUM',
    auditEvidence: {
      pageNumber: 4,
      quote: 'wage records for 23 temporary workers were incomplete or unavailable',
    },
    applicableRule: {
      ruleId: 'LABOR_WAGE_RECORDS',
      rulebookVersion: '8.0',
    },
    confidence: 0.87,
    correctiveAction: {
      action: 'Digitize and complete all temporary worker wage records.',
      ownerRole: 'HR records manager',
      deadlineDays: 30,
      verificationMethod: 'Complete digital wage records available for review',
      priority: 'MEDIUM',
    },
    reviewStatus: 'PENDING',
  },
];

// ─── Eval cases ──────────────────────────────────────────────────────────────

export const SEED_EVAL_CASES: EvalCase[] = [
  {
    id: 'eval-001',
    name: 'Blocked emergency exit',
    category: 'HEALTH_AND_SAFETY',
    criticality: 'CRITICAL',
    input: {
      auditPages: SEED_AUDIT.pages.slice(2, 3),
      rulebookVersionId: 'rulebook-001',
    },
    expected: [
      {
        findingShouldExist: true,
        category: 'HEALTH_AND_SAFETY',
        severity: 'CRITICAL',
        auditEvidence: { pageNumber: 3, textContains: 'Emergency Exit B' },
        applicableRule: {
          ruleId: 'HEALTH_SAFETY_EMERGENCY_EXIT',
          rulebookVersion: '8.0',
        },
        requiredCorrectiveActionFacts: ['remove obstruction', 'inspect emergency exits'],
      },
    ],
    source: 'HUMAN_CREATED',
    status: 'TRUSTED',
  },
  {
    id: 'eval-002',
    name: 'Incomplete safety training',
    category: 'HEALTH_AND_SAFETY',
    criticality: 'NORMAL',
    input: {
      auditPages: SEED_AUDIT.pages.slice(1, 2),
      rulebookVersionId: 'rulebook-001',
    },
    expected: [
      {
        findingShouldExist: true,
        category: 'HEALTH_AND_SAFETY',
        severity: 'MEDIUM',
        auditEvidence: { pageNumber: 2, textContains: 'forklift certification' },
        applicableRule: {
          ruleId: 'HEALTH_SAFETY_SAFETY_TRAINING',
          rulebookVersion: '8.0',
        },
        requiredCorrectiveActionFacts: ['complete certification'],
      },
    ],
    source: 'HUMAN_CREATED',
    status: 'TRUSTED',
  },
  {
    id: 'eval-003',
    name: 'Expired SDS for cleaning solvents',
    category: 'HEALTH_AND_SAFETY',
    criticality: 'NORMAL',
    input: {
      auditPages: SEED_AUDIT.pages.slice(1, 2),
      rulebookVersionId: 'rulebook-001',
    },
    expected: [
      {
        findingShouldExist: true,
        category: 'HEALTH_AND_SAFETY',
        severity: 'HIGH',
        auditEvidence: { pageNumber: 2, textContains: 'expired SDS' },
        applicableRule: {
          ruleId: 'HEALTH_SAFETY_CHEMICAL_SAFETY',
          rulebookVersion: '8.0',
        },
        requiredCorrectiveActionFacts: ['replace expired SDS', 'implement review schedule'],
      },
    ],
    source: 'HUMAN_CREATED',
    status: 'TRUSTED',
  },
  {
    id: 'eval-004',
    name: 'Working hours exceeded 60hr/week',
    category: 'WORKING_HOURS',
    criticality: 'NORMAL',
    input: {
      auditPages: SEED_AUDIT.pages.slice(3, 4),
      rulebookVersionId: 'rulebook-001',
    },
    expected: [
      {
        findingShouldExist: true,
        category: 'WORKING_HOURS',
        severity: 'HIGH',
        auditEvidence: { pageNumber: 4, textContains: '60 hours per week' },
        applicableRule: {
          ruleId: 'LABOR_WORKING_HOURS',
          rulebookVersion: '8.0',
        },
        requiredCorrectiveActionFacts: ['reduce overtime', 'implement tracking'],
      },
    ],
    source: 'HUMAN_CREATED',
    status: 'TRUSTED',
  },
  {
    id: 'eval-005',
    name: 'Incomplete wage records for temp workers',
    category: 'WAGES_AND_BENEFITS',
    criticality: 'NORMAL',
    input: {
      auditPages: SEED_AUDIT.pages.slice(3, 4),
      rulebookVersionId: 'rulebook-001',
    },
    expected: [
      {
        findingShouldExist: true,
        category: 'WAGES_AND_BENEFITS',
        severity: 'MEDIUM',
        auditEvidence: { pageNumber: 4, textContains: 'wage records' },
        applicableRule: {
          ruleId: 'LABOR_WAGE_RECORDS',
          rulebookVersion: '8.0',
        },
        requiredCorrectiveActionFacts: [
          'digitize wage records',
          'complete records for all workers',
        ],
      },
    ],
    source: 'HUMAN_CREATED',
    status: 'TRUSTED',
  },
  {
    id: 'eval-006',
    name: 'No false positive on environment section',
    category: 'ENVIRONMENT',
    criticality: 'NORMAL',
    input: {
      auditPages: SEED_AUDIT.pages.slice(4, 5),
      rulebookVersionId: 'rulebook-001',
    },
    expected: [
      {
        findingShouldExist: false,
        forbiddenClaims: ['environmental violation', 'permit violation'],
      },
    ],
    source: 'HUMAN_CREATED',
    status: 'TRUSTED',
  },
  {
    id: 'eval-007',
    name: 'Grievance mechanism underutilization',
    category: 'ETHICS',
    criticality: 'NORMAL',
    input: {
      auditPages: SEED_AUDIT.pages.slice(5, 6),
      rulebookVersionId: 'rulebook-001',
    },
    expected: [
      {
        findingShouldExist: true,
        category: 'ETHICS',
        severity: 'LOW',
        auditEvidence: { pageNumber: 6, textContains: '2 complaints received' },
        applicableRule: {
          ruleId: 'ETHICS_GRIEVANCE',
          rulebookVersion: '8.0',
        },
        requiredCorrectiveActionFacts: ['survey workers', 'improve accessibility'],
      },
    ],
    source: 'HUMAN_CREATED',
    status: 'TRUSTED',
  },
  {
    id: 'eval-008',
    name: 'No ISO certification',
    category: 'MANAGEMENT_SYSTEM',
    criticality: 'NORMAL',
    input: {
      auditPages: SEED_AUDIT.pages.slice(5, 6),
      rulebookVersionId: 'rulebook-001',
    },
    expected: [
      {
        findingShouldExist: true,
        category: 'MANAGEMENT_SYSTEM',
        severity: 'LOW',
        auditEvidence: { pageNumber: 6, textContains: 'ISO' },
        applicableRule: {
          ruleId: 'MGMT_SYSTEM_CERTIFICATION',
          rulebookVersion: '8.0',
        },
        requiredCorrectiveActionFacts: ['certification roadmap', 'gap analysis'],
      },
    ],
    source: 'HUMAN_CREATED',
    status: 'TRUSTED',
  },
  {
    id: 'eval-009',
    name: 'PPE compliance gap (generated variation)',
    category: 'HEALTH_AND_SAFETY',
    criticality: 'NORMAL',
    input: {
      auditPages: SEED_AUDIT.pages.slice(1, 2),
      rulebookVersionId: 'rulebook-001',
    },
    expected: [
      {
        findingShouldExist: true,
        category: 'HEALTH_AND_SAFETY',
        severity: 'MEDIUM',
        auditEvidence: { pageNumber: 2, textContains: '60%' },
        applicableRule: {
          ruleId: 'HEALTH_SAFETY_PPE',
          rulebookVersion: '8.0',
        },
        requiredCorrectiveActionFacts: ['increase monitoring', 'replace PPE'],
      },
    ],
    source: 'GENERATED_APPROVED',
    status: 'TRUSTED',
  },
  {
    id: 'eval-010',
    name: 'Spelling mistake variation (generated)',
    category: 'HEALTH_AND_SAFETY',
    criticality: 'NORMAL',
    input: {
      auditPages: [
        {
          pageNumber: 3,
          text: 'Section 3: Health and Safety (continued)\n\n3.5 Emergency Exits\nDuring the inspekshun, the secondary emergency exit on the east side of Building B was found partially blocked by stacked cardboard cartons. The obstruktion reduced the exit width to approximately 40cm.',
        },
      ],
      rulebookVersionId: 'rulebook-001',
    },
    expected: [
      {
        findingShouldExist: true,
        category: 'HEALTH_AND_SAFETY',
        severity: 'CRITICAL',
        auditEvidence: { pageNumber: 3, textContains: 'emergency exit' },
        applicableRule: {
          ruleId: 'HEALTH_SAFETY_EMERGENCY_EXIT',
          rulebookVersion: '8.0',
        },
        requiredCorrectiveActionFacts: ['remove obstruction'],
      },
    ],
    source: 'GENERATED_APPROVED',
    status: 'PENDING_REVIEW',
  },
];

// ─── Fixture loaders ─────────────────────────────────────────────────────────

async function loadFixture<T>(relativePath: string): Promise<T> {
  const fullPath = path.resolve(__dirname, relativePath);
  const raw = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(raw) as T;
}

export async function loadAuditFixture(id: string): Promise<SupplierAudit> {
  return loadFixture<SupplierAudit>(`./audits/${id}.json`);
}

export async function loadRulebookFixture(id: string): Promise<ComplianceRule[]> {
  return loadFixture<ComplianceRule[]>(`./rulebooks/${id}.json`);
}

export const AUDIT_FIXTURE_IDS = ['audit-001', 'audit-002', 'audit-003'] as const;
export const RULEBOOK_FIXTURE_IDS = ['rba-v8.0', 'nike-coc-2025'] as const;

export interface FixtureRulebookMeta {
  name: string;
  version: string;
  standard: AuditStandard;
}

export const RULEBOOK_METADATA: Record<string, FixtureRulebookMeta> = {
  'rba-v8.0': {
    name: 'RBA Code of Conduct v8.0',
    version: '8.0',
    standard: 'RBA',
  },
  'nike-coc-2025': {
    name: 'Nike Facility Code of Conduct 2025',
    version: '2025',
    standard: 'CUSTOM',
  },
};
