import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL || 'https://qkjscvmrqkxbzflowrox.supabase.co';
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function run() {
  console.log('Fetching from URL:', url);
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key || ''
      }
    });
    console.log('Status:', res.status);
    console.log('Headers:', [...res.headers.entries()]);
    console.log('Body:', await res.text());
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
run();
