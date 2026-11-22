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
        description: 'Group of unidentified individuals attempted to seize sensitive materials. Security personnel repelled the attack. Voting resumed peacefully.',
        severity: 'critical',
        status: 'investigating',
        location: { lga: 'Lokoja', ward: 'Lokoja A', pollingUnit: 'PU 004 - Near Maigari Palace' },
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
        location: { lga: 'Okene', ward: 'Okene Central', pollingUnit: 'PU 012 - Community Centre' },
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
        location: { lga: 'Ankpa', ward: 'Ankpa I', pollingUnit: 'PU 008 - Demonstration Sec School' },
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
        location: { lga: 'Kabba/Bunu', ward: 'Kabba Central', pollingUnit: 'PU 001 - Township Hall' },
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        reportedBy: 'Security Agent',
        evidenceUrl: '/incidents/argument.png'
    },
    {
        id: 'INC-2025-005',
        title: 'Vote Buying Allegation',
        description: 'Reports of unauthorized activity near the perimeter. Evidence collected via mobile app.',
        severity: 'high',
        status: 'investigating',
        location: { lga: 'Adavi', ward: 'Kuroko I', pollingUnit: 'PU 010 - LGEA Primary School' },
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        reportedBy: 'Anonymous Whistleblower',
        evidenceUrl: '/incidents/vote_buying.png'
    }
];
