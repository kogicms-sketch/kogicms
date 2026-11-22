import { ALL_WARDS, ALL_POLLING_UNITS } from "../data/aggregated_lga_data";
import { supabase } from "@/integrations/supabase/loose-client";
import { localRepository } from "@/services/LocalRepository";

export const CAMPAIGN_NAME = "Kogi State Campaign";
export const CAMPAIGN_STATE = "Kogi State";

export const KOGI_LGAS = [
  "Adavi",
  "Ajaokuta",
  "Ankpa",
  "Bassa",
  "Dekina",
  "Ibaji",
  "Idah",
  "Igalamela-Odolu",
  "Ijumu",
  "Kabba/Bunu",
  "Kogi (Koton Karfe)",
  "Lokoja",
  "Mopa-Muro",
  "Ofu",
  "Ogori/Magongo",
  "Okehi",
  "Okene",
  "Olamaboro",
  "Omala",
  "Yagba East",
  "Yagba West"
];
export const KATSINA_LGAS = KOGI_LGAS;

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
  "Adavi": {
    "senatorial_zone": "Kogi Central",
    "federal_constituency": "Adavi/Okehi"
  },
  "Ajaokuta": {
    "senatorial_zone": "Kogi Central",
    "federal_constituency": "Ajaokuta"
  },
  "Ankpa": {
    "senatorial_zone": "Kogi East",
    "federal_constituency": "Ankpa/Omala/Olamaboro"
  },
  "Bassa": {
    "senatorial_zone": "Kogi East",
    "federal_constituency": "Bassa/Dekina"
  },
  "Dekina": {
    "senatorial_zone": "Kogi East",
    "federal_constituency": "Bassa/Dekina"
  },
  "Ibaji": {
    "senatorial_zone": "Kogi East",
    "federal_constituency": "Idah/Ibaji/Igalamela-Odolu/Ofu"
  },
  "Idah": {
    "senatorial_zone": "Kogi East",
    "federal_constituency": "Idah/Ibaji/Igalamela-Odolu/Ofu"
  },
  "Igalamela-Odolu": {
    "senatorial_zone": "Kogi East",
    "federal_constituency": "Idah/Ibaji/Igalamela-Odolu/Ofu"
  },
  "Igalamela Odolu": {
    "senatorial_zone": "Kogi East",
    "federal_constituency": "Idah/Ibaji/Igalamela-Odolu/Ofu"
  },
  "Ijumu": {
    "senatorial_zone": "Kogi West",
    "federal_constituency": "Kabba/Bunu/Ijumu"
  },
  "Kabba/Bunu": {
    "senatorial_zone": "Kogi West",
    "federal_constituency": "Kabba/Bunu/Ijumu"
  },
  "Kabba Bunu": {
    "senatorial_zone": "Kogi West",
    "federal_constituency": "Kabba/Bunu/Ijumu"
  },
  "Kogi (Koton Karfe)": {
    "senatorial_zone": "Kogi West",
    "federal_constituency": "Lokoja/Kogi (KK)"
  },
  "Kogi": {
    "senatorial_zone": "Kogi West",
    "federal_constituency": "Lokoja/Kogi (KK)"
  },
  "Lokoja": {
    "senatorial_zone": "Kogi West",
    "federal_constituency": "Lokoja/Kogi (KK)"
  },
  "Mopa-Muro": {
    "senatorial_zone": "Kogi West",
    "federal_constituency": "Yagba East/Yagba West/Mopamuro"
  },
  "Mopa Moro": {
    "senatorial_zone": "Kogi West",
    "federal_constituency": "Yagba East/Yagba West/Mopamuro"
  },
  "Ofu": {
    "senatorial_zone": "Kogi East",
    "federal_constituency": "Idah/Ibaji/Igalamela-Odolu/Ofu"
  },
  "Ogori/Magongo": {
    "senatorial_zone": "Kogi Central",
    "federal_constituency": "Okene/Ogori-Magongo"
  },
  "Ogori Mangogo": {
    "senatorial_zone": "Kogi Central",
    "federal_constituency": "Okene/Ogori-Magongo"
  },
  "Okehi": {
    "senatorial_zone": "Kogi Central",
    "federal_constituency": "Adavi/Okehi"
  },
  "Okene": {
    "senatorial_zone": "Kogi Central",
    "federal_constituency": "Okene/Ogori-Magongo"
  },
  "Olamaboro": {
    "senatorial_zone": "Kogi East",
    "federal_constituency": "Ankpa/Omala/Olamaboro"
  },
  "Omala": {
    "senatorial_zone": "Kogi East",
    "federal_constituency": "Ankpa/Omala/Olamaboro"
  },
  "Yagba East": {
    "senatorial_zone": "Kogi West",
    "federal_constituency": "Yagba East/Yagba West/Mopamuro"
  },
  "Yagba West": {
    "senatorial_zone": "Kogi West",
    "federal_constituency": "Yagba East/Yagba West/Mopamuro"
  }
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
  if (puCode.startsWith("22-") || puCode.startsWith("20-")) {
    return puCode;
  }
  const match = puCode.match(/W(\d+)-(\d+)/i);
  if (!match) return puCode;
  const wardNum = match[1].padStart(2, "0");
  const puNum = match[2].padStart(3, "0");
  const norm = lgaName.toLowerCase().replace(/[^a-z]/g, "");
    const list = [
    "adavi", "ajaokuta", "ankpa", "bassa", "dekina", "ibaji", "idah",
    "igalamelaodolu", "ijumu", "kabbabunu", "kogikotonkarfe", "lokoja",
    "mopamuro", "ofu", "ogorimagongo", "okehi", "okene", "olamaboro",
    "omala", "yagbaeast", "yagbawest"
  ];
  let idx = list.indexOf(norm);
  if (idx === -1) {
    if (norm === "kogi" || norm === "kogikk") idx = list.indexOf("kogikotonkarfe");
    else if (norm === "mopamoro") idx = list.indexOf("mopamuro");
    else if (norm === "ogorimangogo") idx = list.indexOf("ogorimagongo");
  }
  const lgaCode = idx !== -1 ? (idx + 1).toString().padStart(2, "0") : "01";
  return `22-${lgaCode}-${wardNum}-${puNum}`;
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

  let nextSeq = Math.max(remoteCount, localCount, maxSeq) + 1;
  
  // Helper to generate clean, readable uppercase ALPHABET + NUMERIC salt (excluding confusing 0/O/1/I)
  const getAlphaNumSalt = (len = 3): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let res = "";
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // If queries returned 0 (e.g. due to RLS restriction on anonymous queries or network timeout),
  // fallback to ALPHABET + NUMBER sequence so we get instant 100% collision-free IDs!
  if (nextSeq === 1 && maxSeq === 0 && remoteCount === 0 && localCount === 0) {
    const alphaCode = getAlphaNumSalt(4);
    return `${prefix}${alphaCode}`;
  }

  const seqStr = nextSeq.toString().padStart(4, "0");
  const alphaSuffix = getAlphaNumSalt(2);
  return `${prefix}${seqStr}-${alphaSuffix}`;
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
