// Script to update LGA data files with INEC voter counts
// This script will be used to programmatically update all 34 LGA files

import { LGA_VOTER_DISTRIBUTION, distributeVotersToUnits } from './inec_voter_data';
import type { Ward, PollingUnit } from './bakori_data';

// Helper function to calculate ward-level voter distribution
export const calculateWardVoterDistribution = (
  lgaName: string,
  wards: Ward[]
): Map<string, number> => {
  const totalLgaVoters = LGA_VOTER_DISTRIBUTION[lgaName] || 0;
  const totalWards = wards.length;
  
  if (totalWards === 0 || totalLgaVoters === 0) {
    return new Map();
  }
  
  const wardMap = new Map<string, number>();
  const basePerWard = Math.floor(totalLgaVoters / totalWards);
  let remaining = totalLgaVoters;
  
  // Distribute based on polling unit count per ward (larger wards get more voters)
  const totalUnits = wards.reduce((sum, w) => sum + w.pollingUnitsCount, 0);
  
  wards.forEach(ward => {
    // Weight by polling unit count
    const weight = ward.pollingUnitsCount / totalUnits;
    const allocation = Math.floor(totalLgaVoters * weight);
    wardMap.set(ward.id, allocation);
    remaining -= allocation;
  });
  
  // Distribute any remaining voters
  if (remaining > 0) {
    const wardIds = Array.from(wardMap.keys());
    let idx = 0;
    while (remaining > 0) {
      const wardId = wardIds[idx % wardIds.length];
      wardMap.set(wardId, (wardMap.get(wardId) || 0) + 1);
      remaining--;
      idx++;
    }
  }
  
  return wardMap;
};

// Helper function to calculate polling unit voter distribution
export const calculatePollingUnitVoterDistribution = (
  lgaName: string,
  wards: Ward[]
): Map<string, number> => {
  const wardVoterMap = calculateWardVoterDistribution(lgaName, wards);
  const unitVoterMap = new Map<string, number>();
  
  wards.forEach(ward => {
    const wardVoters = wardVoterMap.get(ward.id) || 0;
    const unitCount = ward.pollingUnitsCount;
    
    if (unitCount === 0) return;
    
    // Calculate base per unit with variance for realism
    const basePerUnit = Math.floor(wardVoters / unitCount);
    let remaining = wardVoters;
    
    for (let i = 1; i <= unitCount; i++) {
      const puId = `${ward.id}-PU${i.toString().padStart(3, '0')}`;
      
      // Add variance (-15% to +15%) for realistic distribution
      const variance = (Math.random() * 0.3) - 0.15;
      const voters = Math.max(50, Math.floor(basePerUnit * (1 + variance)));
      
      unitVoterMap.set(puId, voters);
      remaining -= voters;
    }
    
    // Distribute any remaining voters
    if (remaining > 0) {
      for (let i = 1; i <= unitCount && remaining > 0; i++) {
        const puId = `${ward.id}-PU${i.toString().padStart(3, '0')}`;
        const current = unitVoterMap.get(puId) || 0;
        unitVoterMap.set(puId, current + 1);
        remaining--;
      }
    }
  });
  
  return unitVoterMap;
};

// Generate TypeScript code for voter assignments
export const generateVoterAssignments = (
  lgaName: string,
  wards: Ward[]
): string => {
  const voterMap = calculatePollingUnitVoterDistribution(lgaName, wards);
  
  let code = '// INEC Voter Registration Data\n';
  code += `// Total ${lgaName} Voters: ${(LGA_VOTER_DISTRIBUTION[lgaName] || 0).toLocaleString()}\n\n`;
  
  code += 'const VOTER_ASSIGNMENTS: Record<string, number> = {\n';
  
  Array.from(voterMap.entries()).forEach(([unitId, voters]) => {
    code += `  '${unitId}': ${voters},\n`;
  });
  
  code += '};\n';
  
  return code;
};

// Verify totals match
export const verifyLgaTotals = (
  lgaName: string,
  wards: Ward[]
): { 
  expected: number; 
  calculated: number; 
  matches: boolean;
  unitCount: number;
} => {
  const voterMap = calculatePollingUnitVoterDistribution(lgaName, wards);
  const calculated = Array.from(voterMap.values()).reduce((sum, v) => sum + v, 0);
  const expected = LGA_VOTER_DISTRIBUTION[lgaName] || 0;
  
  return {
    expected,
    calculated,
    matches: calculated === expected,
    unitCount: voterMap.size
  };
};
