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
// RATE LIMIT / RUNTIME (read before scheduling): this makes ~51 Opus calls
// (7 wave + skip + digest + 7 cat × 3 partial + 7 cat × 3 weekly buckets). On a
// 5-req/min org limit the 13s throttle stretches the run past 11 min, which
// will exceed the Edge Function wall-clock cap. Before turning on, EITHER raise the Anthropic
// tier and set ROAST_THROTTLE_MS=0 (retry-on-429 stays as the backstop), OR
// run the batch elsewhere (the identical `npm run roast:generate` with
// ROAST_USE_AI=1) and apply its migration. The throttle/retry here just keeps a
// higher-tier run from tripping transient limits.
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

COME FOR THEM, second person. Their delusion, ego, "this time i mean it," all-talk-no-action personality. Roast the behavior and the excuse, never the person's worth.

VOICE (the #1 thing): plain-spoken American English, like a sharp friend who's calling you out in a normal message. Full, correct sentences with normal capitalization and punctuation. 2 to 4 sentences per roast. NO slang, NO "lol/bro/nah/babe/fr/it's giving", NO emoji, NO all-lowercase. The humor comes from matter-of-fact call-outs of the obvious ("The gym was open all day. You knew that. You didn't go anyway."), not from wordplay or hype.

STRUCTURE: front-load the punch — the FIRST sentence must land on its own, because notifications get clipped after ~1 line. Then 1-2 sentences of dry follow-through.

WHAT LANDS: call out real behavior + the lie they tell themselves; anchor in real life (fridge, snooze, doomscroll, another planner, the shoes by the door); occasional dry 4th-wall as the app ("I see both shifts", "I don't have anywhere else to be"). Deadpan over loud.

DO NOT: no fake lore/institutions (councils, lawyers, files, documentaries, support groups). Don't personify the goal as taking action. No writerly flourishes ("fully functional", "genuinely deranged", "truly inspiring commitment"). No "X is not a Y it's a Z" as a crutch. No forced rule-of-three lists.

OFF LIMITS (store-ban, never): body/weight/appearance, identity/race/gender/sexuality/religion/slurs, mental-health/self-harm. Everything about their flaky character is fair game.

SLOTS — use literally where natural, the app fills them: {name}=goal, {cue}=trigger, {excuse}=their excuse, {count}=tasks due, {done}/{target}/{unit}.`;

function userPrompt(kind: string, opts: { category?: string; bucket?: string }): string {
  const head = `Write ${AI_COUNT} roast notifications. Output EXACTLY a numbered list, one roast per line, no commentary. Plain-spoken American English, 2-4 full sentences each, punch in the first sentence. `;
  if (kind === 'skip') return `${head}Context: user tapped "I can't today" with excuse {excuse}. Roast the bail. Use {excuse}.`;
  if (kind === 'digest') return `${head}Context: morning digest, {count} goals due today, none done. One roast each summarizing the day ahead. Use {count}.`;
  if (kind === 'partial') return `${head}Context: a "${opts.category}" quantified goal — they did {done} of {target} {unit} (ratio bucket: ${opts.bucket}). Mock the ratio for THIS specific activity, not the body. Use {done}/{target}/{unit}.`;
  if (kind === 'weekly') return `${head}Context: a "${opts.category}" goal with a weekly target — they've done it {done} of {target} DAYS this week and are still short (ratio bucket: ${opts.bucket}). Roast the weekly shortfall and nudge them to finish the week. Use {done}/{target} (these are days, not a per-session amount).`;
  return `${head}Context: a "${opts.category}" goal they ignored and did not do. Roast them for not showing up. Use {name} and {cue} where natural.`;
}

// Org rate limit is 5 req/min on opus — space calls out and retry on 429/5xx so
// the unattended weekly run doesn't die on a rate-limit or transient error.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const THROTTLE_MS = Number(Deno.env.get('ROAST_THROTTLE_MS') ?? '13000');
const MAX_RETRIES = Number(Deno.env.get('ROAST_MAX_RETRIES') ?? '5');

async function callOpus(kind: string, opts: { category?: string; bucket?: string }): Promise<string[]> {
  await sleep(THROTTLE_MS); // stay under 5 req/min
  let json: { content: { text?: string }[] } | undefined;
  for (let attempt = 0; ; attempt++) {
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
    if (res.ok) {
      json = await res.json();
      break;
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_RETRIES) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(60000, 2 ** attempt * 1000);
    await sleep(waitMs);
  }
  const text = (json!.content as { text?: string }[]).map((c) => c.text ?? '').join('');
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
    // partial — per category, per ratio bucket (category-specific flavor)
    for (const category of CATEGORIES) {
      for (const bucket of BUCKETS) {
        for (const text of await callOpus('partial', { category, bucket })) {
          rows.push({ kind: 'partial', category, level, wave: null, tactic: null, bucket, text });
        }
      }
    }
    // weekly — per category, per ratio bucket (days-per-week frequency, §4.7)
    for (const category of CATEGORIES) {
      for (const bucket of BUCKETS) {
        for (const text of await callOpus('weekly', { category, bucket })) {
          rows.push({ kind: 'weekly', category, level, wave: null, tactic: null, bucket, text });
        }
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
