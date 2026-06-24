// Phase 6 batch generator (AGENTS.md §8.4, §15.5).
//
// Fills the SHARED `roast_lines` pool. v1 uses an OFFLINE, hand-authored seed
// corpus (no AI spend, bake-off §0.1 still open) — the swappable provider
// interface lives in src/lib/ai/provider.ts for when a model is locked.
//
// Output: emits supabase/migrations/0009_seed_roast_lines.sql (idempotent:
// clears + re-inserts the pool), applied via the same flow as every other
// migration — so the pool fills with NO service-role key needed.
//
//   npm run roast:generate
//
// Every generated line is run through a mirror of src/lib/safety.ts (§9.3); a
// single flagged line aborts the build (the seed must be clean by construction).
//
// Template slots filled later by RoastService string-interpolation (NEVER live
// AI): {name} {cue} {excuse} {count} {done} {target} {unit}.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'supabase', 'migrations', '0009_seed_roast_lines.sql');

// --- Safety mirror (§9.3) — keep in sync with src/lib/safety.ts -------------
// Ego/character jabs allowed (consent-gated); only the four hard categories block.
const BLOCKED = [
  /\b(fat|fatso|obese|chubby|skinny|ugly|hideous|disgusting)\b/i,
  /\b(your (face|body|weight|looks|teeth|skin))\b/i,
  /\b(retard|retarded|tranny|fag|faggot|slut|whore)\b/i,
  /\b(kill yourself|kys|hang yourself|end it all|suicide|cut yourself|worthless human|you should die)\b/i,
  /\b(depress(ed|ion)|bipolar|psycho|schizo|mentally ill)\b/i,
];
const isSafe = (t) => !BLOCKED.some((re) => re.test(t));

const CATEGORIES = ['gym', 'study', 'chores', 'diet', 'water', 'sleep', 'custom'];
const LEVELS = [1, 2, 3, 4];
const TACTICS = ['snark', 'shrink', 'stakes', 'roast']; // wave 1→4 (§3.3)

// --- WAVE corpus: [level][waveIndex 0..3] → lines ---------------------------
// Category-agnostic templates reused across all categories ({name}/{cue}
// personalize). Lines requiring {cue} or {excuse} are only sent when that slot
// is available (RoastService filters on slot eligibility).
const WAVE = {
  1: [
    ['{name} is on the schedule. Just so you know it knows.', '{cue}. It’s sitting there. Staring.'],
    ['Time for {name}. No pressure. (There is a little pressure.)'],
    ['{name}. Whenever you’re ready. Today would be ideal.', '{cue}. Right where you left it. Hint.'],
  ],
  2: [
    ['{name} now. That’s the message. That’s the whole message.', 'New deal: forget the rest, just start {name}. Go.'],
    ['Shrink it. One rep of {name}. That’s the entire assignment.'],
    ['Stop negotiating. The smallest version of {name} counts. Move.', '{cue}. Touch it. That’s step one. Do step one.'],
  ],
  3: [
    ['Third nudge on {name}. Want your buddy looped in, or are you handling it?', 'The streak is bleeding out on {name}. Last clean exit is now.'],
    ['Skip this and it’s on the record. {name}. Your call.', '“{excuse}” — that the story we’re going with on {name}?'],
    ['Clock’s loud now. {name}, or the buddy hears about it. Pick.', '“{excuse}” again? Bold. The record disagrees. {name}.'],
  ],
  4: [
    ['The Council of Goals has reviewed {name}. Verdict: the couch wins again. Appeal by standing up.', 'BREAKING: {name} ignored into legend. The couch erects a statue.'],
    ['Day in the saga of {name}: our hero loses to gravity. Crowd goes mild.'],
    ['The lore now records {name} as the one that got away. “{excuse},” the scrolls read. Tragic.', 'Final form unlocked: Professional Almost-Did-{name}. Magnificent. Useless.'],
  ],
};

// --- SKIP corpus: [level] → lines (slot {excuse}) ---------------------------
const SKIP = {
  1: ['Skipping for “{excuse}”. A little disappointing, but logged.', 'Logged. We’ll pretend this didn’t happen. Tomorrow?'],
  2: ['“{excuse}.” Filed. Streak’s bleeding — fix it tomorrow.', 'Skip logged. No medals for showing up to bail. Move.'],
  3: ['“{excuse}” — the hit single that never stops. Streak’s dead, and you killed it.', 'Skipped again. The plan is now a building you’ve heard rumors about.'],
  4: ['The Council reviewed “{excuse}.” Denied, embarrassing, on-brand. Streak revoked.', '“{excuse}.” A magnificent work of fiction. The streak wept, then perished. Curtains.'],
};

// --- DIGEST corpus: [level] → lines (slot {count}) --------------------------
const DIGEST = {
  1: ['{count} things on the list today. Gentle reminder they don’t do themselves.', 'Today: {count} to handle. You’ve got this. Probably.'],
  2: ['{count} tasks waiting. The list isn’t shrinking on its own. Start one.', '{count} on deck today. Pick one. Now.'],
  3: ['{count} tasks staring you down today. History says you’ll lose to at least one. Prove it wrong.', 'Today’s docket: {count}. The couch has already placed its bets.'],
  4: ['The Council convenes: {count} trials await. The realm watches. The couch sharpens its grip.', '{count} quests today, hero. Last season’s record is… not in evidence.'],
};

// --- PARTIAL corpus: [level][bucket] → lines (slots {done}/{target}/{unit}) -
// For quantified goals: roast the RATIO, not just the skip (§4.3). Effort, not person.
const PARTIAL = {
  1: {
    low: ['{done} of {target} {unit}. It’s a start. A small one. Okay.'],
    half: ['{done} of {target} {unit}. Halfway. The other half is also there, fyi.'],
    almost: ['{done} of {target} {unit}. So close. Round it up tomorrow?'],
  },
  2: {
    low: ['{done} of {target} {unit}. That’s a warm-up, not a workout. Finish it.'],
    half: ['{done} of {target} {unit}. Half effort logged. Halves don’t build streaks.'],
    almost: ['{done} of {target} {unit}. Nearly. “Nearly” doesn’t count. Close the gap.'],
  },
  3: {
    low: ['{done} of {target} {unit}. Bold to log that and walk away. The target is laughing.'],
    half: ['{done} of {target} {unit}. The classic half. Famous for finishing nothing.'],
    almost: ['{done} of {target} {unit}. This close and you tapped out? The target felt that.'],
  },
  4: {
    low: ['The scrolls record {done} of {target} {unit}. The Council calls it “a rumor of effort.”'],
    half: ['{done} of {target} {unit}. Half a legend is just a guy who left early.'],
    almost: ['{done} of {target} {unit}. So near the summit, then a heroic nap. Ballads will not be written.'],
  },
};

// --- Assemble rows ----------------------------------------------------------
/** @type {{kind:string,category:string|null,level:number,wave:number|null,tactic:string|null,bucket:string|null,text:string}[]} */
const rows = [];
const push = (r) => {
  if (!isSafe(r.text)) throw new Error(`§9.3 BLOCKED: "${r.text}"`);
  rows.push(r);
};

for (const level of LEVELS) {
  // wave (per category — same templates, category stored for future divergence)
  WAVE[level].forEach((variants, waveIdx) => {
    for (const category of CATEGORIES) {
      for (const text of variants) {
        push({ kind: 'wave', category, level, wave: waveIdx + 1, tactic: TACTICS[waveIdx], bucket: null, text });
      }
    }
  });
  // skip / digest — cross-category (category null)
  for (const text of SKIP[level]) push({ kind: 'skip', category: null, level, wave: null, tactic: null, bucket: null, text });
  for (const text of DIGEST[level]) push({ kind: 'digest', category: null, level, wave: null, tactic: null, bucket: null, text });
  // partial — per category, per ratio bucket
  for (const bucket of ['low', 'half', 'almost']) {
    for (const category of CATEGORIES) {
      for (const text of PARTIAL[level][bucket]) {
        push({ kind: 'partial', category, level, wave: null, tactic: null, bucket, text });
      }
    }
  }
}

// --- Emit idempotent seed migration -----------------------------------------
const lit = (v) => (v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const values = rows
  .map((r) => `  (${lit(r.kind)}, ${lit(r.category)}, ${r.level}, ${r.wave ?? 'null'}, ${lit(r.tactic)}, ${lit(r.bucket)}, ${lit(r.text)})`)
  .join(',\n');

const sql = `-- Phase 6 seed of the shared roast_lines pool (§8.4). GENERATED by
-- scripts/generate-roasts.mjs — do not hand-edit; re-run \`npm run roast:generate\`.
-- Offline seed corpus (no AI), already cleared by the §9.3 filter. Idempotent:
-- replaces the entire pool so re-running the generator + migration is safe.

delete from public.roast_lines;

insert into public.roast_lines (kind, category, level, wave, tactic, bucket, text) values
${values};
`;

writeFileSync(OUT, sql);
const byKind = rows.reduce((m, r) => ((m[r.kind] = (m[r.kind] ?? 0) + 1), m), {});
console.log(`✓ ${rows.length} lines generated, all passed §9.3 filter`);
console.log(`  by kind: ${JSON.stringify(byKind)}`);
console.log(`✓ wrote ${OUT.replace(join(__dirname, '..') + '/', '')}`);
console.log('  → apply it like the other migrations to fill the pool.');
