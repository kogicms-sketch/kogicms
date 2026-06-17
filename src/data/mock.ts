interface KPI {
  totalPollingUnits: number;
  openPollingUnits: number;
  resultsCollated: number;
  totalIncidents: number;
  criticalIncidents: number;
}

interface Ward {
  id: string;
  name: string;
  pollingUnits: number;
  openPollingUnits: number;
  incidents: number;
  resultTransmission: number;
  status: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  location: string;
  wardId: string;
  severity: string;
  status: string;
  timestamp: string;
  reportedBy: string;
}

export const MOCK_KPIS: KPI = {
    totalPollingUnits: 258,
    openPollingUnits: 242,
    resultsCollated: 35,
    totalIncidents: 12,
    criticalIncidents: 3,
};

export const MOCK_WARDS: Ward[] = [
    { id: '1', name: 'Wakilin Kudu I', pollingUnits: 24, openPollingUnits: 24, incidents: 0, resultTransmission: 85, status: 'Active' },
    { id: '2', name: 'Wakilin Kudu II', pollingUnits: 22, openPollingUnits: 20, incidents: 1, resultTransmission: 60, status: 'Delayed' },
    { id: '3', name: 'Wakilin Arewa A', pollingUnits: 18, openPollingUnits: 18, incidents: 0, resultTransmission: 100, status: 'Active' },
    { id: '4', name: 'Wakilin Arewa B', pollingUnits: 20, openPollingUnits: 15, incidents: 4, resultTransmission: 15, status: 'Critical' },
    { id: '5', name: 'Shinkafi A', pollingUnits: 15, openPollingUnits: 15, incidents: 0, resultTransmission: 45, status: 'Active' },
    { id: '6', name: 'Shinkafi B', pollingUnits: 18, openPollingUnits: 18, incidents: 1, resultTransmission: 55, status: 'Active' },
    { id: '7', name: 'Modoji', pollingUnits: 25, openPollingUnits: 25, incidents: 0, resultTransmission: 20, status: 'Active' },
    { id: '8', name: 'Kangiwa', pollingUnits: 16, openPollingUnits: 14, incidents: 2, resultTransmission: 10, status: 'Delayed' },
];

export const MOCK_INCIDENTS: Incident[] = [
    {
        id: 'INC-001',
        title: 'Ballot Box Snatching Attempt',
        description: 'Thugs attempted to disrupt voting at PU 012. Security intervened.',
        location: 'Wakilin Arewa B / PU 012',
        wardId: '4',
        severity: 'Critical',
        status: 'Investigating',
        timestamp: '2025-12-14T09:15:00',
        reportedBy: 'Ward Agent',
    },
    {
        id: 'INC-002',
        title: 'BVAS Malfunction',
        description: 'Device unable to authenticate voters. Technical support requested.',
        location: 'Wakilin Kudu II / PU 005',
        wardId: '2',
        severity: 'Medium',
        status: 'New',
        timestamp: '2025-12-14T10:30:00',
        reportedBy: 'PO Aliyu',
    },
    {
        id: 'INC-003',
        title: 'Late Arrival of Materials',
        description: 'Materials arrived 2 hours late. Voting started 10:30.',
        location: 'Kangiwa / PU 003',
        wardId: '8',
        severity: 'Low',
        status: 'Resolved',
        timestamp: '2025-12-14T08:00:00',
        reportedBy: 'RO Usman',
    },
    {
        id: 'INC-004',
        title: 'Voter Intimidation',
        description: 'Group of youths blocking access to PU.',
        location: 'Wakilin Arewa B / PU 009',
        wardId: '4',
        severity: 'Critical',
        status: 'New',
        timestamp: '2025-12-14T11:45:00',
        reportedBy: 'Observer Team A',
    },
];
