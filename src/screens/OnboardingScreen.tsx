import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { BruteLogo } from '@/components/brute-logo';
import { Card, CategoryIcon, GhostButton, PrimaryButton, TextButton } from '@/components/kit';
import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import {
  ESCALATION_LOCKED,
  LOCKED_ESCALATION,
  LOCKED_RUDENESS,
  RUDENESS_LOCKED,
} from '@/lib/config';
import type { EscalationSpeed, GoalCategory, RudenessLevel, Schedule } from '@/models';
import { goalService } from '@/services/goalService';
import { notificationService } from '@/services/notificationService';
import { userService } from '@/services/userService';
import { tokens } from '@/theme/tokens';

import { GOAL_TYPES } from './goal-form/config';

type Step = 'welcome' | 'consent' | 'defaults' | 'push' | 'goal';
// The "defaults" step only has the rudeness/escalation pickers — drop it when
// both are locked (nothing to configure).
const SHOW_DEFAULTS = !(RUDENESS_LOCKED && ESCALATION_LOCKED);
const ORDER: Step[] = [
  'welcome',
  'consent',
  ...(SHOW_DEFAULTS ? (['defaults'] as Step[]) : []),
  'push',
  'goal',
];

/** Tone options for the defaults step — each wired to a RudenessLevel. */
const TONES: { level: RudenessLevel; name: string; quote: string }[] = [
  { level: 1, name: 'Mild disappointment', quote: 'Oh. You didn’t go again. Cool, cool.' },
  { level: 2, name: 'Drill sergeant', quote: 'GET UP. TIE THE SHOES. MOVE.' },
  { level: 3, name: 'Full roast', quote: 'Skipped again? Bold of you to assume I wouldn’t notice.' },
  { level: 4, name: 'Unhinged', quote: 'I’ve seen prisoners with more discipline than you.' },
];

/** First-goal habit templates (§14.1 / Phase 8) — one tap to a real goal. */
const TEMPLATES: {
  key: string;
  category: GoalCategory;
  name: string;
  subtitle: string;
}[] = [
  { key: 'gym', category: 'gym', name: 'Gym', subtitle: 'You bought the membership. Revolutionary concept: using it.' },
  { key: 'water', category: 'water', name: 'Drink water', subtitle: 'You’re 60% water and 100% dehydrated.' },
  { key: 'read', category: 'study', name: 'Read', subtitle: 'Your “to-read” list is a graveyard. Dig one up.' },
  { key: 'chores', category: 'chores', name: 'Tidy up', subtitle: 'That chair isn’t a closet.' },
];

/** Concrete Schedule from a category's prefill defaults (fixed gets real slots). */
function templateSchedule(category: GoalCategory): Schedule {
  const cfg = GOAL_TYPES[category].defaults;
  if (cfg.scheduleMode === 'weekly') return { slots: [], weeklyTarget: cfg.weeklyTarget ?? 3 };
  const days = cfg.defaultDays ?? [1, 3, 5];
  const time = cfg.defaultTime ?? '09:00';
  return { slots: days.map((day) => ({ day, time })) };
}

/** 5-dot progress row — active dot is an 18px accent1 pill, rest 6px rim dots. */
function ProgressDots({ active }: { active: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 4 }}>
      {ORDER.map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === active ? tokens.accent1 : tokens.rim,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Cold-start onboarding (§14.1): welcome → harsh-humor consent (§9.1) → default
 * tone → push permission → first goal (habit templates). Finishing flips the
 * `onboarded` flag and drops the user on Home.
 */
export function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [rudeness, setRudeness] = useState<RudenessLevel>(RUDENESS_LOCKED ? LOCKED_RUDENESS : 3);
  const [speed] = useState<EscalationSpeed>(ESCALATION_LOCKED ? LOCKED_ESCALATION : 'normal');
  const [busy, setBusy] = useState(false);

  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)]);

  async function saveDefaults() {
    setBusy(true);
    try {
      await userService.updateDefaults({ rudenessLevel: rudeness, escalationSpeed: speed });
      next();
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function requestPush() {
    setBusy(true);
    try {
      await notificationService.init(); // no-op on web; granted/denied both proceed
    } finally {
      setBusy(false);
      next();
    }
  }

  /** Finish onboarding and land on Home. */
  async function finish() {
    setBusy(true);
    try {
      await userService.completeOnboarding();
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Could not finish', (e as Error).message);
      setBusy(false);
    }
  }

  async function pickTemplate(category: GoalCategory, name: string) {
    setBusy(true);
    try {
      const cfg = GOAL_TYPES[category].defaults;
      const saved = await goalService.create({
        name,
        category,
        schedule: templateSchedule(category),
        rudenessLevel: rudeness,
        escalationSpeed: speed,
        blockers: [],
        targetValue: cfg.trackAmount ? cfg.defaultTarget : undefined,
        unit: cfg.trackAmount ? cfg.defaultUnit : undefined,
      });
      await notificationService.scheduleForGoal(saved);
      await finish();
    } catch (e) {
      Alert.alert('Could not create goal', (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <ScreenLayout scroll={step === 'goal'} edges={['top', 'bottom']}>
      {step === 'welcome' ? (
        <WelcomeStep active={idx} onNext={next} />
      ) : step === 'consent' ? (
        <ConsentStep active={idx} onNext={next} />
      ) : step === 'defaults' ? (
        <DefaultsStep active={idx} rudeness={rudeness} onPick={setRudeness} onNext={saveDefaults} busy={busy} />
      ) : step === 'push' ? (
        <PushStep active={idx} onAllow={requestPush} onSkip={next} busy={busy} />
      ) : (
        <GoalStep active={idx} onPick={pickTemplate} onLater={finish} busy={busy} />
      )}
    </ScreenLayout>
  );
}

/* ── Step 1 · Welcome ─────────────────────────────────────────────── */

function WelcomeStep({ active, onNext }: { active: number; onNext: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 24,
            backgroundColor: tokens.surface2,
            borderWidth: 1,
            borderColor: tokens.rim,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BruteLogo size={40} />
        </View>
        <ThemedText type="hero">brute</ThemedText>
        <ThemedText type="body" color="muted" style={{ textAlign: 'center' }}>
          A habit tracker with a mouth.
        </ThemedText>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              backgroundColor: tokens.surface2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BruteLogo size={12} />
          </View>
          <ThemedText type="bodyStrong">brute</ThemedText>
          <ThemedText type="caption" color="muted">
            · now
          </ThemedText>
        </View>
        <ThemedText type="body">
          Your gym shoes are by the door. They’re just sitting there. Staring at you.
        </ThemedText>
      </Card>

      <View style={{ gap: 16 }}>
        <ProgressDots active={active} />
        <PrimaryButton title="Let’s go" onPress={onNext} />
      </View>
    </View>
  );
}

/* ── Step 2 · Consent ─────────────────────────────────────────────── */

function ConsentStep({ active, onNext }: { active: number; onNext: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
      <ThemedText type="title">Read this first.</ThemedText>
      <ThemedText type="body" color="muted">
        brute roasts your excuses on purpose. Skip leg day, snooze the alarm four times, ghost your
        reading list, it’s going to say something, and it’s not going to be nice.
      </ThemedText>
      <ThemedText type="body" color="muted">
        It’s mean because that’s the point. Discomfort is the feature. You can mute the attitude
        anytime in settings.
      </ThemedText>

      <Card>
        <ThemedText type="eyebrow" color="accent1" style={{ marginBottom: 8 }}>
          HARD LIMITS
        </ThemedText>
        <ThemedText type="body">Never your body, looks, or worth, just your habits.</ThemedText>
      </Card>

      <View style={{ gap: 16 }}>
        <ProgressDots active={active} />
        <PrimaryButton title="I can take it" onPress={onNext} />
      </View>
    </View>
  );
}

/* ── Step 3 · Tone ────────────────────────────────────────────────── */

function DefaultsStep({
  active,
  rudeness,
  onPick,
  onNext,
  busy,
}: {
  active: number;
  rudeness: RudenessLevel;
  onPick: (level: RudenessLevel) => void;
  onNext: () => void;
  busy: boolean;
}) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
      <View style={{ gap: 8 }}>
        <ThemedText type="title">How hard should I go?</ThemedText>
        <ThemedText type="body" color="muted">
          You can change this later. Probably will.
        </ThemedText>
      </View>

      <View style={{ gap: 10 }}>
        {TONES.map((tone) => {
          const selected = tone.level === rudeness;
          return (
            <Card
              key={tone.level}
              onPress={() => onPick(tone.level)}
              style={{
                backgroundColor: selected ? tokens.surface2 : tokens.surface,
                borderColor: selected ? tokens.accent1 : tokens.rim,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <ThemedText type="bodyStrong" color={selected ? 'accent1' : 'fg'}>
                  {tone.name}
                </ThemedText>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: selected ? tokens.accent1 : tokens.rim,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected ? (
                    <View
                      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.accent1 }}
                    />
                  ) : null}
                </View>
              </View>
              <ThemedText type="caption" color="muted" style={{ marginTop: 6 }}>
                {tone.quote}
              </ThemedText>
            </Card>
          );
        })}
      </View>

      <View style={{ gap: 16 }}>
        <ProgressDots active={active} />
        <PrimaryButton title="Next" onPress={onNext} loading={busy} />
      </View>
    </View>
  );
}

/* ── Step 4 · Notifications ───────────────────────────────────────── */

function PushStep({
  active,
  onAllow,
  onSkip,
  busy,
}: {
  active: number;
  onAllow: () => void;
  onSkip: () => void;
  busy: boolean;
}) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
      <View style={{ gap: 8 }}>
        <ThemedText type="title">Turn on the heat.</ThemedText>
        <ThemedText type="body" color="muted">
          brute works through notifications. Allow them so it can actually nudge you, silence just
          means it’s judging you quietly instead.
        </ThemedText>
      </View>

      <View style={{ height: 150, justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: 24, right: 24, top: 0, opacity: 0.45, transform: [{ rotate: '-4deg' }] }}>
          <Card level={2} style={{ paddingVertical: 14 }}>
            <ThemedText type="caption" color="muted">
              brute · earlier
            </ThemedText>
          </Card>
        </View>
        <View style={{ position: 'absolute', left: 16, right: 16, top: 22, opacity: 0.7, transform: [{ rotate: '2.5deg' }] }}>
          <Card level={2} style={{ paddingVertical: 14 }}>
            <ThemedText type="caption" color="muted">
              brute · earlier
            </ThemedText>
          </Card>
        </View>
        <View style={{ position: 'absolute', left: 8, right: 8, top: 52 }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ThemedText type="bodyStrong">brute</ThemedText>
              <ThemedText type="caption" color="muted">
                · now
              </ThemedText>
            </View>
            <ThemedText type="body">Three days of silence. Bold strategy.</ThemedText>
          </Card>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <ProgressDots active={active} />
        <PrimaryButton title="Allow notifications" onPress={onAllow} loading={busy} />
        <GhostButton title="Not now" onPress={onSkip} disabled={busy} />
      </View>
    </View>
  );
}

/* ── Step 5 · First goal ──────────────────────────────────────────── */

function GoalStep({
  active,
  onPick,
  onLater,
  busy,
}: {
  active: number;
  onPick: (category: GoalCategory, name: string) => void;
  onLater: () => void;
  busy: boolean;
}) {
  return (
    <View style={{ flex: 1, gap: 16, paddingTop: 12 }}>
      <ThemedText type="title">What are we fixing first?</ThemedText>

      <View style={{ gap: 10 }}>
        {TEMPLATES.map((t) => (
          <Card key={t.key} onPress={() => onPick(t.category, t.name)} style={{ opacity: busy ? 0.5 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: tokens.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CategoryIcon category={t.category} size={20} color={tokens.accent1} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="bodyStrong">{t.name}</ThemedText>
                <ThemedText type="caption" color="muted" style={{ marginTop: 2 }}>
                  {t.subtitle}
                </ThemedText>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <View style={{ gap: 14, alignItems: 'center', marginTop: 4 }}>
        <ProgressDots active={active} />
        <TextButton title="I’ll set one up later" onPress={onLater} disabled={busy} />
      </View>
    </View>
  );
}
