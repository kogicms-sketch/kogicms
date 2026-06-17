interface Incident {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  location: { lga: string; ward: string; pollingUnit: string };
  timestamp: string;
  reportedBy: string;
  evidenceUrl: string;
}

export const MOCK_INCIDENTS: Incident[] = [
    {
        id: 'INC-2025-001',
        title: 'Ballot Box Snatching Attempt',
        description: 'Group of unidentified individuals attempted to seize sensitive materials. Security personnel repelled the attack. Voting suspended temporarily.',
        severity: 'critical',
        status: 'investigating',
        location: { lga: 'Katsina', ward: 'Wakilin Gabas II', pollingUnit: 'PU 004 - Kofar Sauri' },
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        reportedBy: 'Presiding Officer',
        evidenceUrl: '/incidents/ballot_box.png'
    },
    {
        id: 'INC-2025-002',
        title: 'Late Arrival of Materials',
        description: 'Electoral officials arrived 2 hours late. Voters agitated but calm. Accreditation started at 10:30 AM.',
        severity: 'medium',
        status: 'new',
        location: { lga: 'Daura', ward: 'Sarkin Yara A', pollingUnit: 'PU 012 - Kofar Baru' },
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        reportedBy: 'Observer Team A',
        evidenceUrl: '/incidents/late_arrival.png'
    },
    {
        id: 'INC-2025-003',
        title: 'BVAS Device Malfunction',
        description: 'Device failing to capture fingerprints. Facial recognition slow. Tech support ticket raised #4421.',
        severity: 'high',
        status: 'escalated',
        location: { lga: 'Funtua', ward: 'Makera', pollingUnit: 'PU 008 - Govt Sec School' },
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        reportedBy: 'LGA Supervisor',
        evidenceUrl: '/incidents/bvas.png'
    },
    {
        id: 'INC-2025-004',
        title: 'Minor Skirmish / Argument',
        description: 'Argument between party agents regarding voter positioning. Resolved by police on ground.',
        severity: 'low',
        status: 'resolved',
        location: { lga: 'Malumfashi', ward: 'Galadima', pollingUnit: 'PU 001 - Township Stadium' },
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        reportedBy: 'Security Agent',
        evidenceUrl: '/incidents/argument.png'
    },
    {
        id: 'INC-2025-005',
        title: 'Vote Buying Allegation',
        description: 'Reports of money distribution near the perimeter. Evidence collected via mobile app.',
        severity: 'high',
        status: 'investigating',
        location: { lga: 'Kankia', ward: 'Rimaye', pollingUnit: 'PU 010' },
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        reportedBy: 'Anonymous Whistleblower',
        evidenceUrl: '/incidents/vote_buying.png'
    }
];
