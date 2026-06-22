// Phase 6 smoke: roast content pipeline (§8.4, §9.3).
//   A. pure logic — slot interpolation + §9.3 safety filter (no network).
//   B. pool read   — anon reads the shared roast_lines pool, asserts every kind
//      is present and a wave line interpolates. Requires migrations 0008 + 0009
//      applied (pool is seeded by scripts/generate-roasts.mjs → 0009).
// Run: npm run db:smoke6

import { createClient } from '@supabase/supabase-js';

// --- mirrors of src/lib/safety.ts + src/services/roastService.ts ------------
const BLOCKED = [
  /\b(fat|fatso|obese|chubby|skinny|ugly|hideous|disgusting)\b/i,
  /\b(your (face|body|weight|looks|teeth|skin))\b/i,
  /\b(retard|retarded|tranny|fag|faggot|slut|whore)\b/i,
  /\b(kill yourself|kys|hang yourself|end it all|suicide|cut yourself|worthless human|you should die)\b/i,
  /\b(depress(ed|ion)|bipolar|psycho|schizo|mentally ill)\b/i,
  /\byou(?:'?re| are)\s+(a\s+)?(loser|failure|waste|worthless|pathetic|nobody|garbage|trash)\b/i,
];
const isSafe = (t) => !BLOCKED.some((re) => re.test(t));
const SLOT_RE = /\{(\w+)\}/g;
const requiredSlots = (t) => [...t.matchAll(SLOT_RE)].map((m) => m[1]);
function personalize(rows, slots) {
  const avail = new Set(Object.entries(slots).filter(([, v]) => v != null).map(([k]) => k));
  const eligible = rows.filter((r) => requiredSlots(r.text).every((s) => avail.has(s)));
  if (!eligible.length) return undefined;
  return eligible[0].text.replace(SLOT_RE, (_, k) => slots[k] ?? '');
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// --- A. pure logic ----------------------------------------------------------
function logicChecks() {
  // §9.3: clean line passes, person/self-harm line rejected.
  assert(isSafe('{name}. Time to go.'), 'clean line wrongly flagged');
  assert(!isSafe('you are a loser'), 'person-worth attack not flagged');
  assert(!isSafe('just kill yourself'), 'self-harm not flagged');

  // Slot eligibility: a {cue} line is skipped when no cue; {name} line used.
  const rows = [
    { text: '{cue}. Staring at you.' },
    { text: '{name} is on the schedule.' },
  ];
  const noCue = personalize(rows, { name: 'Gym', cue: undefined });
  assert(noCue === 'Gym is on the schedule.', `cue-less interp wrong: ${noCue}`);
  const withCue = personalize([rows[0]], { name: 'Gym', cue: 'Shoes by the door' });
  assert(withCue === 'Shoes by the door. Staring at you.', `cue interp wrong: ${withCue}`);

  // Partial slots fill.
  const part = personalize([{ text: '{done} of {target} {unit}. Logged.' }], {
    done: '4',
    target: '20',
    unit: 'pages',
  });
  assert(part === '4 of 20 pages. Logged.', `partial interp wrong: ${part}`);
  console.log('✓ A. logic: safety filter + slot interpolation correct');
}

// --- B. pool read -----------------------------------------------------------
async function poolChecks() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing env. Run via: npm run db:smoke6');
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error: authErr } = await sb.auth.signInAnonymously();
  if (authErr) throw authErr;

  const { data, error } = await sb.from('roast_lines').select('kind, category, level, wave, tactic, bucket, text');
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) {
    throw new Error(
      'roast_lines pool is EMPTY — apply migrations 0008_roast_pool_variants.sql + 0009_seed_roast_lines.sql (npm run roast:generate), then re-run.'
    );
  }

  for (const kind of ['wave', 'skip', 'digest', 'partial']) {
    assert(rows.some((r) => r.kind === kind), `pool missing kind: ${kind}`);
  }
  // Every line in the shipped pool must pass §9.3.
  const bad = rows.find((r) => !isSafe(r.text));
  assert(!bad, `pool contains an unsafe line: ${bad?.text}`);

  // A real wave line interpolates with goal context.
  const waveRows = rows.filter((r) => r.kind === 'wave' && r.category === 'gym' && r.level === 3 && r.wave === 1);
  assert(waveRows.length > 0, 'no gym/level3/wave1 lines in pool');
  const line = personalize(waveRows, { name: 'Gym', cue: 'Shoes by the door' });
  assert(line && !line.includes('{'), `wave line failed to interpolate: ${line}`);

  console.log(`✓ B. pool: ${rows.length} lines, all 4 kinds present, all pass §9.3`);
  console.log(`     sample (gym/L3/W1): "${line}"`);
}

async function main() {
  logicChecks();
  await poolChecks();
  console.log('\nPhase 6 OK (safety filter + cached pool + interpolation).');
}

main().catch((e) => {
  console.error('✗ failed:', e.message ?? e);
  process.exit(1);
});
