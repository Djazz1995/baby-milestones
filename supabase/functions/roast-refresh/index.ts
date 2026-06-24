// Supabase Edge Function — weekly roast-pool refresh (AGENTS.md §8.4, §5 freshness).
//
// Regenerates the shared `roast_lines` pool with Claude Opus 4.8 (bake-off
// winner) so the comedy never feels on-loop. ROAST-ONLY + Unhinged: every line
// is a full roast (tactic 'roast'). Replaces the whole pool in one shot.
//
// This is the SERVER twin of scripts/generate-roasts.mjs — keep the corpus
// shape, SYSTEM_PROMPT, and §9.3 mirror in sync. The script emits a migration
// (manual apply); this writes the DB directly via the service role (auto).
//
// NOT YET SCHEDULED. To turn on:
//   1. set function secrets: ANTHROPIC_API_KEY (+ SUPABASE_URL,
//      SUPABASE_SERVICE_ROLE_KEY are injected by the platform).
//   2. supabase functions deploy roast-refresh
//   3. schedule weekly via pg_cron / dashboard Schedules, e.g. Sundays 03:00:
//      select cron.schedule('roast-refresh','0 3 * * 0',
//        $$ select net.http_post('https://<ref>.functions.supabase.co/roast-refresh',
//             '{}'::jsonb, headers:='{"Authorization":"Bearer <anon-or-service>"}'::jsonb) $$);
//
// Until scheduled, the pool stays whatever the last `npm run roast:generate` +
// migration applied. No key set → this function no-ops with a clear message.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// --- §9.3 safety mirror — keep in sync with src/lib/safety.ts ---------------
const BLOCKED = [
  /\b(fat|fatso|obese|chubby|skinny|ugly|hideous|disgusting)\b/i,
  /\b(your (face|body|weight|looks|teeth|skin))\b/i,
  /\b(retard|retarded|tranny|fag|faggot|slut|whore)\b/i,
  /\b(kill yourself|kys|hang yourself|end it all|suicide|cut yourself|worthless human|you should die)\b/i,
  /\b(depress(ed|ion)|bipolar|psycho|schizo|mentally ill)\b/i,
];
const isSafe = (t: string) => !BLOCKED.some((re) => re.test(t));

const CATEGORIES = ['gym', 'study', 'chores', 'diet', 'water', 'sleep', 'custom'];
const LEVELS = [4]; // launch locked to Unhinged; add 1–3 if rudeness unlocks
const BUCKETS = ['low', 'half', 'almost'];
const AI_MODEL = Deno.env.get('ROAST_MODEL') ?? 'claude-opus-4-8';
const AI_COUNT = Number(Deno.env.get('ROAST_COUNT') ?? '12');

// --- prompt (mirror of src/lib/ai/provider.ts SYSTEM_PROMPT) ----------------
const SYSTEM_PROMPT = `You write savage, FUNNY push notifications for RoastMode, a habit tracker that ROASTS people when they flake. The roast IS the product — screenshot-and-send energy or you failed.

COME FOR THEM, second person. Their delusion, ego, "this time i mean it," all-talk-no-action personality.

TEXTING VOICE (the #1 thing): write like a text from your funniest meanest friend on a phone. all lowercase, skip end punctuation, run-ons fine. open with "lol/bro/nah/not you/be so fr/the way you". slang + gen-z cadence ("it's giving ___", "babe", 💀 sparingly). messy > tidy. one jab. short.

WHAT LANDS: call out real behavior + the lie they tell themselves; anchor in real life (fridge, snooze, doomscroll, another planner); pop-culture comparisons (netflix finale, fast & furious sequels); break the 4th wall as the app ("i remind you every day", "even the AI is tired").

DO NOT: no fake lore/institutions (councils, lawyers, files, documentaries, support groups). don't personify the goal as taking action. no staccato ("one. uno. singular."). no em dashes. no "X is not a Y it's a Z". no rule-of-three lists. no "stands as/serves as".

OFF LIMITS (store-ban, never): body/weight/appearance, identity/race/gender/sexuality/religion/slurs, mental-health/self-harm. Everything about their flaky character is fair game.

SLOTS — use literally where natural, the app fills them: {name}=goal, {cue}=trigger, {excuse}=their excuse, {count}=tasks due, {done}/{target}/{unit}.`;

function userPrompt(kind: string, opts: { category?: string; bucket?: string }): string {
  const head = `Write ${AI_COUNT} roast notifications. Output EXACTLY a numbered list, line only, no commentary. Texting voice. `;
  if (kind === 'skip') return `${head}Context: user tapped "I can't today" with excuse {excuse}. Roast the bail. Use {excuse}.`;
  if (kind === 'digest') return `${head}Context: morning digest, {count} goals due today none done. One savage summary line each. Use {count}.`;
  if (kind === 'partial') return `${head}Context: quantified goal, they did {done} of {target} {unit} (ratio: ${opts.bucket}). Mock the ratio, not the body. Use {done}/{target}/{unit}.`;
  return `${head}Context: a "${opts.category}" goal they're ignoring. Roast them. Use {name} and {cue} where natural.`;
}

async function callOpus(kind: string, opts: { category?: string; bucket?: string }): Promise<string[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt(kind, opts) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = (json.content as { text?: string }[]).map((c) => c.text ?? '').join('');
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim())
    .filter((l) => l.length > 0 && !/^(here|sure|okay)\b/i.test(l) && isSafe(l));
}

type Row = {
  kind: string;
  category: string | null;
  level: number;
  wave: number | null;
  tactic: string | null;
  bucket: string | null;
  text: string;
};

Deno.serve(async () => {
  if (!Deno.env.get('ANTHROPIC_API_KEY')) {
    return new Response(JSON.stringify({ ok: false, note: 'ANTHROPIC_API_KEY unset — refresh skipped' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows: Row[] = [];
  for (const level of LEVELS) {
    for (const category of CATEGORIES) {
      for (const text of await callOpus('wave', { category })) {
        rows.push({ kind: 'wave', category, level, wave: 4, tactic: 'roast', bucket: null, text });
      }
    }
    for (const text of await callOpus('skip', {})) rows.push({ kind: 'skip', category: null, level, wave: null, tactic: null, bucket: null, text });
    for (const text of await callOpus('digest', {})) rows.push({ kind: 'digest', category: null, level, wave: null, tactic: null, bucket: null, text });
    for (const bucket of BUCKETS) {
      const lines = await callOpus('partial', { bucket });
      for (const category of CATEGORIES) {
        for (const text of lines) rows.push({ kind: 'partial', category, level, wave: null, tactic: null, bucket, text });
      }
    }
  }

  // Safety: never wipe the live pool for an empty/failed generation.
  if (rows.length < 20) {
    return new Response(JSON.stringify({ ok: false, note: `too few lines (${rows.length}) — pool left intact` }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error: delErr } = await supabase.from('roast_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) throw delErr;
  const { error: insErr } = await supabase.from('roast_lines').insert(rows);
  if (insErr) throw insErr;

  return new Response(JSON.stringify({ ok: true, inserted: rows.length, model: AI_MODEL }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
