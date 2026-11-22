import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { localVoterService } from "@/services/LocalVoterService";

export interface VoterRecord {
  id: string;
  vin: string;
  full_name: string;
  dob_year: number | null;
  gender: string | null;
  lga: string | null;
  ward: string | null;
  polling_unit_code: string | null;
  polling_unit_name: string | null;
  photo_url: string | null;
}

/**
 * INEC stores names as "SURNAME, FIRSTNAME MIDDLENAME".
 * Returns { firstName, lastName } compatible with the member form.
 */
export const splitVoterName = (fullName: string): { firstName: string; lastName: string } => {
  if (!fullName) return { firstName: "", lastName: "" };

  const toTitle = (s: string) =>
    s
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  if (fullName.includes(",")) {
    const [surname, rest] = fullName.split(",");
    return {
      lastName: toTitle(surname.trim()),
      firstName: toTitle((rest || "").trim()),
    };
  }

  const parts = fullName.trim().split(/\s+/);
  const lastName = toTitle(parts.shift() || "");
  return { lastName, firstName: toTitle(parts.join(" ")) };
};

/** Map INEC gender codes to the member form values. */
export const mapVoterGender = (gender: string | null): string => {
  if (!gender) return "";
  const g = gender.trim().toUpperCase();
  if (g.startsWith("M")) return "male";
  if (g.startsWith("F")) return "female";
  return "";
};

/** Birth year only is available — return a Jan 1 date string for the date input. */
export const voterDobToDate = (dobYear: number | null): string =>
  dobYear ? `${dobYear}-01-01` : "";

export const useVoterRegistry = () => {
  const [searching, setSearching] = useState(false);

  const findByVin = useCallback(async (vin: string, lga: string = "Adavi"): Promise<VoterRecord | null> => {
    const trimmed = vin.trim();
    if (!trimmed) return null;
    setSearching(true);
    try {
      // 1. Check local file-based voter registry first (0 Supabase traffic)
      const localMatch = await localVoterService.findByVin(trimmed, lga);
      if (localMatch) {
        return {
          id: localMatch.vin,
          vin: localMatch.vin,
          full_name: localMatch.full_name,
          dob_year: localMatch.dob_year,
          gender: localMatch.gender,
          lga: localMatch.lga,
          ward: localMatch.ward,
          polling_unit_code: localMatch.polling_unit_code,
          polling_unit_name: localMatch.polling_unit_name,
          photo_url: null,
        };
      }

      // 2. Fallback to Supabase
      const { data, error } = await supabase
        .from("voter_registry")
        .select("*")
        .eq("vin", trimmed)
        .maybeSingle();
      if (error) throw error;
      return (data as VoterRecord) ?? null;
    } catch (e) {
      console.warn("Error finding voter by VIN:", e);
      return null;
    } finally {
      setSearching(false);
    }
  }, []);

  const searchByName = useCallback(async (query: string, lga: string = "Adavi"): Promise<VoterRecord[]> => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    setSearching(true);
    try {
      // 1. Check local file-based voter registry first (0 Supabase traffic)
      const localSearchResult = await localVoterService.searchVoters({ query: trimmed, lga });
      if (localSearchResult.results.length > 0) {
        return localSearchResult.results.map((v) => ({
          id: v.vin,
          vin: v.vin,
          full_name: v.full_name,
          dob_year: v.dob_year,
          gender: v.gender,
          lga: v.lga,
          ward: v.ward,
          polling_unit_code: v.polling_unit_code,
          polling_unit_name: v.polling_unit_name,
          photo_url: null,
        }));
      }

      // 2. Fallback to Supabase
      const { data, error } = await supabase
        .from("voter_registry")
        .select("*")
        .ilike("full_name", `${trimmed}%`)
        .order("full_name", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data as VoterRecord[]) ?? [];
    } catch (e) {
      console.warn("Error searching voters by name:", e);
      return [];
    } finally {
      setSearching(false);
    }
  }, []);

  return { findByVin, searchByName, searching };
};
