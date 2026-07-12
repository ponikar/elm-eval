export const SEED_AUDIT = {
  id: 'audit-seed-001',
  supplierName: 'Shenzhen Golden Electronics Co.',
  factoryName: 'Golden Electronics Assembly Plant #3',
  auditStandard: 'RBA' as const,
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
      text: 'Section 4: Labor\n\n4.1 Working Hours\nThe facility operates two shifts: Day (07:00-19:00) and Night (19:00-07:00). Overtime records for August 2025 show 34 workers exceeded 60 hours per week in three of four weeks, which is beyond the RBA limit of 60 hours per week including overtime.\n\n4.2 Wages and Benefits\nMinimum wage compliance was verified against local regulations. However, wage records for 23 temporary workers were incomplete or unavailable for review during the audit. The HR manager indicated records were being digitized.\n\n4.3 Workers\u2019 Rights\nFreedom of association policy is posted in Mandarin and Vietnamese. No evidence of forced or child labor was identified.',
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

export const SEED_POLICY = {
  id: 'policy-001',
  name: 'RBA Code of Conduct v8.0',
  version: '8.0',
  sections: [
    {
      id: 'HS-3.5',
      title: 'Emergency Egress',
      content:
        'All emergency exits must remain unobstructed at all times. Exit pathways must maintain a minimum clear width of 80cm. Blocked emergency exits constitute a critical non-conformance due to immediate life-safety risk.',
    },
    {
      id: 'HS-3.4',
      title: 'Chemical Safety Documentation',
      content:
        'Safety Data Sheets must be current and accessible for all chemicals used on-site. Expired documents must be replaced within 30 days of expiration.',
    },
    {
      id: 'L-4.1',
      title: 'Working Hours',
      content:
        'Working hours including overtime must not exceed 60 hours per week. Overtime must be voluntary and compensated at legally required rates.',
    },
    {
      id: 'L-4.2',
      title: 'Wage Records',
      content:
        'Complete and accurate wage records must be maintained for all workers, including temporary and contract workers. Records must be available for audit review.',
    },
  ],
};
