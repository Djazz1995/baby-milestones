/** Goal-form field blocks. Each is self-contained; the screen renders the ones
 *  a goal type's descriptor lists (config.ts). Schedule/Measure are controlled
 *  over the saved value, so prefill-on-edit just flows through props.
 *
 *  Presentation only from design tokens, no raw hex, all text via ThemedText,
 *  toggles via the shared SegmentedControl. Form logic/state is preserved. */

import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, Pressable, TextInput, View } from 'react-native';

import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { Card, Icon, SegmentedControl } from '@/components/kit';
import { useBuddies } from '@/hooks/use-buddies';
import { useCollections } from '@/hooks/use-collections';
import type {
  EscalationSpeed,
  GoalCategory,
  RudenessLevel,
  Schedule,
  ScheduleSlot,
} from '@/models';
import { collectionService } from '@/services/collectionService';
import { tokens } from '@/theme/tokens';
import { formatTime } from '@/utils/goal-format';

import {
  CategoryConfig,
  LABEL_OPTIONS,
  RUDENESS,
  SPEEDS,
  WEEKDAYS,
  dateToTime,
  slotKey,
  slotText,
  timeToDate,
} from './config';
import { Field, fieldStyles as s, useInputStyle } from './fields';

/** Rudeness tier labels for the segmented control (§6). */
const RUDENESS_LABELS: Record<RudenessLevel, string> = {
  1: 'Mild',
  2: 'Drill sergeant',
  3: 'Full roast',
  4: 'Unhinged',
};

/** Escalation speed labels for the segmented control (§4.1). */
const SPEED_LABELS: Record<EscalationSpeed, string> = {
  slow: 'Slow',
  normal: 'Normal',
  unhinged: 'Unhinged',
};

// ── Cue ──────────────────────────────────────────────────────────────────
export function CueBlock({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const inputStyle = useInputStyle();
  return (
    <Field label="cue">
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? 'book on the nightstand'}
        placeholderTextColor={tokens.off}
        style={inputStyle}
      />
      <ThemedText type="caption" color="muted">
        the trigger that reminds you
      </ThemedText>
    </Field>
  );
}

// ── Blockers ─────────────────────────────────────────────────────────────
export function BlockersBlock({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const inputStyle = useInputStyle();
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft('');
  }

  return (
    <Field label="what usually stops you?">
      <ThemedText type="caption" color="muted">
        Your go-to excuses. We&apos;ll throw them back at you, the excuse, never you.
      </ThemedText>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder="too tired"
          placeholderTextColor={tokens.off}
          returnKeyType="done"
          style={[inputStyle, { flex: 1 }]}
        />
        <Pressable onPress={add} style={[s.dashedRow, { paddingVertical: 14, paddingHorizontal: 18 }]}>
          <Icon name="plus" size={18} color={tokens.accent1} />
        </Pressable>
      </View>
      {value.length > 0 ? (
        <View style={s.wrap}>
          {value.map((b) => (
            <Pressable key={b} onPress={() => onChange(value.filter((x) => x !== b))}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 8,
                  paddingLeft: 12,
                  paddingRight: 10,
                  borderRadius: 999,
                  backgroundColor: tokens.surface2,
                  borderWidth: 1,
                  borderColor: tokens.rim,
                }}
              >
                <ThemedText type="label">{b}</ThemedText>
                <Icon name="close" size={13} color={tokens.muted} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Field>
  );
}

// ── Schedule ─────────────────────────────────────────────────────────────
export function ScheduleBlock({
  value,
  onChange,
  category,
  defaults,
}: {
  value: Schedule;
  onChange: (s: Schedule) => void;
  category: GoalCategory;
  defaults: CategoryConfig;
}) {
  const mode: 'fixed' | 'weekly' | 'dates' = value.dates
    ? 'dates'
    : value.weeklyTarget != null
      ? 'weekly'
      : 'fixed';
  const slots = value.slots;
  const labelOptions = LABEL_OPTIONS[category];
  const datesTime = value.time ?? defaults.defaultTime ?? '09:00';

  // Day chips start at today and wrap (today → +6 days), so the picker reads
  // forward instead of always Mon-first. ISO weekday: 1 = Mon … 7 = Sun.
  const todayIso = ((new Date().getDay() + 6) % 7) + 1;
  const dayOrder = Array.from({ length: 7 }, (_, k) => ((todayIso - 1 + k) % 7) + 1);

  // Ephemeral builder state (which slot is being composed), not persisted.
  const [builderDays, setBuilderDays] = useState<number[]>(defaults.defaultDays ?? [1, 3, 5]);
  const [builderTime, setBuilderTime] = useState(
    labelOptions?.[0].time ?? defaults.defaultTime ?? '07:00'
  );
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(labelOptions?.[0].label);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeDraft, setTimeDraft] = useState<Date>(() => timeToDate(builderTime));
  // Separate picker for the shared "specific dates" reminder time.
  const [showDatesTime, setShowDatesTime] = useState(false);
  const [datesTimeDraft, setDatesTimeDraft] = useState<Date>(() => timeToDate(datesTime));
  const [error, setError] = useState<string>();

  function setMode(next: 'fixed' | 'weekly' | 'dates') {
    // Each mode is exclusive; clear the others' fields.
    if (next === 'weekly') onChange({ slots: [], weeklyTarget: defaults.weeklyTarget ?? 3 });
    else if (next === 'dates') onChange({ slots: [], dates: [], time: defaults.defaultTime ?? '09:00' });
    else onChange({ slots });
  }

  function setWeekly(n: number) {
    onChange({ slots: [], weeklyTarget: n });
  }

  function toggleDate(date: string) {
    const cur = value.dates ?? [];
    const next = cur.includes(date) ? cur.filter((d) => d !== date) : [...cur, date].sort();
    onChange({ slots: [], dates: next, time: datesTime });
  }

  function toggleBuilderDay(d: number) {
    setBuilderDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  function addSlots() {
    if (builderDays.length === 0) {
      setError('Pick at least one day first.');
      return;
    }
    setError(undefined);
    const next = [...slots];
    for (const day of builderDays) {
      const slot: ScheduleSlot = selectedLabel
        ? { day, time: builderTime, label: selectedLabel }
        : { day, time: builderTime };
      if (!next.some((x) => slotKey(x) === slotKey(slot))) next.push(slot);
    }
    next.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    onChange({ slots: next });
  }

  function removeSlot(slot: ScheduleSlot) {
    const next = slots.filter((x) => slotKey(x) !== slotKey(slot));
    onChange({ slots: next });
  }

  // The day/time builder is fixed-schedule only; weekly is a pure day count.
  const showBuilder = mode === 'fixed';

  return (
    <Field label="cadence" gap={14}>
      <SegmentedControl
        options={[
          { value: 'fixed', label: 'Fixed days' },
          { value: 'weekly', label: 'Times per week' },
          { value: 'dates', label: 'Dates' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'dates' ? (
        <>
          <ThemedText type="caption" color="muted">
            Pick the exact dates, any time you like. Each date is its own check-off.
          </ThemedText>
          <MonthCalendar selected={value.dates ?? []} onToggle={toggleDate} minDate={new Date()} />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <ThemedText type="caption" color="muted" style={{ flex: 1 }}>
              {(value.dates ?? []).length} date{(value.dates ?? []).length === 1 ? '' : 's'} · reminder at
            </ThemedText>
            <Pressable
              onPress={() => {
                setDatesTimeDraft(timeToDate(datesTime));
                setShowDatesTime(true);
              }}
              style={[s.row, { paddingVertical: 12, paddingHorizontal: 16 }]}
            >
              <ThemedText type="bodyStrong">{formatTime(datesTime)}</ThemedText>
            </Pressable>
          </View>
          {Platform.OS === 'ios' ? (
            <Modal visible={showDatesTime} transparent animationType="slide">
              <Pressable style={modalBackdrop} onPress={() => setShowDatesTime(false)}>
                <Pressable>
                  <View style={modalSheet}>
                    <View style={modalHeader}>
                      <Pressable onPress={() => setShowDatesTime(false)}>
                        <ThemedText type="label" color="muted">
                          Cancel
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          onChange({ slots: [], dates: value.dates ?? [], time: dateToTime(datesTimeDraft) });
                          setShowDatesTime(false);
                        }}
                      >
                        <ThemedText type="label" color="accent1">
                          Done
                        </ThemedText>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={datesTimeDraft}
                      mode="time"
                      display="spinner"
                      textColor={tokens.fg}
                      onChange={(_, date) => date && setDatesTimeDraft(date)}
                    />
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          ) : showDatesTime ? (
            <DateTimePicker
              value={datesTimeDraft}
              mode="time"
              is24Hour
              display="default"
              onChange={(event, date) => {
                setShowDatesTime(false);
                if (event.type === 'set' && date)
                  onChange({ slots: [], dates: value.dates ?? [], time: dateToTime(date) });
              }}
            />
          ) : null}
        </>
      ) : null}

      {mode === 'weekly' ? (
        <>
          <ThemedText type="caption" color="muted">
            Hit it this many days a week, any day. The streak counts weekly hits.
          </ThemedText>
          <Stepper
            value={value.weeklyTarget ?? 3}
            min={1}
            max={7}
            onChange={setWeekly}
            suffix={(value.weeklyTarget ?? 3) === 1 ? 'day / week' : 'days / week'}
          />
        </>
      ) : null}

      {showBuilder ? (
        <>
          <ThemedText type="caption" color="muted">
            {labelOptions
              ? 'Pick days, choose a type and time, then Add. Add only the ones you want.'
              : 'Pick days and a time, then Add. Add more for extra times.'}
          </ThemedText>

          <Field label="days" gap={10}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {dayOrder.map((iso) => {
                const on = builderDays.includes(iso);
                return (
                  <Pressable
                    key={iso}
                    onPress={() => toggleBuilderDay(iso)}
                    style={[
                      s.dayToggle,
                      on
                        ? { backgroundColor: tokens.accentSolid, borderColor: tokens.accentSolid }
                        : { backgroundColor: tokens.surface2, borderColor: tokens.rim },
                    ]}
                  >
                    <ThemedText
                      type="bodyStrong"
                      style={{ color: on ? tokens.accentText : tokens.muted }}
                    >
                      {WEEKDAYS[iso - 1][0]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {labelOptions ? (
            <View style={s.wrap}>
              {labelOptions.map((opt) => {
                const on = selectedLabel === opt.label;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => {
                      setSelectedLabel(opt.label);
                      setBuilderTime(opt.time);
                    }}
                    style={[
                      s.catPill,
                      on
                        ? { backgroundColor: tokens.accentSolid, borderColor: tokens.accentSolid }
                        : { backgroundColor: tokens.surface, borderColor: tokens.rim },
                    ]}
                  >
                    <ThemedText
                      type="label"
                      style={{ color: on ? tokens.accentText : tokens.muted }}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Field label="time" gap={10}>
            <View style={{ gap: 8 }}>
              {slots.length > 0
                ? slots.map((slot) => (
                    <View key={slotKey(slot)} style={s.row}>
                      <ThemedText type="bodyStrong" style={{ flex: 1 }}>
                        {slotRowText(slot)}
                      </ThemedText>
                      <Pressable onPress={() => removeSlot(slot)} hitSlop={8}>
                        <Icon name="close" size={18} color={tokens.muted} />
                      </Pressable>
                    </View>
                  ))
                : null}
              <Pressable
                onPress={() => {
                  setTimeDraft(timeToDate(builderTime));
                  setShowTimePicker(true);
                }}
                style={s.row}
              >
                <ThemedText type="bodyStrong" style={{ flex: 1 }}>
                  {formatTime(builderTime)}
                </ThemedText>
                <ThemedText type="caption" color="muted">
                  change
                </ThemedText>
              </Pressable>
              <Pressable onPress={addSlots} style={s.dashedRow}>
                <Icon name="plus" size={16} color={tokens.accent1} />
                <ThemedText type="label" color="accent1">
                  add time
                </ThemedText>
              </Pressable>
            </View>
          </Field>

          {error ? (
            <ThemedText type="caption" color="danger">
              {error}
            </ThemedText>
          ) : null}

          {Platform.OS === 'ios' ? (
            <Modal visible={showTimePicker} transparent animationType="slide">
              <Pressable style={modalBackdrop} onPress={() => setShowTimePicker(false)}>
                <Pressable>
                  <View style={modalSheet}>
                    <View style={modalHeader}>
                      <Pressable onPress={() => setShowTimePicker(false)}>
                        <ThemedText type="label" color="muted">
                          Cancel
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setBuilderTime(dateToTime(timeDraft));
                          setShowTimePicker(false);
                        }}
                      >
                        <ThemedText type="label" color="accent1">
                          Done
                        </ThemedText>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={timeDraft}
                      mode="time"
                      display="spinner"
                      textColor={tokens.fg}
                      onChange={(_, date) => date && setTimeDraft(date)}
                    />
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          ) : showTimePicker ? (
            <DateTimePicker
              value={timeDraft}
              mode="time"
              is24Hour
              display="default"
              onChange={(event, date) => {
                setShowTimePicker(false);
                if (event.type === 'set' && date) setBuilderTime(dateToTime(date));
              }}
            />
          ) : null}
        </>
      ) : null}
    </Field>
  );
}

/** A time row's display text: keeps the day + optional label, humanized time. */
function slotRowText(slot: ScheduleSlot): string {
  const base = slotText(slot); // "Mon Lunch 13:00"
  return base.replace(slot.time, formatTime(slot.time));
}

// ── Stepper (times-per-week) ─────────────────────────────────────────────
function Stepper({
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  const btn = (label: string, next: number, enabled: boolean) => (
    <Pressable
      disabled={!enabled}
      onPress={() => onChange(next)}
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tokens.surface2,
        borderWidth: 1,
        borderColor: tokens.rim,
        opacity: enabled ? 1 : 0.4,
      }}
    >
      <ThemedText type="heading" color="fg">
        {label}
      </ThemedText>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      {btn('–', Math.max(min, value - 1), value > min)}
      <View style={{ alignItems: 'center', minWidth: 40 }}>
        <ThemedText type="stat">{value}</ThemedText>
      </View>
      {btn('+', Math.min(max, value + 1), value < max)}
      {suffix ? (
        <ThemedText type="caption" color="muted" style={{ marginLeft: 2 }}>
          {suffix}
        </ThemedText>
      ) : null}
    </View>
  );
}

// ── Measure (quantified target) ──────────────────────────────────────────
export type MeasureValue = { enabled: boolean; target: string; unit: string };

export function MeasureBlock({
  value,
  onChange,
}: {
  value: MeasureValue;
  onChange: (v: MeasureValue) => void;
}) {
  const inputStyle = useInputStyle();
  return (
    <Field label="amount" gap={12}>
      <SegmentedControl
        options={[
          { value: 'off', label: 'Just done / skip' },
          { value: 'on', label: 'Track an amount' },
        ]}
        value={value.enabled ? 'on' : 'off'}
        onChange={(v) => onChange({ ...value, enabled: v === 'on' })}
      />
      {value.enabled ? (
        <>
          <ThemedText type="caption" color="muted">
            Goal each time, e.g. 20 pages / 2 L. You&apos;ll log how much when you mark it done.
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={value.target}
              onChangeText={(t) => onChange({ ...value, target: t })}
              placeholder="20"
              placeholderTextColor={tokens.off}
              keyboardType="numeric"
              style={[inputStyle, { flex: 1 }]}
            />
            <TextInput
              value={value.unit}
              onChangeText={(u) => onChange({ ...value, unit: u })}
              placeholder="pages"
              placeholderTextColor={tokens.off}
              style={[inputStyle, { flex: 1 }]}
            />
          </View>
        </>
      ) : null}
    </Field>
  );
}

// ── Rudeness / Escalation ────────────────────────────────────────────────
export function RudenessBlock({
  value,
  onChange,
}: {
  value: RudenessLevel;
  onChange: (v: RudenessLevel) => void;
}) {
  return (
    <Field label="rudeness">
      <SegmentedControl
        options={RUDENESS.map((r) => ({ value: r, label: RUDENESS_LABELS[r] }))}
        value={value}
        onChange={onChange}
      />
    </Field>
  );
}

export function EscalationBlock({
  value,
  onChange,
}: {
  value: EscalationSpeed;
  onChange: (v: EscalationSpeed) => void;
}) {
  return (
    <Field label="escalation speed">
      <SegmentedControl
        options={SPEEDS.map((sp) => ({ value: sp, label: SPEED_LABELS[sp] }))}
        value={value}
        onChange={onChange}
      />
    </Field>
  );
}

// ── Buddy ────────────────────────────────────────────────────────────────
export function BuddyBlock({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const router = useRouter();
  const { data: buddies } = useBuddies();
  const selected = buddies.find((b) => b.id === value);

  return (
    <Field label="accountability buddy">
      {buddies.length === 0 ? (
        <Card onPress={() => router.push('/buddy')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: tokens.surface2,
              borderWidth: 1,
              borderColor: tokens.rim,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="plus" size={18} color={tokens.muted} />
          </View>
          <ThemedText type="body" color="muted" style={{ flex: 1 }}>
            Add someone who&apos;ll see you flake
          </ThemedText>
          <Icon name="chevron" size={18} color={tokens.muted} />
        </Card>
      ) : (
        <>
          <Card
            onPress={() => router.push('/buddy')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: selected ? tokens.accentSolid : tokens.surface2,
                borderWidth: 1,
                borderColor: selected ? tokens.accentSolid : tokens.rim,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected ? (
                <ThemedText type="bodyStrong" style={{ color: tokens.accentText }}>
                  {selected.contact.slice(0, 1).toUpperCase()}
                </ThemedText>
              ) : (
                <Icon name="plus" size={18} color={tokens.muted} />
              )}
            </View>
            <ThemedText type="body" color={selected ? 'fg' : 'muted'} style={{ flex: 1 }}>
              {selected ? selected.contact : 'Add someone who’ll see you flake'}
            </ThemedText>
            <Icon name="chevron" size={18} color={tokens.muted} />
          </Card>
          <View style={s.wrap}>
            <BuddyPick label="None" active={!value} onPress={() => onChange(undefined)} />
            {buddies.map((b) => (
              <BuddyPick
                key={b.id}
                label={b.contact}
                active={value === b.id}
                onPress={() => onChange(b.id)}
              />
            ))}
          </View>
        </>
      )}
    </Field>
  );
}

function BuddyPick({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.catPill,
        active
          ? { backgroundColor: tokens.accentSolid, borderColor: tokens.accentSolid }
          : { backgroundColor: tokens.surface, borderColor: tokens.rim },
      ]}
    >
      <ThemedText type="label" style={{ color: active ? tokens.accentText : tokens.muted }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ── Collection ───────────────────────────────────────────────────────────
export function CollectionBlock({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const inputStyle = useInputStyle();
  const { data: collections, refetch } = useCollections();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();

  async function add() {
    const v = draft.trim();
    if (!v) return;
    setError(undefined);
    try {
      const created = await collectionService.create(v);
      setDraft('');
      await refetch();
      onChange(created.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Field label="collection">
      <ThemedText type="caption" color="muted">
        Group goals under a bigger ambition, e.g. &ldquo;Run a marathon&rdquo;.
      </ThemedText>
      <View style={s.wrap}>
        <BuddyPick label="None" active={!value} onPress={() => onChange(undefined)} />
        {collections.map((c) => (
          <BuddyPick key={c.id} label={c.name} active={value === c.id} onPress={() => onChange(c.id)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder="New collection"
          placeholderTextColor={tokens.off}
          returnKeyType="done"
          style={[inputStyle, { flex: 1 }]}
        />
        <Pressable onPress={add} style={[s.dashedRow, { paddingVertical: 14, paddingHorizontal: 18 }]}>
          <Icon name="plus" size={18} color={tokens.accent1} />
        </Pressable>
      </View>
      {error ? (
        <ThemedText type="caption" color="danger">
          {error}
        </ThemedText>
      ) : null}
    </Field>
  );
}

// Modal sheet styling (iOS time pickers), tokens only.
const modalBackdrop = {
  flex: 1,
  justifyContent: 'flex-end' as const,
  backgroundColor: 'rgba(0,0,0,0.5)',
};
const modalSheet = {
  paddingBottom: 24,
  paddingHorizontal: 16,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  backgroundColor: tokens.surface,
  borderWidth: 1,
  borderColor: tokens.rim,
};
const modalHeader = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  paddingVertical: 12,
};
