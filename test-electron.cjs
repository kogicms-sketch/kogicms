console.log('Electron Version:', process.versions.electron);
console.log('ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE);
try {
    const electronMain = require('electron/main');
    console.log('electron/main available:', !!electronMain);
} catch (e) {
    console.log('electron/main failed:', e.message);
}
console.log('Node Version:', process.versions.node);
const electron = require('electron');
console.log('Electron Type:', typeof electron);
console.log('Electron keys:', Object.keys(electron));
console.log('Electron value:', electron);
try {
    console.log('Electron resolve:', require.resolve('electron'));
} catch (e) {
    console.log('Electron resolve failed:', e.message);
}
