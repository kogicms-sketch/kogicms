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

export interface LGAConstituencyInfo {
  senatorial_zone: string;
  federal_constituency: string;
}

export const LGA_CONSTITUENCY_MAP: Record<string, LGAConstituencyInfo> = {
  "Bakori": { senatorial_zone: "Katsina South", federal_constituency: "Bakori/Danja" },
  "Batagarawa": { senatorial_zone: "Katsina Central", federal_constituency: "Batagarawa/Charanchi/Rimi" },
  "Batsari": { senatorial_zone: "Katsina Central", federal_constituency: "Batsari/Safana/Danmusa" },
  "Baure": { senatorial_zone: "Katsina North", federal_constituency: "Zango/Baure" },
  "Bindawa": { senatorial_zone: "Katsina North", federal_constituency: "Bindawa/Mani" },
  "Charanchi": { senatorial_zone: "Katsina Central", federal_constituency: "Batagarawa/Charanchi/Rimi" },
  "Dan Musa": { senatorial_zone: "Katsina Central", federal_constituency: "Batsari/Safana/Danmusa" },
  "DanMusa": { senatorial_zone: "Katsina Central", federal_constituency: "Batsari/Safana/Danmusa" },
  "Dandume": { senatorial_zone: "Katsina South", federal_constituency: "Funtua/Dandume" },
  "Danja": { senatorial_zone: "Katsina South", federal_constituency: "Bakori/Danja" },
  "Daura": { senatorial_zone: "Katsina North", federal_constituency: "Daura/Sandamu/Mai'Adua" },
  "Dutsi": { senatorial_zone: "Katsina North", federal_constituency: "Mashi/Dutsi" },
  "Dutsin Ma": { senatorial_zone: "Katsina Central", federal_constituency: "Dutsin-Ma/Kurfi" },
  "Dutsin-Ma": { senatorial_zone: "Katsina Central", federal_constituency: "Dutsin-Ma/Kurfi" },
  "Faskari": { senatorial_zone: "Katsina South", federal_constituency: "Faskari/Kankara/Sabuwa" },
  "Funtua": { senatorial_zone: "Katsina South", federal_constituency: "Funtua/Dandume" },
  "Ingawa": { senatorial_zone: "Katsina North", federal_constituency: "Ingawa/Kankia/Kusada" },
  "Jibia": { senatorial_zone: "Katsina Central", federal_constituency: "Jibia/Kaita" },
  "Kafur": { senatorial_zone: "Katsina South", federal_constituency: "Malumfashi/Kafur" },
  "Kaita": { senatorial_zone: "Katsina Central", federal_constituency: "Jibia/Kaita" },
  "Kankara": { senatorial_zone: "Katsina South", federal_constituency: "Faskari/Kankara/Sabuwa" },
  "Kankia": { senatorial_zone: "Katsina North", federal_constituency: "Ingawa/Kankia/Kusada" },
  "Katsina": { senatorial_zone: "Katsina Central", federal_constituency: "Katsina" },
  "Kurfi": { senatorial_zone: "Katsina Central", federal_constituency: "Dutsin-Ma/Kurfi" },
  "Kusada": { senatorial_zone: "Katsina North", federal_constituency: "Ingawa/Kankia/Kusada" },
  "Mai'Adua": { senatorial_zone: "Katsina North", federal_constituency: "Daura/Sandamu/Mai'Adua" },
  "Malumfashi": { senatorial_zone: "Katsina South", federal_constituency: "Malumfashi/Kafur" },
  "Mani": { senatorial_zone: "Katsina North", federal_constituency: "Bindawa/Mani" },
  "Mashi": { senatorial_zone: "Katsina North", federal_constituency: "Mashi/Dutsi" },
  "Matazu": { senatorial_zone: "Katsina South", federal_constituency: "Matazu/Musawa" },
  "Musawa": { senatorial_zone: "Katsina South", federal_constituency: "Matazu/Musawa" },
  "Rimi": { senatorial_zone: "Katsina Central", federal_constituency: "Batagarawa/Charanchi/Rimi" },
  "Sabuwa": { senatorial_zone: "Katsina South", federal_constituency: "Faskari/Kankara/Sabuwa" },
  "Safana": { senatorial_zone: "Katsina Central", federal_constituency: "Batsari/Safana/Danmusa" },
  "Sandamu": { senatorial_zone: "Katsina North", federal_constituency: "Daura/Sandamu/Mai'Adua" },
  "Zango": { senatorial_zone: "Katsina North", federal_constituency: "Zango/Baure" }
};

export const getConstituencyForLga = (lgaName?: string | null): LGAConstituencyInfo | null => {
  if (!lgaName) return null;
  // Try direct match
  if (LGA_CONSTITUENCY_MAP[lgaName]) return LGA_CONSTITUENCY_MAP[lgaName];
  
  // Try normalized match
  const normalized = lgaName.toLowerCase().replace(/['\s-]/g, '');
  const foundKey = Object.keys(LGA_CONSTITUENCY_MAP).find(
    key => key.toLowerCase().replace(/['\s-]/g, '') === normalized
  );
  
  return foundKey ? LGA_CONSTITUENCY_MAP[foundKey] : null;
};
