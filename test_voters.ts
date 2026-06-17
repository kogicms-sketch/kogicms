import { BAKORI_POLLING_UNITS } from './src/data/bakori_data';

console.log('Testing Bakori polling units...');
console.log('Total units:', BAKORI_POLLING_UNITS.length);
console.log('\nFirst 5 units:');
BAKORI_POLLING_UNITS.slice(0, 5).forEach(pu => {
  console.log(`${pu.name}: ${pu.registeredVoters || 0} voters`);
});

const totalVoters = BAKORI_POLLING_UNITS.reduce((sum, pu) => sum + (pu.registeredVoters || 0), 0);
console.log(`\nTotal voters calculated: ${totalVoters}`);
