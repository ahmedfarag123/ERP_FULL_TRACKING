/**
 * Reset 4 users' passwords to "12345678" via admin edge function.
 * 
 * HOW TO USE:
 * 1. Log in to the admin app
 * 2. Open DevTools → Console
 * 3. Paste each block below and press Enter
 */

// STEP 1: Get your access token (run this first)
const token = JSON.parse(localStorage.getItem('sb-pbtvjmdwaqpgbzsntsog-auth-token') || '{}').currentSession?.access_token;
console.log('Token:', token ? token.slice(0, 30) + '...' : 'NOT FOUND - make sure you are logged in');

// STEP 2: Run this to set all 4 passwords (paste your token from step 1)
const BASE = 'https://pbtvjmdwaqpgbzsntsog.supabase.co';
const EMAILS = [
  'ahmedadel@hs.sales',
  'ahmedalaa@hs.sales',
  'mohamedkhaled@hs.sales',
  'elsammahmoud@hs.sales',
];
const PW = '12345678';

for (const email of EMAILS) {
  const r = await fetch(`${BASE}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, {
    headers: { Authorization: `Bearer ${token}`, apikey: token }
  });
  const p = await r.json();
  const id = p?.[0]?.id;
  if (!id) { console.warn('No profile:', email); continue; }
  
  const res = await fetch(`${BASE}/functions/v1/admin-user-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'set-password', payload: { userId: id, password: PW } })
  });
  const j = await res.json();
  console.log(j.error ? `❌ ${email}: ${j.error}` : `✅ ${email} → ${PW}`);
}
