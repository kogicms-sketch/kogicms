// INEC Registered Voter Data for Kogi State
// Source: Independent National Electoral Commission (INEC) 2023 Official Register
// Total Registered Voters: 1,931,330
// Total Polling Units: 3,512
// Total Wards: 239
// Total LGAs: 21

import dataset from './kogi_dataset.json';

export interface INECVoterData {
  totalRegisteredVoters: number;
  totalPollingUnits: number;
  totalWards: number;
  totalLgas: number;
  dataDate: string;
  dataSource: string;
  notes: string;
}

export const INEC_KOGI_DATA: INECVoterData = {
  totalRegisteredVoters: 1931330,
  totalPollingUnits: 3512,
  totalWards: 239,
  totalLgas: 21,
  dataDate: '2023-01-10',
  dataSource: 'Independent National Electoral Commission (INEC)',
  notes: 'Official INEC data for 2023 Elections across all 21 LGAs of Kogi State.'
};

export const INEC_KATSINA_DATA = INEC_KOGI_DATA;

// Exact distribution per LGA extracted directly from INEC Register
export const LGA_VOTER_DISTRIBUTION: Record<string, number> = dataset.summaries.reduce((acc, curr) => {
  acc[curr.lga] = curr.totalRegisteredVoters;
  return acc;
}, {} as Record<string, number>);

export const getLGAVoterCount = (lgaName: string): number => {
  if (LGA_VOTER_DISTRIBUTION[lgaName]) {
    return LGA_VOTER_DISTRIBUTION[lgaName];
  }
  const norm = lgaName.toLowerCase().replace(/[^a-z]/g, '');
  const found = Object.keys(LGA_VOTER_DISTRIBUTION).find(
    k => k.toLowerCase().replace(/[^a-z]/g, '') === norm
  );
  return found ? LGA_VOTER_DISTRIBUTION[found] : 0;
};
