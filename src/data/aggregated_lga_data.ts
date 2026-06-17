import { BAKORI_WARDS, BAKORI_POLLING_UNITS, BAKORI_SUMMARY } from './bakori_data';
import { KATSINA_LGAS } from './lgas';
export { KATSINA_LGAS };
import { BATAGARAWA_WARDS, BATAGARAWA_POLLING_UNITS, BATAGARAWA_SUMMARY } from './batagarawa_data';
import { BATSARI_WARDS, BATSARI_POLLING_UNITS, BATSARI_SUMMARY } from './batsari_data';
import { BAURE_WARDS, BAURE_POLLING_UNITS, BAURE_SUMMARY } from './baure_data';
import { BINDAWA_WARDS, BINDAWA_POLLING_UNITS, BINDAWA_SUMMARY } from './bindawa_data';
import { CHARANCHI_WARDS, CHARANCHI_POLLING_UNITS, CHARANCHI_SUMMARY } from './charanchi_data';
import { DANDUME_WARDS, DANDUME_POLLING_UNITS, DANDUME_SUMMARY } from './dandume_data';
import { DANJA_WARDS, DANJA_POLLING_UNITS, DANJA_SUMMARY } from './danja_data';
import { DANMUSA_WARDS, DANMUSA_POLLING_UNITS, DANMUSA_SUMMARY } from './danmusa_data';
import { DAURA_WARDS, DAURA_POLLING_UNITS, DAURA_SUMMARY } from './daura_data';
import { DUTSI_WARDS, DUTSI_POLLING_UNITS, DUTSI_SUMMARY } from './dutsi_data';
import { DUTSINMA_WARDS, DUTSINMA_POLLING_UNITS, DUTSINMA_SUMMARY } from './dutsinma_data';
import { FASKARI_WARDS, FASKARI_POLLING_UNITS, FASKARI_SUMMARY } from './faskari_data';
import { FUNTUA_WARDS, FUNTUA_POLLING_UNITS, FUNTUA_SUMMARY } from './funtua_data';
import { INGAWA_WARDS, INGAWA_POLLING_UNITS, INGAWA_SUMMARY } from './ingawa_data';
import { JIBIA_WARDS, JIBIA_POLLING_UNITS, JIBIA_SUMMARY } from './jibia_data';
import { KAFUR_WARDS, KAFUR_POLLING_UNITS, KAFUR_SUMMARY } from './kafur_data';
import { KAITA_WARDS, KAITA_POLLING_UNITS, KAITA_SUMMARY } from './kaita_data';
import { KANKARA_WARDS, KANKARA_POLLING_UNITS, KANKARA_SUMMARY } from './kankara_data';
import { KANKIA_WARDS, KANKIA_POLLING_UNITS, KANKIA_SUMMARY } from './kankia_data';
import { KATSINA_WARDS, KATSINA_POLLING_UNITS, KATSINA_SUMMARY } from './katsina_data';
import { KURFI_WARDS, KURFI_POLLING_UNITS, KURFI_SUMMARY } from './kurfi_data';
import { KUSADA_WARDS, KUSADA_POLLING_UNITS, KUSADA_SUMMARY } from './kusada_data';
import { MAIADUA_WARDS, MAIADUA_POLLING_UNITS, MAIADUA_SUMMARY } from './maiadua_data';
import { MALUMFASHI_WARDS, MALUMFASHI_POLLING_UNITS, MALUMFASHI_SUMMARY } from './malumfashi_data';
import { MANI_WARDS, MANI_POLLING_UNITS, MANI_SUMMARY } from './mani_data';
import { MASHI_WARDS, MASHI_POLLING_UNITS, MASHI_SUMMARY } from './mashi_data';
import { MATAZU_WARDS, MATAZU_POLLING_UNITS, MATAZU_SUMMARY } from './matazu_data';
import { MUSAWA_WARDS, MUSAWA_POLLING_UNITS, MUSAWA_SUMMARY } from './musawa_data';
import { RIMI_WARDS, RIMI_POLLING_UNITS, RIMI_SUMMARY } from './rimi_data';
import { SABUWA_WARDS, SABUWA_POLLING_UNITS, SABUWA_SUMMARY } from './sabuwa_data';
import { SAFANA_WARDS, SAFANA_POLLING_UNITS, SAFANA_SUMMARY } from './safana_data';
import { SANDAMU_WARDS, SANDAMU_POLLING_UNITS, SANDAMU_SUMMARY } from './sandamu_data';
import { ZANGO_WARDS, ZANGO_POLLING_UNITS, ZANGO_SUMMARY } from './zango_data';

export const ALL_WARDS = [
    ...BAKORI_WARDS, ...BATAGARAWA_WARDS, ...BATSARI_WARDS, ...BAURE_WARDS, ...BINDAWA_WARDS,
    ...CHARANCHI_WARDS, ...DANDUME_WARDS, ...DANJA_WARDS, ...DANMUSA_WARDS, ...DAURA_WARDS,
    ...DUTSI_WARDS, ...DUTSINMA_WARDS, ...FASKARI_WARDS, ...FUNTUA_WARDS, ...INGAWA_WARDS,
    ...JIBIA_WARDS, ...KAFUR_WARDS, ...KAITA_WARDS, ...KANKARA_WARDS, ...KANKIA_WARDS,
    ...KATSINA_WARDS, ...KURFI_WARDS, ...KUSADA_WARDS, ...MAIADUA_WARDS, ...MALUMFASHI_WARDS,
    ...MANI_WARDS, ...MASHI_WARDS, ...MATAZU_WARDS, ...MUSAWA_WARDS, ...RIMI_WARDS,
    ...SABUWA_WARDS, ...SAFANA_WARDS, ...SANDAMU_WARDS, ...ZANGO_WARDS
];

export const ALL_POLLING_UNITS = [
    ...BAKORI_POLLING_UNITS, ...BATAGARAWA_POLLING_UNITS, ...BATSARI_POLLING_UNITS, ...BAURE_POLLING_UNITS, ...BINDAWA_POLLING_UNITS,
    ...CHARANCHI_POLLING_UNITS, ...DANDUME_POLLING_UNITS, ...DANJA_POLLING_UNITS, ...DANMUSA_POLLING_UNITS, ...DAURA_POLLING_UNITS,
    ...DUTSI_POLLING_UNITS, ...DUTSINMA_POLLING_UNITS, ...FASKARI_POLLING_UNITS, ...FUNTUA_POLLING_UNITS, ...INGAWA_POLLING_UNITS,
    ...JIBIA_POLLING_UNITS, ...KAFUR_POLLING_UNITS, ...KAITA_POLLING_UNITS, ...KANKARA_POLLING_UNITS, ...KANKIA_POLLING_UNITS,
    ...KATSINA_POLLING_UNITS, ...KURFI_POLLING_UNITS, ...KUSADA_POLLING_UNITS, ...MAIADUA_POLLING_UNITS, ...MALUMFASHI_POLLING_UNITS,
    ...MANI_POLLING_UNITS, ...MASHI_POLLING_UNITS, ...MATAZU_POLLING_UNITS, ...MUSAWA_POLLING_UNITS, ...RIMI_POLLING_UNITS,
    ...SABUWA_POLLING_UNITS, ...SAFANA_POLLING_UNITS, ...SANDAMU_POLLING_UNITS, ...ZANGO_POLLING_UNITS
];

// Helper to get a random subset for demo purposes (e.g., 2 from each LGA)
export const getRandomResultsSubset = () => {
    // In a real app we'd fetch all 6000+ PUs, but for the UI demo we'll pick ~100 diverse ones
    const limitPerLga = 3;
    let subset: any[] = [];

    // Group by LGA (prefix of pu_code involves LGA code, but simpler to just iterate chunks if we knew them)
    // Actually, let's just picking random ones efficiently?
    // Since we just concatenated them, we can iterate through the list and pick every Nth, 
    // or just pick the first few of each block if we had them grouped.

    // Simpler approach: Filter by LGA names if we had them on PU object, but we only have PU codes and Ward IDs.
    // BAKORI_POLLING_UNITS etc are just arrays.

    const lgaCollections = [
        { name: 'Bakori', pus: BAKORI_POLLING_UNITS },
        { name: 'Batagarawa', pus: BATAGARAWA_POLLING_UNITS },
        { name: 'Batsari', pus: BATSARI_POLLING_UNITS },
        { name: 'Baure', pus: BAURE_POLLING_UNITS },
        { name: 'Bindawa', pus: BINDAWA_POLLING_UNITS },
        { name: 'Charanchi', pus: CHARANCHI_POLLING_UNITS },
        { name: 'Dandume', pus: DANDUME_POLLING_UNITS },
        { name: 'Danja', pus: DANJA_POLLING_UNITS },
        { name: 'Dan Musa', pus: DANMUSA_POLLING_UNITS },
        { name: 'Daura', pus: DAURA_POLLING_UNITS },
        { name: 'Dutsi', pus: DUTSI_POLLING_UNITS },
        { name: 'Dutsin-Ma', pus: DUTSINMA_POLLING_UNITS },
        { name: 'Faskari', pus: FASKARI_POLLING_UNITS },
        { name: 'Funtua', pus: FUNTUA_POLLING_UNITS },
        { name: 'Ingawa', pus: INGAWA_POLLING_UNITS },
        { name: 'Jibia', pus: JIBIA_POLLING_UNITS },
        { name: 'Kafur', pus: KAFUR_POLLING_UNITS },
        { name: 'Kaita', pus: KAITA_POLLING_UNITS },
        { name: 'Kankara', pus: KANKARA_POLLING_UNITS },
        { name: 'Kankia', pus: KANKIA_POLLING_UNITS },
        { name: 'Katsina', pus: KATSINA_POLLING_UNITS },
        { name: 'Kurfi', pus: KURFI_POLLING_UNITS },
        { name: 'Kusada', pus: KUSADA_POLLING_UNITS },
        { name: "Mai'Adua", pus: MAIADUA_POLLING_UNITS },
        { name: 'Malumfashi', pus: MALUMFASHI_POLLING_UNITS },
        { name: 'Mani', pus: MANI_POLLING_UNITS },
        { name: 'Mashi', pus: MASHI_POLLING_UNITS },
        { name: 'Matazu', pus: MATAZU_POLLING_UNITS },
        { name: 'Musawa', pus: MUSAWA_POLLING_UNITS },
        { name: 'Rimi', pus: RIMI_POLLING_UNITS },
        { name: 'Sabuwa', pus: SABUWA_POLLING_UNITS },
        { name: 'Safana', pus: SAFANA_POLLING_UNITS },
        { name: 'Sandamu', pus: SANDAMU_POLLING_UNITS },
        { name: 'Zango', pus: ZANGO_POLLING_UNITS }
    ];

    lgaCollections.forEach(group => {
        // Take first 3 from each
        const selected = group.pus.slice(0, 3).map(pu => ({ ...pu, lgaName: group.name }));
        subset = [...subset, ...selected];
    });

    return subset;
};

// Aggregate LGA summaries for state-wide statistics
export const ALL_LGA_SUMMARIES = [
    BAKORI_SUMMARY, BATAGARAWA_SUMMARY, BATSARI_SUMMARY, BAURE_SUMMARY, BINDAWA_SUMMARY,
    CHARANCHI_SUMMARY, DANDUME_SUMMARY, DANJA_SUMMARY, DANMUSA_SUMMARY, DAURA_SUMMARY,
    DUTSI_SUMMARY, DUTSINMA_SUMMARY, FASKARI_SUMMARY, FUNTUA_SUMMARY, INGAWA_SUMMARY,
    JIBIA_SUMMARY, KAFUR_SUMMARY, KAITA_SUMMARY, KANKARA_SUMMARY, KANKIA_SUMMARY,
    KATSINA_SUMMARY, KURFI_SUMMARY, KUSADA_SUMMARY, MAIADUA_SUMMARY, MALUMFASHI_SUMMARY,
    MANI_SUMMARY, MASHI_SUMMARY, MATAZU_SUMMARY, MUSAWA_SUMMARY, RIMI_SUMMARY,
    SABUWA_SUMMARY, SAFANA_SUMMARY, SANDAMU_SUMMARY, ZANGO_SUMMARY
];

// State-wide aggregate statistics
export const KATSINA_STATE_STATS = {
    state: 'Katsina',
    totalLgas: 34,
    totalWards: ALL_WARDS.length,
    totalPollingUnits: ALL_POLLING_UNITS.length,
    totalRegisteredVoters: ALL_LGA_SUMMARIES.reduce((sum, lga) => sum + (lga.totalRegisteredVoters || 0), 0),
    averageVotersPerUnit: Math.round(
        ALL_LGA_SUMMARIES.reduce((sum, lga) => sum + (lga.totalRegisteredVoters || 0), 0) / 
        ALL_POLLING_UNITS.length
    ),
    dataSource: 'INEC Official 2023 Elections Data',
    lastUpdated: '2022-08-31',
    lgaBreakdown: ALL_LGA_SUMMARIES.map(lga => ({
        name: lga.lga,
        wards: lga.totalWards,
        pollingUnits: lga.totalPollingUnits,
        registeredVoters: lga.totalRegisteredVoters || 0,
        averageVotersPerUnit: lga.averageVotersPerUnit || 0
    })).sort((a, b) => b.registeredVoters - a.registeredVoters)
};

// Helper function to get polling unit by ID
export const getPollingUnitById = (unitId: string) => {
    return ALL_POLLING_UNITS.find(pu => pu.id === unitId);
};

// Helper function to get ward by ID
export const getWardById = (wardId: string) => {
    return ALL_WARDS.find(w => w.id === wardId);
};

// Helper function to get polling units by LGA
export const getPollingUnitsByLga = (lgaName: string) => {
    return ALL_POLLING_UNITS.filter(pu => pu.lga.toLowerCase() === lgaName.toLowerCase());
};

// Export verification utility
export const verifyStateTotals = () => {
    const expectedTotal = 3570740;
    const actualTotal = KATSINA_STATE_STATS.totalRegisteredVoters;
    const pollingUnitCount = ALL_POLLING_UNITS.length;
    
    return {
        expectedVoters: expectedTotal,
        actualVoters: actualTotal,
        votersMatch: actualTotal === expectedTotal,
        totalPollingUnits: pollingUnitCount,
        expectedPollingUnits: 6652,
        unitsMatch: pollingUnitCount === 6652,
        lgaCount: ALL_LGA_SUMMARIES.length,
        expectedLgas: 34,
        lgasMatch: ALL_LGA_SUMMARIES.length === 34
    };
};
