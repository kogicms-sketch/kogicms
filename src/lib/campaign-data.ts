import { ALL_WARDS, ALL_POLLING_UNITS } from "../data/aggregated_lga_data";

export const CAMPAIGN_NAME = "Dikko Radda Campaign";
export const CAMPAIGN_STATE = "Katsina State";

export const KATSINA_LGAS = [
  "Bakori", "Batagarawa", "Batsari", "Baure", "Bindawa", "Charanchi", "Dandume",
  "Danja", "Dan Musa", "Daura", "Dutsi", "Dutsin Ma", "Faskari", "Funtua",
  "Ingawa", "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Katsina",
  "Kurfi", "Kusada", "Mai'Adua", "Malumfashi", "Mani", "Mashi", "Matazu",
  "Musawa", "Rimi", "Sabuwa", "Safana", "Sandamu", "Zango"
];

// Helper to get Wards for a specific LGA
export const getWardsForLga = (lgaName: string): string[] => {
  // Normalize LGA name comparison to handle case/spacing differences if any
  const normalizedLga = lgaName.toLowerCase().replace(/['\s-]/g, '');
  
  return ALL_WARDS
    .filter(ward => ward.lga.toLowerCase().replace(/['\s-]/g, '') === normalizedLga)
    .map(ward => ward.name)
    .sort();
};

// Helper to get Polling Units for a specific Ward
// Note: Ward names might not be unique across LGAs, so ideally we should filter by LGA + Ward
// But for now, since the input is just ward name in some contexts, we might need to be careful.
// A better signature would be getPollingUnitsForWard(lga: string, ward: string)
export const getPollingUnitsForWard = (lgaName: string, wardName: string) => {
    if (!lgaName || !wardName) return [];

    const normalizedLga = lgaName.toLowerCase().replace(/['\s-]/g, '');
    const normalizedWard = wardName.toLowerCase().replace(/['\s-]/g, '');

    return ALL_POLLING_UNITS
        .filter(pu => {
            const puLga = pu.lga.toLowerCase().replace(/['\s-]/g, '');
            const puWard = pu.wardName.toLowerCase().replace(/['\s-]/g, '');
            return puLga === normalizedLga && puWard === normalizedWard;
        })
        .map(pu => pu.name) // Returning just names to match previous simplified API, or we can return full objects if needed
        .sort();
};

// Also export a version that returns full objects if needed by new components
export const getPollingUnitObjects = (lgaName: string, wardName: string) => {
    if (!lgaName || !wardName) return [];

    const normalizedLga = lgaName.toLowerCase().replace(/['\s-]/g, '');
    const normalizedWard = wardName.toLowerCase().replace(/['\s-]/g, '');

    return ALL_POLLING_UNITS
        .filter(pu => {
            const puLga = pu.lga.toLowerCase().replace(/['\s-]/g, '');
            const puWard = pu.wardName.toLowerCase().replace(/['\s-]/g, '');
            return puLga === normalizedLga && puWard === normalizedWard;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
};
