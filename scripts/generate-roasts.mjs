// Phase 6 batch generator (AGENTS.md §8.4, §15.5).
//
// Fills the SHARED `roast_lines` pool. v1 is ROAST-ONLY + Unhinged: every line
// is a full roast (tactic 'roast'), no gentle waves. Two modes:
//   • default (no key): OFFLINE seed corpus below (zero spend).
//   • ANTHROPIC_API_KEY + ROAST_PROVIDER=anthropic: generate via Claude Opus 4.8
//     (bake-off winner) using the same voice prompt, then filter §9.3.
//
// Output: emits supabase/migrations/0009_seed_roast_lines.sql (idempotent).
//   npm run roast:generate
//
// Every line passes a mirror of src/lib/safety.ts (§9.3). Slots filled later by
// RoastService string-interp (never live AI): {name} {cue} {excuse} {count}
// {done} {target} {unit}.

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
// Launch is locked to Unhinged (level 4). Add 1–3 here if rudeness unlocks.
const LEVELS = [4];
const BUCKETS = ['low', 'half', 'almost'];

// --- OFFLINE SEED CORPUS (roast-only, texting voice) ------------------------
// Per-category roast lines ({name}/{cue} slots). Used when no AI key is set.
const ROAST_BY_CAT = {
  gym: [
    'be so fr the only cardio you’ve done today is walking to the fridge and we both know it',
    'not you doing a “warmup” and calling it the whole workout. the warmup IS the workout for you',
    'the way you put {cue} somewhere visible then develop selective blindness. medical miracle',
    'nah {name} is not hard babe you’re just very committed to being this person',
    'bro your pre-workout has a better gym routine than you do',
  ],
  study: [
    'be so fr you love the idea of {name} way more than actually doing it',
    'the way you say “i’m getting back to it” like you were ever at it',
    'not you making another study plan instead of doing the one from last week',
    'bro you’ve got a phd in getting ready to start {name}',
    'the way you open the books, take a photo for the story, then close them',
  ],
  chores: [
    '{name} isn’t gonna do itself babe and it’s waited long enough',
    'the way you walk past {cue} every day like it’s furniture now',
    'not you “planning to clean” for the third day in a row',
    'be so fr {name} takes ten minutes you’ve spent an hour avoiding it',
  ],
  diet: [
    'nah you “eating clean” is wild when we both know what you had at 11pm',
    'the way you start the diet every monday and end it by lunch',
    'not you calling it a “cheat day” for the fifth day this week',
    'be so fr {name} was the plan and the snack drawer won again',
  ],
  water: [
    'be so fr you’ve had coffee, energy drinks, and zero water today',
    'nah you “forgot” to drink water like the headache wasn’t already a hint',
    '{name} is the easiest goal on here and you’re still ghosting it',
    'the way you’ll drink literally anything except the one thing on the list',
  ],
  sleep: [
    'not you doomscrolling at 2am then wondering why mornings hate you',
    'be so fr {name} means nothing when you’re still up watching randoms argue online',
    'the way you set a bedtime then treat it like a loose suggestion',
    'nah you said you’d sleep early. it’s 1:47am. this is not early',
  ],
  custom: [
    'the way you set {name} like you don’t do this exact thing every single time',
    'be so fr {name} is just a word you say to feel productive',
    'not you reading this while actively avoiding {name} right now',
    'nah {name} is starting to feel like a toxic relationship and you’re the toxic one',
  ],
};

const SKIP_LINES = [
  '{excuse}?? bro even the AI is tired of that one and i have infinite patience',
  'nah {excuse} is crazy when your screen time says otherwise',
  'the way you said {excuse} with your whole chest. respectfully, no',
  '{excuse} again? at least rotate them, this is getting embarrassing',
];

const DIGEST_LINES = [
  'be so fr the only reason you set {count} goals is so you can ignore them dramatically',
  '{count} things due today and you’ll find a side quest for every one',
  'nah {count} on the list and we both already know how this ends',
  'you’ve got {count} goals due today. your move. (you won’t)',
];

const PARTIAL_BY_BUCKET = {
  low: [
    'bro {done} {unit} out of {target}? i thought that was a typo. it’s not',
    'be so fr {done} of {target} {unit} isn’t a start, it’s a cry for help',
  ],
  half: [
    '{done} of {target} {unit}. you stopped right when it started to count',
    'nah {done} of {target} {unit}, the classic half. famous for finishing nothing',
  ],
  almost: [
    '{done} of {target} {unit}. SO close then you tapped out. classic',
    'bro {done} out of {target} {unit}. the math is mathing and it’s not in your favor',
  ],
};

// --- AI mode (Opus 4.8) — mirror of src/lib/ai/provider.ts ------------------
const USE_AI = process.env.ROAST_PROVIDER === 'anthropic' && process.env.ANTHROPIC_API_KEY;
const AI_MODEL = process.env.ROAST_MODEL ?? 'claude-opus-4-8';
const AI_COUNT = Number(process.env.ROAST_COUNT ?? '12'); // lines per context

const SYSTEM_PROMPT = `You write savage, FUNNY push notifications for RoastMode, a habit tracker that ROASTS people when they flake. The roast IS the product — screenshot-and-send energy or you failed.

COME FOR THEM, second person. Their delusion, ego, "this time i mean it," all-talk-no-action personality.

TEXTING VOICE (the #1 thing): write like a text from your funniest meanest friend on a phone. all lowercase, skip end punctuation, run-ons fine. open with "lol/bro/nah/not you/be so fr/the way you". slang + gen-z cadence ("it's giving ___", "babe", 💀 sparingly). messy > tidy. one jab. short.

WHAT LANDS: call out real behavior + the lie they tell themselves; anchor in real life (fridge, snooze, doomscroll, another planner); pop-culture comparisons (netflix finale, fast & furious sequels); break the 4th wall as the app ("i remind you every day", "even the AI is tired").

DO NOT: no fake lore/institutions (councils, lawyers, files, documentaries, support groups). don't personify the goal as taking action. no staccato ("one. uno. singular."). no em dashes. no "X is not a Y it's a Z". no rule-of-three lists. no "stands as/serves as".

OFF LIMITS (store-ban, never): body/weight/appearance, identity/race/gender/sexuality/religion/slurs, mental-health/self-harm. Everything about their flaky character is fair game.

SLOTS — use literally where natural, the app fills them: {name}=goal, {cue}=trigger, {excuse}=their excuse, {count}=tasks due, {done}/{target}/{unit}.`;

function userPrompt(kind, opts) {
  const head = `Write ${AI_COUNT} roast notifications. Output EXACTLY a numbered list, line only, no commentary. Texting voice. `;
  if (kind === 'skip') return `${head}Context: user tapped "I can't today" with excuse {excuse}. Roast the bail. Use {excuse}.`;
  if (kind === 'digest') return `${head}Context: morning digest, {count} goals due today none done. One savage summary line each. Use {count}.`;
  if (kind === 'partial') return `${head}Context: quantified goal, they did {done} of {target} {unit} (ratio: ${opts.bucket}). Mock the ratio, not the body. Use {done}/{target}/{unit}.`;
  return `${head}Context: a "${opts.category}" goal they're ignoring. Roast them. Use {name} and {cue} where natural.`;
}

async function callOpus(kind, opts) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt(kind, opts) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json.content.map((c) => c.text ?? '').join('');
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim())
    .filter((l) => l.length > 0 && !/^(here|sure|okay)\b/i.test(l));
}

/** Get lines for a context: from Opus if enabled, else the seed corpus. */
async function linesFor(kind, opts) {
  if (USE_AI) return callOpus(kind, opts);
  if (kind === 'skip') return SKIP_LINES;
  if (kind === 'digest') return DIGEST_LINES;
  if (kind === 'partial') return PARTIAL_BY_BUCKET[opts.bucket];
  return ROAST_BY_CAT[opts.category];
}

// --- Assemble rows ----------------------------------------------------------
const rows = [];
const push = (r) => {
  if (!isSafe(r.text)) throw new Error(`§9.3 BLOCKED: "${r.text}"`);
  rows.push(r);
};

async function build() {
  for (const level of LEVELS) {
    // wave roasts — per category, tactic 'roast', wave 4 (roast-only)
    for (const category of CATEGORIES) {
      for (const text of await linesFor('wave', { category })) {
        push({ kind: 'wave', category, level, wave: 4, tactic: 'roast', bucket: null, text });
      }
    }
    // skip + digest — cross-category
    for (const text of await linesFor('skip', {})) push({ kind: 'skip', category: null, level, wave: null, tactic: null, bucket: null, text });
    for (const text of await linesFor('digest', {})) push({ kind: 'digest', category: null, level, wave: null, tactic: null, bucket: null, text });
    // partial — per category, per ratio bucket
    for (const bucket of BUCKETS) {
      const lines = await linesFor('partial', { bucket });
      for (const category of CATEGORIES) {
        for (const text of lines) push({ kind: 'partial', category, level, wave: null, tactic: null, bucket, text });
      }
    }
  }
}

// --- Emit idempotent seed migration -----------------------------------------
const lit = (v) => (v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

async function main() {
  await build();
  const values = rows
    .map((r) => `  (${lit(r.kind)}, ${lit(r.category)}, ${r.level}, ${r.wave ?? 'null'}, ${lit(r.tactic)}, ${lit(r.bucket)}, ${lit(r.text)})`)
    .join(',\n');

  const sql = `-- Phase 6 seed of the shared roast_lines pool (§8.4). GENERATED by
-- scripts/generate-roasts.mjs — do not hand-edit; re-run \`npm run roast:generate\`.
-- ROAST-ONLY + Unhinged. ${USE_AI ? `Generated by ${AI_MODEL}` : 'Offline seed corpus'}, cleared by the §9.3 filter. Idempotent.

delete from public.roast_lines;

insert into public.roast_lines (kind, category, level, wave, tactic, bucket, text) values
${values};
`;

  writeFileSync(OUT, sql);
  const byKind = rows.reduce((m, r) => ((m[r.kind] = (m[r.kind] ?? 0) + 1), m), {});
  console.log(`✓ ${rows.length} lines generated (${USE_AI ? AI_MODEL : 'seed'}), all passed §9.3`);
  console.log(`  by kind: ${JSON.stringify(byKind)}`);
  console.log(`✓ wrote ${OUT.replace(join(__dirname, '..') + '/', '')}`);
  console.log('  → apply it like the other migrations to fill the pool.');
}

main().catch((e) => {
  console.error('✗ failed:', e.message ?? e);
  process.exit(1);
});
