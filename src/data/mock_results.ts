export interface DigitalResult {
    partyCode: string;
    score: number;
}

export interface ResultSheet {
    id: string;
    pollingUnitId: string;
    pollingUnitName: string;
    ward: string;
    lga: string;
    imageUrl: string;
    digitalResults: DigitalResult[];
    status: 'pending' | 'verified' | 'flagged';
    uploadedAt: string;
    uploadedBy: string;
    flagReason?: string;
}

export const MOCK_RESULTS: ResultSheet[] = [
    {
        id: 'RES-001',
        pollingUnitId: '22-01-01-001',
        pollingUnitName: 'LGEA Primary School, Kuroko',
        ward: 'Kuroko I',
        lga: 'Adavi',
        imageUrl: '/samples/ec8a-clean.png',
        digitalResults: [
            { partyCode: 'APM', score: 254 },
            { partyCode: 'APC', score: 120 },
            { partyCode: 'PDP', score: 85 },
            { partyCode: 'LP', score: 40 }
        ],
        status: 'pending',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        uploadedBy: 'PO: Aisha Bello'
    },
    {
        id: 'RES-002',
        pollingUnitId: '22-17-01-002',
        pollingUnitName: 'Community Centre, Okene Central',
        ward: 'Okene Central',
        lga: 'Okene',
        imageUrl: '/samples/ec8a-clean.png',
        digitalResults: [
            { partyCode: 'APM', score: 310 },
            { partyCode: 'APC', score: 145 },
            { partyCode: 'PDP', score: 62 },
            { partyCode: 'LP', score: 18 }
        ],
        status: 'verified',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        uploadedBy: 'PO: Ibrahim Musa'
    },
    {
        id: 'RES-003',
        pollingUnitId: '22-12-01-003',
        pollingUnitName: 'Crowther Memorial School Ground',
        ward: 'Lokoja A',
        lga: 'Lokoja',
        imageUrl: '/samples/ec8a-messy.png',
        digitalResults: [
            { partyCode: 'APM', score: 442 },
            { partyCode: 'APC', score: 340 },
            { partyCode: 'PDP', score: 216 },
            { partyCode: 'LP', score: 92 }
        ],
        status: 'flagged',
        flagReason: 'Discrepancy in total votes cast vs accredited voters',
        uploadedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        uploadedBy: 'PO: David Yusuf'
    }
];
