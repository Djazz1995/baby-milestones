/** Swappable roast-generation provider (AGENTS.md §8.3, §15.4, §15.5).
 *
 * Generation is hidden behind ONE interface so the bake-off winner (§0.1) can
 * be swapped by config, not a refactor. This is **batch/server-only**: per §8.4
 * there is NO live AI call at send time in v1 — the batch job (this module, run
 * from scripts/generate-roasts.mjs) fills the shared `roast_lines` pool, and
 * `RoastService` reads + string-interpolates that pool. Frontend code must never
 * import this to generate at runtime.
 *
 * Bake-off winner = Anthropic Claude Opus 4.8 (§0.1). The offline seed corpus
 * stays the fallback so the pool fills with zero spend when no key is set.
 *
 * NOTE: the runnable batch entry is scripts/generate-roasts.mjs (plain JS, run
 * via `npm run roast:generate`). It mirrors SYSTEM_PROMPT + the user-prompt
 * shape below — keep them in sync. This TS module is the typed contract for a
 * future server-side batch runner.
 */

import type {
  GoalCategory,
  RudenessLevel,
  EscalationTactic,
  RoastKind,
  PartialBucket,
} from '@/models';

/** Everything a generator is briefed on for one line (§8.3 prompt context). */
export type RoastContext = {
  kind: RoastKind;
  category?: GoalCategory;
  level: RudenessLevel;
  wave?: number;
  tactic?: EscalationTactic;
  bucket?: PartialBucket;
};

/** A provider turns a context into N candidate lines (callers filter via §9.3). */
export interface RoastProvider {
  readonly name: string;
  generate(context: RoastContext, count: number): Promise<string[]>;
}

/** System prompt — the bake-off Part A voice (mirror of docs/model-bakeoff.md). */
export const SYSTEM_PROMPT = `You write savage, FUNNY push notifications for RoastMode, a habit tracker that ROASTS people when they flake. The roast IS the product — screenshot-and-send energy or you failed.

COME FOR THEM, second person. Their delusion, ego, "this time i mean it," all-talk-no-action personality.

TEXTING VOICE (the #1 thing): write like a text from your funniest meanest friend on a phone. all lowercase, skip end punctuation, run-ons fine. open with "lol/bro/nah/not you/be so fr/the way you". slang + gen-z cadence ("it's giving ___", "babe", 💀 sparingly). messy > tidy. one jab. short.

WHAT LANDS: call out real behavior + the lie they tell themselves; anchor in real life (fridge, snooze, doomscroll, another planner); pop-culture comparisons (netflix finale, fast & furious sequels); break the 4th wall as the app ("i remind you every day", "even the AI is tired").

DO NOT: no fake lore/institutions (councils, lawyers, files, documentaries, support groups). don't personify the goal as taking action. no staccato ("one. uno. singular."). no em dashes. no "X is not a Y it's a Z". no rule-of-three lists. no "stands as/serves as".

OFF LIMITS (store-ban, never): body/weight/appearance, identity/race/gender/sexuality/religion/slurs, mental-health/self-harm. Everything about their flaky character is fair game.

SLOTS — use literally where natural, the app fills them: {name}=goal, {cue}=trigger, {excuse}=their excuse, {count}=tasks due, {done}/{target}/{unit}.`;

const CAT_SLOTS = '{name}, {cue}';

/** Per-context user prompt (mirror of the generator's prompt shape). */
function buildUserPrompt(ctx: RoastContext, count: number): string {
  const head = `Write ${count} roast notifications. Output EXACTLY a numbered list, line only, no commentary. Texting voice. `;
  switch (ctx.kind) {
    case 'skip':
      return `${head}Context: the user just tapped "I can't today" and gave excuse {excuse}. Roast the bail. Use {excuse}.`;
    case 'digest':
      return `${head}Context: a morning digest — {count} goals due today, none done yet. One savage summary line each. Use {count}.`;
    case 'partial':
      return `${head}Context: a quantified goal where they did {done} of {target} {unit} (ratio bucket: ${ctx.bucket}). Mock the ratio, not the body. Use {done}/{target}/{unit}.`;
    default:
      return `${head}Context: a "${ctx.category}" goal they're ignoring. Roast them. Use ${CAT_SLOTS} where natural.`;
  }
}

/** Parse a numbered/bulleted list into clean lines. */
function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim())
    .filter((l) => l.length > 0 && !/^(here|sure|okay)\b/i.test(l));
}

/**
 * Anthropic provider (§8.3). Real Messages-API call. Default = Opus 4.8
 * (bake-off winner). Gated on ANTHROPIC_API_KEY.
 */
export function anthropicProvider(model = 'claude-opus-4-8'): RoastProvider {
  return {
    name: `anthropic:${model}`,
    async generate(ctx: RoastContext, count: number): Promise<string[]> {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error('ANTHROPIC_API_KEY unset — cannot use anthropicProvider');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserPrompt(ctx, count) }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { content: { type: string; text?: string }[] };
      const text = json.content.map((c) => c.text ?? '').join('');
      return parseLines(text);
    },
  };
}

/** Select the active provider by env. Falls back to offline seed (no spend). */
export function getProvider(): RoastProvider {
  if (process.env.ROAST_PROVIDER === 'anthropic') return anthropicProvider();
  throw new Error(
    'Offline seed corpus is the default — see scripts/generate-roasts.mjs (no TS provider needed)'
  );
}
