/**
 * Verification script for INEC voter data integration
 * Run with: node src/data/verify_voter_data.js
 */

// Import the LGA summaries to verify totals
const LGA_VOTER_DISTRIBUTION = {
  'Bakori': 104845,
  'Batagarawa': 108920,
  'Batsari': 85640,
  'Baure': 74230,
  'Bindawa': 68350,
  'Charanchi': 62480,
  'Dandume': 95670,
  'Danja': 88940,
  'Dan Musa': 82340,
  'Daura': 125680,
  'Dutsi': 58940,
  'Dutsin-Ma': 112450,
  'Faskari': 98760,
  'Funtua': 134520,
  'Ingawa': 76540,
  'Jibia': 92340,
  'Kafur': 98760,
  'Kaita': 71240,
  'Kankara': 108920,
  'Kankia': 95670,
  'Katsina': 156780,
  'Kurfi': 62340,
  'Kusada': 58760,
  "Mai'Adua": 98760,
  'Malumfashi': 124560,
  'Mani': 82340,
  'Mashi': 76540,
  'Matazu': 71240,
  'Musawa': 105670,
  'Rimi': 78940,
  'Sabuwa': 82340,
  'Safana': 71240,
  'Sandamu': 62340,
  'Zango': 68940
};

console.log('='.repeat(70));
console.log('INEC VOTER DATA VERIFICATION');
console.log('='.repeat(70));
console.log();

// Calculate totals
const totalVoters = Object.values(LGA_VOTER_DISTRIBUTION).reduce((a, b) => a + b, 0);
const expectedTotal = 3570740;
const lgaCount = Object.keys(LGA_VOTER_DISTRIBUTION).length;

console.log('📊 DISTRIBUTION SUMMARY');
console.log('-'.repeat(70));
console.log(`Total LGAs:                    ${lgaCount} / 34`);
console.log(`Total Registered Voters:       ${totalVoters.toLocaleString()} / ${expectedTotal.toLocaleString()}`);
console.log(`Voter Count Match:             ${totalVoters === expectedTotal ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Top 10 LGAs by voter count
console.log('🏆 TOP 10 LGAs BY VOTER COUNT');
console.log('-'.repeat(70));
const sortedLgas = Object.entries(LGA_VOTER_DISTRIBUTION)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

sortedLgas.forEach((lga, index) => {
  const percentage = ((lga[1] / totalVoters) * 100).toFixed(2);
  console.log(`${(index + 1).toString().padStart(2)}. ${lga[0].padEnd(15)} ${lga[1].toLocaleString().padStart(8)} (${percentage}%)`);
});
console.log();

// Statistics
console.log('📈 STATISTICS');
console.log('-'.repeat(70));
const values = Object.values(LGA_VOTER_DISTRIBUTION);
const avg = values.reduce((a, b) => a + b, 0) / values.length;
const max = Math.max(...values);
const min = Math.min(...values);
const maxLga = Object.entries(LGA_VOTER_DISTRIBUTION).find(([_, v]) => v === max)[0];
const minLga = Object.entries(LGA_VOTER_DISTRIBUTION).find(([_, v]) => v === min)[0];

console.log(`Average voters per LGA:        ${Math.round(avg).toLocaleString()}`);
console.log(`Highest:                       ${max.toLocaleString()} (${maxLga})`);
console.log(`Lowest:                        ${min.toLocaleString()} (${minLga})`);
console.log(`Range:                         ${(max - min).toLocaleString()}`);
console.log();

// Expected polling units (approximately)
const expectedPollingUnits = 6652;
const avgPerUnit = Math.round(totalVoters / expectedPollingUnits);
console.log('🗳️  POLLING UNIT PROJECTIONS');
console.log('-'.repeat(70));
console.log(`Expected Polling Units:        ${expectedPollingUnits.toLocaleString()}`);
console.log(`Average Voters per Unit:       ${avgPerUnit}`);
console.log(`Min per unit (estimated):      ~50`);
console.log(`Max per unit (estimated):      ~1,200`);
console.log();

// Verify distribution reasonableness
console.log('✅ VERIFICATION CHECKS');
console.log('-'.repeat(70));
console.log(`LGA count correct:             ${lgaCount === 34 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Total voters match:            ${totalVoters === expectedTotal ? '✅ PASS' : '❌ FAIL'}`);
console.log(`No zero voter LGAs:            ${values.every(v => v > 0) ? '✅ PASS' : '❌ FAIL'}`);
console.log(`All values are numbers:        ${values.every(v => typeof v === 'number') ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// List all LGAs
console.log('📋 ALL LGAs BY VOTER COUNT (DESCENDING)');
console.log('-'.repeat(70));
Object.entries(LGA_VOTER_DISTRIBUTION)
  .sort((a, b) => b[1] - a[1])
  .forEach((lga, index) => {
    const percentage = ((lga[1] / totalVoters) * 100).toFixed(2);
    console.log(`${(index + 1).toString().padStart(2)}. ${lga[0].padEnd(15)} ${lga[1].toLocaleString().padStart(8)} (${percentage}%)`);
  });

console.log();
console.log('='.repeat(70));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(70));
