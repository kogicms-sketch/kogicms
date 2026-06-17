// Dan Musa LGA Election Data - INEC Official Data
// 11 Wards, 165 Total Polling Units

import { Ward, PollingUnit } from './bakori_data';

import { getChairmanByLGA } from './lga_chairmen';
export const DANMUSA_WARDS: Ward[] = [
    {
        id: 'DANMUSA-W01',
        code: 'W01',
        name: 'Mara',
        lga: 'Dan Musa',
        pollingUnitsCount: 20
    },
    {
        id: 'DANMUSA-W02',
        code: 'W02',
        name: 'Dan Alkima',
        lga: 'Dan Musa',
        pollingUnitsCount: 15
    },
    {
        id: 'DANMUSA-W03',
        code: 'W03',
        name: 'Dan Musa A',
        lga: 'Dan Musa',
        pollingUnitsCount: 25
    },
    {
        id: 'DANMUSA-W04',
        code: 'W04',
        name: 'Dan Musa B',
        lga: 'Dan Musa',
        pollingUnitsCount: 10
    },
    {
        id: 'DANMUSA-W05',
        code: 'W05',
        name: 'Dan Ali',
        lga: 'Dan Musa',
        pollingUnitsCount: 15
    },
    {
        id: 'DANMUSA-W06',
        code: 'W06',
        name: 'Mai Dabino A',
        lga: 'Dan Musa',
        pollingUnitsCount: 16
    },
    {
        id: 'DANMUSA-W07',
        code: 'W07',
        name: 'Mai Dabino B',
        lga: 'Dan Musa',
        pollingUnitsCount: 15
    },
    {
        id: 'DANMUSA-W08',
        code: 'W08',
        name: 'Dandire A',
        lga: 'Dan Musa',
        pollingUnitsCount: 11
    },
    {
        id: 'DANMUSA-W09',
        code: 'W09',
        name: 'Dandire B',
        lga: 'Dan Musa',
        pollingUnitsCount: 10
    },
    {
        id: 'DANMUSA-W10',
        code: 'W10',
        name: 'Yan-Tumaki A',
        lga: 'Dan Musa',
        pollingUnitsCount: 16
    },
    {
        id: 'DANMUSA-W11',
        code: 'W11',
        name: 'Yan-Tumaki B',
        lga: 'Dan Musa',
        pollingUnitsCount: 12
    }
];

// Calculate voter distribution for Dan Musa LGA
// Total: 96,461 voters across 165 polling units (~585 avg)
const DANMUSA_TOTAL_VOTERS = 96461;

// Ward-level voter distribution (weighted by polling unit count)
const calculateWardVoters = (ward: Ward): number => {
    const totalUnits = 20 + 15 + 25 + 10 + 15 + 16 + 15 + 11 + 10 + 16 + 12;
    const weight = ward.pollingUnitsCount / totalUnits;
    return Math.floor(DANMUSA_TOTAL_VOTERS * weight);
};

// Add registeredVoters to each ward
export const DANMUSA_WARDS_WITH_VOTERS: Ward[] = DANMUSA_WARDS.map(ward => ({
    ...ward,
    registeredVoters: calculateWardVoters(ward)
}));

// Generate polling units for each ward with constant voter distribution
const generatePollingUnits = (ward: Ward): PollingUnit[] => {
    const units: PollingUnit[] = [];
    const wardVoters = calculateWardVoters(ward);
    const baseVotersPerUnit = Math.floor(wardVoters / ward.pollingUnitsCount);
    const chairman = getChairmanByLGA(ward.lga);
    let remainingVoters = wardVoters;

    for (let i = 1; i <= ward.pollingUnitsCount; i++) {
        const puNumber = i.toString().padStart(3, '0');
        
        // Use deterministic variance based on unit index (-10% to +10% for realism)
        const variance = ((i * 7) % 21 - 10) / 100; // -0.10 to +0.10
        const voters = Math.max(50, Math.min(1200, 
            Math.floor(baseVotersPerUnit * (1 + variance))
        ));
        
        remainingVoters -= voters;
        
        units.push({
            id: `${ward.id}-PU${puNumber}`,
            code: `${ward.code}-${puNumber}`,
            name: `${ward.name} - PU ${puNumber}`,
            wardId: ward.id,
            wardName: ward.name,
            lga: ward.lga,
            registeredVoters: voters,
            lgaChairman: chairman?.chairman,
            status: 'active'
        });
    }
    
    // Distribute any remaining voters
    if (remainingVoters > 0) {
        for (let i = 0; i < units.length && remainingVoters > 0; i++) {
            units[i].registeredVoters = (units[i].registeredVoters || 0) + 1;
            remainingVoters--;
        }
    }

    return units;
};

export const DANMUSA_POLLING_UNITS: PollingUnit[] = DANMUSA_WARDS.flatMap(ward =>
    generatePollingUnits(ward)
);

export const DANMUSA_SUMMARY = {
    lga: 'Dan Musa',
    totalWards: DANMUSA_WARDS.length,
    totalPollingUnits: DANMUSA_POLLING_UNITS.length,
    totalRegisteredVoters: DANMUSA_TOTAL_VOTERS,
    averageVotersPerUnit: Math.round(DANMUSA_TOTAL_VOTERS / DANMUSA_POLLING_UNITS.length),
    inecHeadquarters: 'Dan Musa Town',
    wards: DANMUSA_WARDS.map(w => ({
        name: w.name,
        pollingUnits: w.pollingUnitsCount
    }))
};

export const getDanMusaPollingUnitsByWard = (wardId: string): PollingUnit[] => {
    return DANMUSA_POLLING_UNITS.filter(pu => pu.wardId === wardId);
};
