/** Swappable roast-generation provider (AGENTS.md §8.3, §15.4, §15.5).
 *
 * Generation is hidden behind ONE interface so the bake-off winner (§0.1) can
 * be swapped by config, not a refactor. This is **batch/server-only**: per §8.4
 * there is NO live AI call at send time in v1 — the batch job (this module, run
 * from scripts/generate-roasts.mjs) fills the shared `roast_lines` pool, and
 * `RoastService` reads + string-interpolates that pool. Frontend code must never
 * import this to generate at runtime.
 *
 * Default candidate = Anthropic Claude (§8.3), but the offline `seedProvider`
 * is the v1 default so the pool fills with zero spend while the bake-off is
 * still open. Switch with `ROAST_PROVIDER=anthropic` once a model is locked.
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

/**
 * Anthropic Claude provider (§8.3). Real Messages-API call; gated on
 * ANTHROPIC_API_KEY so the offline path stays the default until a model is
 * locked by the bake-off. Kept minimal — the batch runner owns prompts.
 */
export function anthropicProvider(model = 'claude-sonnet-4-6'): RoastProvider {
  return {
    name: `anthropic:${model}`,
    async generate(): Promise<string[]> {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error('ANTHROPIC_API_KEY unset — cannot use anthropicProvider');
      // Intentionally unimplemented in v1: bake-off (§0.1) not yet run, so no
      // model is committed. When locked, build the system prompt (golden rule
      // §3.1 + hard limits §6) + per-context user prompt here and POST to
      // /v1/messages. Output still passes the §9.3 filter in the batch runner.
      throw new Error('anthropicProvider not wired in v1 — pending bake-off (§0.1)');
    },
  };
}

/** Select the active provider by env. v1 default is offline seed (no spend). */
export function getProvider(): RoastProvider {
  if (process.env.ROAST_PROVIDER === 'anthropic') return anthropicProvider();
  throw new Error(
    'Offline seed corpus is the v1 default — see scripts/generate-roasts.mjs (no TS provider needed)'
  );
}
