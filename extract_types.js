const fs = require('fs');
const path = 'C:/Users/user/.gemini/antigravity/brain/2d9bc0d2-ef26-45c2-ba64-64cd76ea4e98/.system_generated/steps/1278/output.txt';
const target = 'c:/Users/user/dikkocms/dikkocms/src/integrations/supabase/types.ts';

try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    fs.writeFileSync(target, data.types, 'utf8');
    console.log('Successfully updated types.ts');
} catch (err) {
    console.error('Error updating types:', err);
    process.exit(1);
}
