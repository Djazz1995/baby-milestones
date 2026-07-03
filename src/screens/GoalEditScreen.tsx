import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/kit';
import { ESCALATION_LOCKED, LOCKED_ESCALATION, LOCKED_RUDENESS, RUDENESS_LOCKED } from '@/lib/config';
import { useBilling } from '@/hooks/use-billing';
import { useGoal } from '@/hooks/use-goal';
import { useUser } from '@/hooks/use-user';
import type { EscalationSpeed, GoalCategory, RudenessLevel, Schedule } from '@/models';
import { goalService } from '@/services/goalService';
import { notificationService } from '@/services/notificationService';
import { tokens } from '@/theme/tokens';

import {
  BlockersBlock,
  BuddyBlock,
  CollectionBlock,
  CueBlock,
  EscalationBlock,
  MeasureBlock,
  RudenessBlock,
  ScheduleBlock,
  type MeasureValue,
} from './goal-form/blocks';
import { CATEGORIES, GOAL_TYPES, scheduleFromDefaults } from './goal-form/config';
import { CategoryPillRow, Field } from './goal-form/fields';

const GYM = GOAL_TYPES.gym.defaults;

type Props = { goalId?: string };

export function GoalEditScreen({ goalId }: Props) {
  const router = useRouter();
  const { data: existing } = useGoal(goalId);
  const { data: user } = useUser();
  const { canAddGoal, canUseRudeness, canUseBuddy } = useBilling();
  const appliedDefaults = useRef(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<GoalCategory>('gym');
  const [cue, setCue] = useState('');
  const [blockers, setBlockers] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<Schedule>(() => scheduleFromDefaults(GYM));
  const [measure, setMeasure] = useState<MeasureValue>({ enabled: false, target: '', unit: '' });
  const [rudeness, setRudeness] = useState<RudenessLevel>(RUDENESS_LOCKED ? LOCKED_RUDENESS : 3);
  const [speed, setSpeed] = useState<EscalationSpeed>(
    ESCALATION_LOCKED ? LOCKED_ESCALATION : 'normal'
  );
  const [buddyId, setBuddyId] = useState<string>();
  const [collectionId, setCollectionId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  // Prefill when editing.
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setCategory(existing.category);
    setCue(existing.cue ?? '');
    setBlockers(existing.blockers);
    setSchedule(existing.schedule);
    setMeasure({
      enabled: existing.targetValue != null,
      target: existing.targetValue != null ? String(existing.targetValue) : '',
      unit: existing.unit ?? '',
    });
    if (!RUDENESS_LOCKED) setRudeness(existing.rudenessLevel);
    if (!ESCALATION_LOCKED) setSpeed(existing.escalationSpeed);
    setBuddyId(existing.buddyId);
    setCollectionId(existing.collectionId);
  }, [existing]);

  // New goals inherit the user's global defaults (§7.2). Once, before edits.
  useEffect(() => {
    if (goalId || !user || appliedDefaults.current) return;
    appliedDefaults.current = true;
    if (!RUDENESS_LOCKED) setRudeness(user.defaults.rudenessLevel);
    if (!ESCALATION_LOCKED) setSpeed(user.defaults.escalationSpeed);
  }, [goalId, user]);

  const descriptor = GOAL_TYPES[category];
  const has = (id: string) => descriptor.blocks.includes(id as never);

  /** Reshape the form to a category's sensible defaults (still editable). */
  function onSelectCategory(c: GoalCategory) {
    setCategory(c);
    const t = GOAL_TYPES[c];
    setSchedule(scheduleFromDefaults(t.defaults));
    setMeasure({
      enabled: t.blocks.includes('measure') && t.defaults.trackAmount,
      target: t.defaults.defaultTarget != null ? String(t.defaults.defaultTarget) : '',
      unit: t.defaults.defaultUnit ?? '',
    });
  }

  async function onSave() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (
      schedule.weeklyTarget == null &&
      schedule.slots.length === 0 &&
      (schedule.dates?.length ?? 0) === 0
    ) {
      setError('Add at least one reminder.');
      return;
    }
    let parsedTarget: number | undefined;
    if (has('measure') && measure.enabled && measure.target.trim()) {
      const n = Number(measure.target);
      if (Number.isNaN(n) || n <= 0) {
        setError('Target must be a positive number.');
        return;
      }
      parsedTarget = n;
    }
    // Paywall gates (§12). All resolve allowed when monetization is off.
    const toPaywall = (reason: string) => {
      router.push({ pathname: '/paywall', params: { reason } });
    };
    if (!goalId) {
      const g = await canAddGoal();
      if (!g.allowed) return toPaywall(g.reason);
    }
    const rg = await canUseRudeness(rudeness);
    if (!rg.allowed) return toPaywall(rg.reason);
    if (buddyId) {
      const bg = await canUseBuddy();
      if (!bg.allowed) return toPaywall(bg.reason);
    }

    setSaving(true);
    setError(undefined);
    const input = {
      name: name.trim(),
      category,
      cue: cue.trim() || undefined,
      blockers,
      schedule,
      rudenessLevel: rudeness,
      escalationSpeed: speed,
      buddyId,
      collectionId,
      targetValue: parsedTarget,
      unit: parsedTarget != null && measure.unit.trim() ? measure.unit.trim() : undefined,
    };
    try {
      const saved = goalId
        ? await goalService.update(goalId, input)
        : await goalService.create(input);
      await notificationService.scheduleForGoal(saved);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenLayout
      edges={['bottom']}
      footer={
        <PrimaryButton
          title={goalId ? 'Save' : 'Create goal'}
          onPress={onSave}
          loading={saving}
        />
      }
    >
      <View style={{ gap: 22, paddingTop: 8 }}>
        <Field label="goal name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={descriptor.defaults.namePlaceholder ?? 'Read 20 pages'}
            placeholderTextColor={tokens.off}
            style={{ fontSize: 22, fontWeight: '700', color: tokens.fg, paddingVertical: 4 }}
          />
        </Field>

        <Field label="category">
          <CategoryPillRow options={CATEGORIES} selected={category} onSelect={onSelectCategory} />
        </Field>

        {has('cue') ? (
          <CueBlock value={cue} onChange={setCue} placeholder={descriptor.defaults.cuePlaceholder} />
        ) : null}
        {has('blockers') ? <BlockersBlock value={blockers} onChange={setBlockers} /> : null}
        {has('schedule') ? (
          <ScheduleBlock
            value={schedule}
            onChange={setSchedule}
            category={category}
            defaults={descriptor.defaults}
          />
        ) : null}
        {has('measure') ? <MeasureBlock value={measure} onChange={setMeasure} /> : null}
        {has('rudeness') && !RUDENESS_LOCKED ? (
          <RudenessBlock value={rudeness} onChange={setRudeness} />
        ) : null}
        {has('escalation') && !ESCALATION_LOCKED ? (
          <EscalationBlock value={speed} onChange={setSpeed} />
        ) : null}
        {has('buddy') ? <BuddyBlock value={buddyId} onChange={setBuddyId} /> : null}
        {has('collection') ? <CollectionBlock value={collectionId} onChange={setCollectionId} /> : null}

        {error ? (
          <ThemedText type="caption" color="danger">
            {error}
          </ThemedText>
        ) : null}
      </View>
    </ScreenLayout>
  );
}
