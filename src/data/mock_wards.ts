import { BAKORI_WARDS } from './bakori_data';

export interface WardStats {
    id: string;
    name: string;
    lga: string;
    registeredVoters: number;
    accreditedVoters: number;
    resultsUploaded: number; // percentage
    incidents: number;
    status: 'active' | 'completed' | 'issues';
}

// Convert Bakori INEC data to WardStats format
const bakoriWardStats: WardStats[] = BAKORI_WARDS.map((ward) => ({
    id: ward.id,
    name: ward.name,
    lga: ward.lga,
    registeredVoters: ward.registeredVoters || Math.floor(Math.random() * 3000) + 4000,
    accreditedVoters: Math.floor(Math.random() * 2000) + 1500,
    resultsUploaded: Math.floor(Math.random() * 40) + 60,
    incidents: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
    status: Math.random() > 0.8 ? 'completed' : Math.random() > 0.9 ? 'issues' : 'active'
}));

export const MOCK_WARD_DATA: Record<string, WardStats[]> = {
    'Bakori': bakoriWardStats,
    'Katsina': [
        { id: 'W-01', name: 'Katsina Ward A', lga: 'Katsina', registeredVoters: 12000, accreditedVoters: 5600, resultsUploaded: 45, incidents: 3, status: 'issues' },
        { id: 'W-02', name: 'Katsina Ward B', lga: 'Katsina', registeredVoters: 14500, accreditedVoters: 7800, resultsUploaded: 70, incidents: 1, status: 'active' },
        { id: 'W-03', name: 'Wakilin Gabas', lga: 'Katsina', registeredVoters: 9800, accreditedVoters: 4200, resultsUploaded: 95, incidents: 0, status: 'completed' }
    ],
    'Funtua': [
        { id: 'W-01', name: 'Funtua Central', lga: 'Funtua', registeredVoters: 8900, accreditedVoters: 4100, resultsUploaded: 88, incidents: 0, status: 'active' },
        { id: 'W-02', name: 'Dato', lga: 'Funtua', registeredVoters: 6700, accreditedVoters: 3200, resultsUploaded: 100, incidents: 0, status: 'completed' }
    ]
};

// Helper function to get random data for other LGAs
export const getLGAData = (lgaName: string): WardStats[] => {
    if (MOCK_WARD_DATA[lgaName]) return MOCK_WARD_DATA[lgaName];

    // Generate random wards for other LGAs
    return Array.from({ length: 5 }).map((_, i) => ({
        id: `W-0${i + 1}`,
        name: `${lgaName} Ward ${i + 1}`,
        lga: lgaName,
        registeredVoters: Math.floor(Math.random() * 5000) + 2000,
        accreditedVoters: Math.floor(Math.random() * 2000) + 1000,
        resultsUploaded: Math.floor(Math.random() * 100),
        incidents: Math.random() > 0.8 ? Math.floor(Math.random() * 2) : 0,
        status: Math.random() > 0.7 ? 'completed' : 'active'
    }));
};
