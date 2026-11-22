import { KOGI_LGAS } from './lgas';

export interface LGAChairman {
    lga: string;
    chairman: string;
    party: string;
    electionDate: string;
    swornInDate: string;
    fullTitle?: string;
}

export const KOGI_LGA_CHAIRMEN: LGAChairman[] = KOGI_LGAS.map(lga => ({
    lga,
    chairman: `Executive Chairman (${lga})`,
    party: 'APC',
    electionDate: '2024-10-19',
    swornInDate: '2024-10-21',
    fullTitle: `Hon. Chairman, ${lga} LGA`
}));

// Backwards compatibility alias
export const KATSINA_LGA_CHAIRMEN = KOGI_LGA_CHAIRMEN;

export const getChairmanByLGA = (lgaName: string): LGAChairman | undefined => {
    return KOGI_LGA_CHAIRMEN.find(
        (c) => c.lga.toLowerCase().replace(/[^a-z]/g, '') === lgaName.toLowerCase().replace(/[^a-z]/g, '')
    );
};

export const getAllChairmen = (): LGAChairman[] => {
    return KOGI_LGA_CHAIRMEN;
};

export const CHAIRMEN_SUMMARY = {
    totalLGAs: KOGI_LGA_CHAIRMEN.length,
    party: 'APC',
    electionDate: 'October 19, 2024',
    swornInDate: 'October 21, 2024',
    electionAuthority: 'KOSIEC (Kogi State Independent Electoral Commission)',
    chairman: 'KOSIEC Chairman'
};
