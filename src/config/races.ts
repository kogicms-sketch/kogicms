// Election races tracked by the Situation Room.
export type RaceType =
  | "presidential"
  | "governorship"
  | "senatorial"
  | "house_of_reps"
  | "state_assembly";

export interface RaceConfig {
  id: RaceType;
  label: string;
  shortLabel: string;
  // Roles whose "own" race this is (for highlighting / default tab).
  ownerRoles: string[];
}

export const RACES: RaceConfig[] = [
  {
    id: "presidential",
    label: "Presidential",
    shortLabel: "President",
    ownerRoles: ["super_admin", "org_admin"],
  },
  {
    id: "governorship",
    label: "Governorship",
    shortLabel: "Governor",
    ownerRoles: ["super_admin", "org_admin"],
  },
  {
    id: "senatorial",
    label: "Senatorial",
    shortLabel: "Senate",
    ownerRoles: ["senatorial_leader"],
  },
  {
    id: "house_of_reps",
    label: "House of Reps",
    shortLabel: "Reps",
    ownerRoles: ["federal_rep"],
  },
  {
    id: "state_assembly",
    label: "State Assembly",
    shortLabel: "Assembly",
    ownerRoles: ["house_assembly_member"],
  },
];

export const RACE_MAP: Record<RaceType, RaceConfig> = RACES.reduce(
  (acc, r) => ({ ...acc, [r.id]: r }),
  {} as Record<RaceType, RaceConfig>,
);

// The race a given role most cares about (used to default the active tab).
export const getDefaultRaceForRole = (role?: string | null): RaceType => {
  const owned = RACES.find((r) => role && r.ownerRoles.includes(role));
  return owned?.id ?? "presidential";
};
