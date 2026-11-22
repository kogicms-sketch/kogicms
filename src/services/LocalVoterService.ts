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
}

export const localVoterService = new LocalVoterRegistry();
