import { ALL_WARDS } from './aggregated_lga_data';

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

export const getLGAData = (lgaName: string): WardStats[] => {
    const wards = ALL_WARDS.filter(w => w.lga.toLowerCase() === lgaName.toLowerCase());
    if (wards.length > 0) {
        return wards.map((ward, i) => ({
            id: ward.id,
            name: ward.name,
            lga: ward.lga,
            registeredVoters: ward.registeredVoters || 4500,
            accreditedVoters: Math.floor((ward.registeredVoters || 4500) * 0.65),
            resultsUploaded: Math.floor(Math.random() * 40) + 60,
            incidents: i % 4 === 0 ? 1 : 0,
            status: i % 5 === 0 ? 'issues' : i % 2 === 0 ? 'completed' : 'active'
        }));
    }

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
