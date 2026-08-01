import { ALL_WARDS, ALL_POLLING_UNITS } from "../data/aggregated_lga_data";
import { supabase } from "@/integrations/supabase/loose-client";
import { localRepository } from "@/services/LocalRepository";

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

export const getStandardPuCode = (lgaName: string, puCode: string): string => {
  if (!puCode) return "";
  if (puCode.startsWith("20-")) {
    return puCode;
  }
  const match = puCode.match(/W(\d+)-(\d+)/i);
  if (!match) return puCode;
  const wardNum = match[1].padStart(2, "0");
  const puNum = match[2].padStart(3, "0");
  const norm = lgaName.toLowerCase().replace(/[^a-z]/g, "");
  const list = [
    "bakori", "batagarawa", "batsari", "baure", "bindawa", "charanchi", "dandume",
    "danja", "danmusa", "daura", "dutsi", "dutsinma", "faskari", "funtua",
    "ingawa", "jibia", "kafur", "kaita", "kankara", "kankia", "katsina",
    "kurfi", "kusada", "maiadua", "malumfashi", "mani", "mashi", "matazu",
    "musawa", "rimi", "sabuwa", "safana", "sandamu", "zango"
  ];
  const idx = list.indexOf(norm);
  const lgaCode = idx !== -1 ? (idx + 1).toString().padStart(2, "0") : "21";
  return `20-${lgaCode}-${wardNum}-${puNum}`;
};

// Helper to wrap promises in a timeout to prevent hanging states
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`Promise timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutId);
      return result;
    }),
    timeoutPromise
  ]);
}

export const generateSequentialMembershipId = async (
  lga: string,
  ward: string,
  pollingUnitName: string,
  voterCardId?: string | null
): Promise<string> => {
  if (!lga || !ward || !pollingUnitName) {
    return `DR-${Date.now().toString(36).toUpperCase()}`;
  }

  // 1. Get LGA abbreviation (e.g. Katsina -> KAT)
  const lgaAbbr = lga.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
  
  // 2. Get Ward & PU code
  let puCode = "";
  if (voterCardId && voterCardId.startsWith("20-")) {
    const parts = voterCardId.split("-");
    if (parts.length >= 4) {
      puCode = `W${parts[2]}-${parts[3]}`;
    } else {
      puCode = voterCardId;
    }
  }

  if (!puCode && pollingUnitName) {
    const puObj = getPollingUnitObjects(lga, ward).find(pu => pu.name === pollingUnitName);
    if (puObj?.code) {
      puCode = puObj.code;
    }
  }

  if (!puCode) {
    const match = pollingUnitName.match(/PU\s*(\d+)/i);
    const puNum = match ? match[1] : "000";
    const wardAbbr = ward.replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase();
    puCode = `${wardAbbr}-${puNum}`;
  }

  const cleanPuCode = puCode.toUpperCase().replace(/\s+/g, "");
  const prefix = `${lgaAbbr}-${cleanPuCode}-`;

  let maxSeq = 0;

  // Query existing membership_ids starting with this prefix to find highest sequence number
  try {
    const idListResult = await withTimeout(
      supabase
        .from("members")
        .select("membership_id")
        .ilike("membership_id", `${prefix}%`),
      5000,
      { data: null, error: null }
    );
    const { data: idList } = idListResult as any;
    if (idList && Array.isArray(idList)) {
      for (const item of idList) {
        if (item.membership_id) {
          const parts = item.membership_id.split("-");
          const lastNum = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastNum) && lastNum > maxSeq) {
            maxSeq = lastNum;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error querying remote membership_ids by prefix:", err);
  }

  // 3. Get existing count
  let remoteCount = 0;
  try {
    const countResult = await withTimeout(
      supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("lga", lga)
        .eq("ward", ward)
        .eq("polling_unit", pollingUnitName),
      4000,
      { count: 0, error: null }
    );
    const { count, error } = countResult as any;
    if (!error && count !== null) {
      remoteCount = count;
    }
  } catch (err) {
    console.error("Error querying remote members count:", err);
  }

  let localCount = 0;
  try {
    const localMembers = await withTimeout(
      localRepository.getMembersByWard(lga, ward),
      2000,
      []
    );
    for (const m of localMembers) {
      if (m.polling_unit === pollingUnitName) {
        localCount++;
      }
      if (m.membership_id && m.membership_id.startsWith(prefix)) {
        const parts = m.membership_id.split("-");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum) && lastNum > maxSeq) {
          maxSeq = lastNum;
        }
      }
    }
  } catch (err) {
    console.error("Error querying local members count:", err);
  }

  const nextSeq = Math.max(remoteCount, localCount, maxSeq) + 1;
  const seqStr = nextSeq.toString().padStart(4, "0");

  return `${prefix}${seqStr}`;
};

export const insertNewVoterToRegistry = async (
  fullName: string,
  lga: string,
  ward: string,
  pollingUnitName: string,
  vin: string,
  gender: string | null,
  dateOfBirth: string | null
) => {
  const localPuObj = getPollingUnitObjects(lga, ward).find(p => p.name === pollingUnitName);
  const localCode = localPuObj?.code || "";
  const standardPuCode = localCode ? getStandardPuCode(lga, localCode) : "";

  let dobYear: number | null = null;
  if (dateOfBirth) {
    const d = new Date(dateOfBirth);
    if (!isNaN(d.getTime())) {
      dobYear = d.getFullYear();
    }
  }

  let mappedGender = null;
  if (gender) {
    if (gender.toLowerCase().startsWith("m")) mappedGender = "M";
    if (gender.toLowerCase().startsWith("f")) mappedGender = "F";
  }

  const id = localRepository.generateUUID();
  const newVoter = {
    id,
    vin,
    full_name: fullName.toUpperCase(),
    dob_year: dobYear,
    gender: mappedGender,
    lga,
    ward,
    polling_unit_code: standardPuCode || null,
    polling_unit_name: pollingUnitName,
    voter_status: "not collected",
    created_at: new Date().toISOString(),
  };

  let success = false;
  try {
    const insertResult = await withTimeout(
      supabase.from("voter_registry").insert(newVoter),
      4000,
      { error: new Error("Voter registry insert timed out") }
    );
    if (!insertResult.error) {
      success = true;
    } else {
      console.warn("Direct voter registry insert failed, queuing in sync queue:", insertResult.error);
    }
  } catch (err) {
    console.warn("Direct voter registry insert exception, queuing:", err);
  }

  if (!success) {
    await localRepository.enqueueAction("voter_registry", "INSERT", id, newVoter);
  }

  return newVoter;
};
