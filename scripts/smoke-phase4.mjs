// Phase 4 smoke: skip + buddy + witnessed completion round-trip.
// Run: npm run db:smoke4

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing env. Run: node --env-file=.env scripts/smoke-phase4.mjs');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: auth, error: authErr } = await sb.auth.signInAnonymously();
  if (authErr) throw authErr;
  const userId = auth.user.id;
  console.log('✓ signed in:', userId);

  const { data: buddy, error: bErr } = await sb
    .from('buddies')
    .insert({ user_id: userId, contact: 'Marco', invite_status: 'pending' })
    .select()
    .single();
  if (bErr) throw bErr;
  console.log('✓ invited buddy:', buddy.id);

  const { data: goal, error: gErr } = await sb
    .from('goals')
    .insert({
      user_id: userId,
      name: 'Phase4 Gym',
      category: 'gym',
      schedule: { slots: [{ day: 1, time: '07:00' }] },
      rudeness_level: 3,
      escalation_speed: 'normal',
      buddy_id: buddy.id,
    })
    .select()
    .single();
  if (gErr) throw gErr;
  console.log('✓ created goal with buddy attached');

  const { error: sErr } = await sb
    .from('skips')
    .insert({ goal_id: goal.id, user_id: userId, reason: 'Too tired' });
  if (sErr) throw sErr;
  console.log('✓ logged skip');

  const { data: comp, error: cErr } = await sb
    .from('completions')
    .insert({ goal_id: goal.id, user_id: userId, source: 'tap', witnessed: true })
    .select()
    .single();
  if (cErr) throw cErr;
  if (comp.witnessed !== true) throw new Error('witnessed flag not stored');
  console.log('✓ logged witnessed completion');

  await sb.from('goals').delete().eq('id', goal.id);
  await sb.from('buddies').delete().eq('id', buddy.id);
  console.log('✓ cleaned up');

  console.log('\nPhase 4 data paths OK (skip + buddy + witnessed).');
}

main().catch((e) => {
  console.error('✗ failed:', e.message ?? e);
  process.exit(1);
});
