// Phase 2 smoke test: prove the data layer round-trips.
// Prereqs:
//   1. Create a Supabase project; run supabase/migrations/0001_init.sql.
//   2. Enable Auth → "Allow anonymous sign-ins".
//   3. Copy .env.example to .env and fill in URL + anon key.
// Run:  npm run db:smoke
//
// Signs in anonymously, inserts a goal, reads it back, deletes it. Exits
// non-zero on any failure.

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  console.error('Run with: node --env-file=.env scripts/smoke-supabase.mjs');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: auth, error: authErr } = await sb.auth.signInAnonymously();
  if (authErr) throw authErr;
  const userId = auth.user.id;
  console.log('✓ anonymous sign-in:', userId);

  const { data: inserted, error: insErr } = await sb
    .from('goals')
    .insert({
      user_id: userId,
      name: 'Smoke Test Gym',
      category: 'gym',
      cue: 'bag by the door',
      schedule: { days: [1, 3, 5], timeOfDay: '07:00' },
      rudeness_level: 3,
      escalation_speed: 'normal',
    })
    .select()
    .single();
  if (insErr) throw insErr;
  console.log('✓ inserted goal:', inserted.id);

  const { data: read, error: readErr } = await sb
    .from('goals')
    .select('id, name')
    .eq('id', inserted.id)
    .single();
  if (readErr) throw readErr;
  if (read.name !== 'Smoke Test Gym') throw new Error('read-back mismatch');
  console.log('✓ read back:', read.name);

  const { error: delErr } = await sb.from('goals').delete().eq('id', inserted.id);
  if (delErr) throw delErr;
  console.log('✓ deleted goal');

  console.log('\nPhase 2 data layer OK — round-trip verified.');
}

main().catch((err) => {
  console.error('✗ smoke test failed:', err.message ?? err);
  process.exit(1);
});
