export interface PartyResult {
    partyCode: string; // Party A, Party B, Party C
    score: number;
}

export interface ResultSheet {
    id: string;
    pollingUnitId: string;
    pollingUnitName: string;
    ward: string;
    lga: string;
    imageUrl: string; // URL to EC8A
    digitalResults: PartyResult[];
    status: 'pending' | 'verified' | 'flagged' | 'rejected';
    uploadedAt: string;
    uploadedBy: string;
    flagReason?: string;
}

export const MOCK_RESULTS: ResultSheet[] = [
    {
        id: 'RES-001',
        pollingUnitId: 'PU-011-04-001',
        pollingUnitName: 'Kofar Gidan Mai Unguwa',
        ward: 'Bakori A',
        lga: 'Bakori',
        imageUrl: '/samples/ec8a-clean.png',
        digitalResults: [
            { partyCode: 'APC', score: 154 },
            { partyCode: 'PDP', score: 120 },
            { partyCode: 'LP', score: 85 },
            { partyCode: 'NNPP', score: 40 }
        ],
        status: 'pending',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        uploadedBy: 'PO: Aisha Bello'
    },
    {
        id: 'RES-002',
        pollingUnitId: 'PU-011-04-002',
        pollingUnitName: 'Primary School Bakori',
        ward: 'Bakori A',
        lga: 'Bakori',
        imageUrl: '/samples/ec8a-clean.png',
        digitalResults: [
            { partyCode: 'APC', score: 98 },
            { partyCode: 'PDP', score: 205 },
            { partyCode: 'LP', score: 4 },
            { partyCode: 'NNPP', score: 12 }
        ],
        status: 'verified',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        uploadedBy: 'PO: Musa Ibrahim'
    },
    {
        id: 'RES-003',
        pollingUnitId: 'PU-034-01-009',
        pollingUnitName: 'Kofar Fada',
        ward: 'Katsina Ward A',
        lga: 'Katsina',
        imageUrl: '/samples/ec8a-messy.png',
        digitalResults: [
            { partyCode: 'APC', score: 442 },
            { partyCode: 'PDP', score: 340 },
            { partyCode: 'LP', score: 216 },
            { partyCode: 'NNPP', score: 492 }
        ],
        status: 'flagged',
        flagReason: 'Discrepancy in total votes cast vs accredited voters',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        uploadedBy: 'PO: Sani Yusuf'
    }
];
