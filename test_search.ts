// Test search functionality
import { ALL_POLLING_UNITS } from './src/data/aggregated_lga_data';

console.log('Testing search functionality...\n');

// Test 1: Count Kurfi polling units
const kurfiUnits = ALL_POLLING_UNITS.filter(pu => 
  pu.lga?.toLowerCase().includes('kurfi') ||
  pu.wardName?.toLowerCase().includes('kurfi') ||
  pu.name?.toLowerCase().includes('kurfi')
);

console.log(`1. Kurfi polling units found: ${kurfiUnits.length}`);
if (kurfiUnits.length > 0) {
  console.log('   Sample Kurfi units:');
  kurfiUnits.slice(0, 3).forEach(pu => {
    console.log(`   - ${pu.name} (${pu.lga}, ${pu.wardName})`);
  });
}

// Test 2: Count Bakori polling units
const bakoriUnits = ALL_POLLING_UNITS.filter(pu => 
  pu.lga?.toLowerCase().includes('bakori') ||
  pu.wardName?.toLowerCase().includes('bakori') ||
  pu.name?.toLowerCase().includes('bakori')
);

console.log(`\n2. Bakori polling units found: ${bakoriUnits.length}`);
if (bakoriUnits.length > 0) {
  console.log('   Sample Bakori units:');
  bakoriUnits.slice(0, 3).forEach(pu => {
    console.log(`   - ${pu.name} (${pu.lga}, ${pu.wardName})`);
  });
}

// Test 3: Total units
console.log(`\n3. Total polling units: ${ALL_POLLING_UNITS.length}`);

// Test 4: Check first few units
console.log('\n4. First 5 polling units in data:');
ALL_POLLING_UNITS.slice(0, 5).forEach(pu => {
  console.log(`   - ${pu.name} (${pu.lga}, ${pu.wardName})`);
});

// Test 5: Check if Kurfi units exist
console.log('\n5. All LGA names in data:');
const lgas = [...new Set(ALL_POLLING_UNITS.map(pu => pu.lga))].sort();
console.log(`   Total LGAs: ${lgas.length}`);
console.log(`   Includes Kurfi: ${lgas.includes('Kurfi')}`);
console.log(`   Includes Bakori: ${lgas.includes('Bakori')}`);

if (lgas.includes('Kurfi')) {
  const kurfiLgaUnits = ALL_POLLING_UNITS.filter(pu => pu.lga === 'Kurfi');
  console.log(`\n6. Kurfi LGA has ${kurfiLgaUnits.length} polling units`);
  console.log('   Sample:');
  kurfiLgaUnits.slice(0, 3).forEach(pu => {
    console.log(`   - ${pu.name} (${pu.wardName})`);
  });
}
