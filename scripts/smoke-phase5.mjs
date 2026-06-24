// Phase 5 server-slice smoke: the DB the escalation cron depends on.
// (Push delivery itself needs a device + Expo creds — verified separately.)
// Requires migrations 0007 (profiles.push_token) + 0012 (notification_log).
// Run: npm run db:smoke5

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing env. Run: npm run db:smoke5');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: auth, error: authErr } = await sb.auth.signInAnonymously();
  if (authErr) throw authErr;
  const id = auth.user.id;
  console.log('✓ signed in:', id);

  // push_token column (0007) — writable by owner, read back.
  const token = 'ExponentPushToken[smoke-test]';
  const { error: tErr } = await sb.from('profiles').update({ push_token: token }).eq('id', id);
  if (tErr) throw new Error(`push_token update failed (apply 0007?): ${tErr.message}`);
  const { data: prof } = await sb.from('profiles').select('push_token').eq('id', id).single();
  if (prof.push_token !== token) throw new Error('push_token not stored');
  console.log('✓ profiles.push_token writable (cron targeting)');

  // notification_log (0012) — owner can SELECT; starts empty.
  const { data: logs, error: lErr } = await sb
    .from('notification_log')
    .select('id')
    .eq('user_id', id);
  if (lErr) throw new Error(`notification_log select failed (apply 0012?): ${lErr.message}`);
  if ((logs ?? []).length !== 0) throw new Error('expected empty notification_log');
  console.log('✓ notification_log readable (escalation-state log)');

  // Roast-only: escalation pulls roast-tactic lines (any wave). Pool must have them.
  const { data: roastLines, error: wErr } = await sb
    .from('roast_lines')
    .select('text')
    .eq('kind', 'wave')
    .eq('category', 'gym')
    .eq('level', 4)
    .eq('tactic', 'roast');
  if (wErr) throw wErr;
  if ((roastLines ?? []).length === 0) throw new Error('no roast lines in pool for escalation (apply latest 0009?)');
  console.log(`✓ pool has roast lines (gym/L4/roast): ${roastLines.length}`);

  // Clean the test token so it can't receive real pushes.
  await sb.from('profiles').update({ push_token: null }).eq('id', id);
  console.log('✓ cleaned up test token');

  console.log('\nPhase 5 server-slice DB OK (push_token + notification_log + Wave-2 pool).');
}

main().catch((e) => {
  console.error('✗ failed:', e.message ?? e);
  process.exit(1);
});
