// Local Voter Service for Offline / Client-Side Voter Lookups
// Eliminates Supabase network queries and handles 100,000+ records in memory

export interface LocalVoter {
  vin: string;
  full_name: string;
  gender: string;
  dob_year: number | null;
  lga: string;
  ward: string;
  polling_unit_code: string;
  polling_unit_name: string;
}

export interface RawVoterRecord {
  sn?: number;
  name?: string;
  full_name?: string;
  vin: string;
  dob_year?: number | null;
  gender?: string | null;
  pu_code?: string;
  pu_name?: string;
  ward_name?: string;
  lga?: string;
}

export interface WardPollingUnitData {
  pu_code: string;
  pu_name: string;
  pdf_file?: string;
  total_records: number;
  voters_extracted: number;
  voters: RawVoterRecord[];
}

export interface WardData {
  lga: string;
  ward_folder: string;
  ward_code: string;
  ward_name: string;
  polling_units_count: number;
  total_voters: number;
  polling_units: WardPollingUnitData[];
}

interface RawIndexItem {
  vin: string;
  name: string;
  g: string;
  y: number | null;
  pu: string;
  pu_name: string;
  w: string;
  lga: string;
}

export interface LgaSummary {
  lga: string;
  lga_code: string;
  state: string;
  total_wards: number;
  total_polling_units: number;
  total_voters_extracted: number;
  male_voters?: number;
  male_pct?: string;
  female_voters?: number;
  female_pct?: string;
  wards: {
    ward_code: string;
    ward_folder: string;
    ward_name: string;
    polling_units_count: number;
    total_voters: number;
    file_path: string;
  }[];
}

export const LGA_FOLDER_MAP: Record<string, string> = {
  "adavi": "01_ADAVI",
  "ajaokuta": "02_AJAOKUTA",
  "ankpa": "03_ANKPA",
  "bassa": "04_BASSA",
  "dekina": "05_DEKINA",
  "ibaji": "06_IBAJI",
  "idah": "07_IDAH",
  "igalamelaodolu": "08_IGALAMELA_ODOLU",
  "ijumu": "09_IJUMU",
  "kabbabunu": "10_KABBA_BUNU",
  "kogikotonkarfe": "11_KOGI_K_K",
  "kogikk": "11_KOGI_K_K",
  "kogi": "11_KOGI_K_K",
  "lokoja": "12_LOKOJA",
  "mopamuro": "13_MOPA_MORO",
  "mopamoro": "13_MOPA_MORO",
  "ofu": "14_OFU",
  "ogorimagongo": "15_OGORI_MANGOGO",
  "ogorimangogo": "15_OGORI_MANGOGO",
  "okehi": "16_OKEHI",
  "okene": "17_OKENE",
  "olamaboro": "18_OLAMABORO",
  "omala": "19_OMALA",
  "yagbaeast": "20_YAGBA_EAST",
  "yagbawest": "21_YAGBA_WEST",
};

class LocalVoterRegistry {
  private cache: Map<string, LocalVoter[]> = new Map();
  private loadingPromises: Map<string, Promise<LocalVoter[]>> = new Map();
  private summaries: Map<string, LgaSummary> = new Map();
  private wardCache: Map<string, WardData> = new Map();
  private wardLoadingPromises: Map<string, Promise<WardData | null>> = new Map();

  // Helper to normalize strings for matching
  public normalizeKey(s: string): string {
    return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  // Normalize LGA name to folder key, e.g. "Adavi" -> "01_ADAVI"
  public getLgaFolder(lgaName: string): string {
    const norm = lgaName.toLowerCase().replace(/[^a-z]/g, "");
    return LGA_FOLDER_MAP[norm] || lgaName;
  }

  private async fetchJson<T>(relPath: string): Promise<T | null> {
    if (typeof window === "undefined") {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const fullPath = path.resolve("public", relPath.replace(/^\//, ""));
        if (!fs.existsSync(fullPath)) return null;
        return JSON.parse(fs.readFileSync(fullPath, "utf8"));
      } catch {
        return null;
      }
    } else {
      try {
        const res = await fetch(relPath);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    }
  }

  // Load LGA summary
  public async getSummary(lgaName: string = "Adavi"): Promise<LgaSummary | null> {
    const folder = this.getLgaFolder(lgaName);
    if (this.summaries.has(folder)) {
      return this.summaries.get(folder)!;
    }

    try {
      const data = await this.fetchJson<LgaSummary>(`/voters_data/${folder}/summary.json`);
      if (!data) return null;
      this.summaries.set(folder, data);
      return data;
    } catch (e) {
      console.warn(`Could not load summary for ${lgaName}:`, e);
      return null;
    }
  }

  // Load all voters for an LGA into memory
  public async loadLgaVoters(lgaName: string = "Adavi"): Promise<LocalVoter[]> {
    const folder = this.getLgaFolder(lgaName);

    if (this.cache.has(folder)) {
      return this.cache.get(folder)!;
    }

    if (this.loadingPromises.has(folder)) {
      return this.loadingPromises.get(folder)!;
    }

    const loadPromise = (async () => {
      try {
        const rawList = await this.fetchJson<RawIndexItem[]>(`/voters_data/${folder}/search_index.json`);
        if (!rawList) {
          console.warn(`Local voters data not found for ${folder}`);
          return [];
        }

        const mapped: LocalVoter[] = rawList.map((r) => ({
          vin: r.vin,
          full_name: r.name,
          gender: r.g,
          dob_year: r.y,
          lga: r.lga,
          ward: r.w,
          polling_unit_code: r.pu,
          polling_unit_name: r.pu_name,
        }));

        this.cache.set(folder, mapped);
        return mapped;
      } catch (err) {
        console.error(`Failed to load voter search index for ${lgaName}:`, err);
        return [];
      } finally {
        this.loadingPromises.delete(folder);
      }
    })();

    this.loadingPromises.set(folder, loadPromise);
    return loadPromise;
  }

  // Find a voter by exact or partial VIN
  public async findByVin(vin: string, lgaName: string = "Adavi"): Promise<LocalVoter | null> {
    const trimmed = vin.trim().toUpperCase();
    if (!trimmed) return null;

    const voters = await this.loadLgaVoters(lgaName);
    const exact = voters.find((v) => v.vin.toUpperCase() === trimmed);
    if (exact) return exact;

    // Suffix/prefix match fallback
    return voters.find((v) => v.vin.toUpperCase().includes(trimmed)) || null;
  }

  // Search voters by name, ward, and polling unit
  public async searchVoters(options: {
    query?: string;
    vin?: string;
    lga?: string;
    ward?: string;
    pu?: string;
    limit?: number;
  }): Promise<{ total: number; results: LocalVoter[] }> {
    const lga = options.lga || "Adavi";
    const limit = options.limit || 50;
    const voters = await this.loadLgaVoters(lga);

    let filtered = voters;

    if (options.vin) {
      const vTrim = options.vin.trim().toUpperCase();
      filtered = filtered.filter((v) => v.vin.toUpperCase().includes(vTrim));
    }

    if (options.query) {
      const tokens = options.query
        .trim()
        .toUpperCase()
        .split(/\s+/)
        .filter(Boolean);
      filtered = filtered.filter((v) => {
        const nameUpper = v.full_name.toUpperCase();
        return tokens.every((t) => nameUpper.includes(t));
      });
    }

    if (options.ward) {
      const wNorm = options.ward.trim().toLowerCase();
      filtered = filtered.filter((v) => v.ward.toLowerCase().includes(wNorm));
    }

    if (options.pu) {
      const puNorm = options.pu.trim().toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.polling_unit_code.toLowerCase().includes(puNorm) ||
          v.polling_unit_name.toLowerCase().includes(puNorm)
      );
    }

    return {
      total: filtered.length,
      results: filtered.slice(0, limit),
    };
  }

  // Load ward data directly from /voters_data/${lgaFolder}/wards/${wardFolder}.json
  public async getWardData(lgaName: string, wardName: string): Promise<WardData | null> {
    const folder = this.getLgaFolder(lgaName);
    const normWard = this.normalizeKey(wardName);
    const cacheKey = `${folder}:${normWard}`;

    if (this.wardCache.has(cacheKey)) {
      return this.wardCache.get(cacheKey)!;
    }

    if (this.wardLoadingPromises.has(cacheKey)) {
      return this.wardLoadingPromises.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        const summary = await this.getSummary(lgaName);
        if (!summary || !summary.wards) return null;

        // Find matching ward in summary
        const wardMeta = summary.wards.find(
          (w) => this.normalizeKey(w.ward_name) === normWard || this.normalizeKey(w.ward_folder).includes(normWard)
        );

        let targetPath = "";
        if (wardMeta?.file_path) {
          targetPath = wardMeta.file_path.startsWith("/") ? wardMeta.file_path : `/${wardMeta.file_path}`;
          if (!targetPath.startsWith("/voters_data/")) {
            targetPath = `/voters_data/${folder}/${targetPath.replace(/^\//, "")}`;
          }
        } else if (wardMeta?.ward_folder) {
          targetPath = `/voters_data/${folder}/wards/${wardMeta.ward_folder}.json`;
        } else {
          return null;
        }

        const data = await this.fetchJson<WardData>(targetPath);
        if (data) {
          this.wardCache.set(cacheKey, data);
          return data;
        }
        return null;
      } catch (err) {
        console.warn(`Failed to load ward data for ${lgaName} / ${wardName}:`, err);
        return null;
      } finally {
        this.wardLoadingPromises.delete(cacheKey);
      }
    })();

    this.wardLoadingPromises.set(cacheKey, promise);
    return promise;
  }

  // Get voters for a specific polling unit
  public async getPollingUnitVoters(
    lgaName: string,
    wardName: string,
    puNameOrCode: string
  ): Promise<LocalVoter[]> {
    const wardData = await this.getWardData(lgaName, wardName);
    if (!wardData || !wardData.polling_units) return [];

    const normTarget = this.normalizeKey(puNameOrCode);
    const targetUpper = puNameOrCode.trim().toUpperCase();

    // Match PU by code or name
    const matchedPu = wardData.polling_units.find((pu) => {
      const puCodeUpper = (pu.pu_code || "").trim().toUpperCase();
      if (puCodeUpper === targetUpper || puCodeUpper.includes(targetUpper) || targetUpper.includes(puCodeUpper)) {
        return true;
      }
      const normPuName = this.normalizeKey(pu.pu_name);
      return normPuName === normTarget || normPuName.includes(normTarget) || normTarget.includes(normPuName);
    });

    if (!matchedPu || !matchedPu.voters) return [];

    return matchedPu.voters.map((v) => ({
      vin: v.vin,
      full_name: v.name || v.full_name || "",
      gender: v.gender || "",
      dob_year: v.dob_year ?? null,
      lga: v.lga || wardData.lga || lgaName,
      ward: v.ward_name || wardData.ward_name || wardName,
      polling_unit_code: v.pu_code || matchedPu.pu_code,
      polling_unit_name: v.pu_name || matchedPu.pu_name,
    }));
  }

  // Search all voters in a ward by name or VIN
  public async searchWardVoters(
    lgaName: string,
    wardName: string,
    query: string,
    limit: number = 200
  ): Promise<LocalVoter[]> {
    const wardData = await this.getWardData(lgaName, wardName);
    if (!wardData || !wardData.polling_units) return [];

    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return [];

    const results: LocalVoter[] = [];
    const tokens = trimmed.split(/\s+/).filter(Boolean);

    for (const pu of wardData.polling_units) {
      if (!pu.voters) continue;
      for (const v of pu.voters) {
        const vName = (v.name || v.full_name || "").toUpperCase();
        const vVin = (v.vin || "").toUpperCase();

        const matchesVin = vVin.includes(trimmed);
        const matchesName = tokens.every((token) => vName.includes(token));

        if (matchesVin || matchesName) {
          results.push({
            vin: v.vin,
            full_name: v.name || v.full_name || "",
            gender: v.gender || "",
            dob_year: v.dob_year ?? null,
            lga: v.lga || wardData.lga || lgaName,
            ward: v.ward_name || wardData.ward_name || wardName,
            polling_unit_code: v.pu_code || pu.pu_code,
            polling_unit_name: v.pu_name || pu.pu_name,
          });

          if (results.length >= limit) return results;
        }
      }
    }

    return results;
  }

  // Find voter in ward by exact or partial VIN
  public async findWardVoterByVin(
    lgaName: string,
    wardName: string,
    vin: string
  ): Promise<LocalVoter | null> {
    const trimmed = vin.trim().toUpperCase();
    if (!trimmed) return null;

    const wardData = await this.getWardData(lgaName, wardName);
    if (!wardData || !wardData.polling_units) return null;

    // Exact match first
    for (const pu of wardData.polling_units) {
      if (!pu.voters) continue;
      const exact = pu.voters.find((v) => (v.vin || "").toUpperCase() === trimmed);
      if (exact) {
        return {
          vin: exact.vin,
          full_name: exact.name || exact.full_name || "",
          gender: exact.gender || "",
          dob_year: exact.dob_year ?? null,
          lga: exact.lga || wardData.lga || lgaName,
          ward: exact.ward_name || wardData.ward_name || wardName,
          polling_unit_code: exact.pu_code || pu.pu_code,
          polling_unit_name: exact.pu_name || pu.pu_name,
        };
      }
    }

    // Partial match fallback
    for (const pu of wardData.polling_units) {
      if (!pu.voters) continue;
      const partial = pu.voters.find((v) => (v.vin || "").toUpperCase().includes(trimmed));
      if (partial) {
        return {
          vin: partial.vin,
          full_name: partial.name || partial.full_name || "",
          gender: partial.gender || "",
          dob_year: partial.dob_year ?? null,
          lga: partial.lga || wardData.lga || lgaName,
          ward: partial.ward_name || wardData.ward_name || wardName,
          polling_unit_code: partial.pu_code || pu.pu_code,
          polling_unit_name: partial.pu_name || pu.pu_name,
        };
      }
    }

    return null;
  }
}

export const localVoterService = new LocalVoterRegistry();
