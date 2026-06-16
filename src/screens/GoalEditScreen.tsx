import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBuddies } from '@/hooks/use-buddies';
import { useGoal } from '@/hooks/use-goal';
import type { EscalationSpeed, GoalCategory, RudenessLevel, ScheduleSlot } from '@/models';
import { goalService } from '@/services/goalService';

const CATEGORIES: GoalCategory[] = ['gym', 'study', 'chores', 'diet', 'sleep', 'custom'];
const SPEEDS: EscalationSpeed[] = ['slow', 'normal', 'unhinged'];
const RUDENESS: RudenessLevel[] = [1, 2, 3, 4];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // index+1 = ISO day

/**
 * Category-specific reminder labels (with a sensible default time). When a
 * category has these, the builder shows a label picker so the user sets
 * day + type + time per reminder (e.g. skip breakfast, keep lunch).
 */
const LABEL_OPTIONS: Partial<Record<GoalCategory, { label: string; time: string }[]>> = {
  diet: [
    { label: 'Breakfast', time: '08:00' },
    { label: 'Lunch', time: '13:00' },
    { label: 'Dinner', time: '19:00' },
    { label: 'Snack', time: '16:00' },
  ],
  sleep: [
    { label: 'Wind-down', time: '22:00' },
    { label: 'Bedtime', time: '23:00' },
  ],
};

function slotKey(s: ScheduleSlot): string {
  return `${s.day}-${s.time}-${s.label ?? ''}`;
}

function slotText(s: ScheduleSlot): string {
  return `${WEEKDAYS[s.day - 1]} ${s.label ? `${s.label} ` : ''}${s.time}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

function timeToDate(t: string): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function dateToTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = { goalId?: string };

export function GoalEditScreen({ goalId }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const { data: existing } = useGoal(goalId);
  const { data: buddies } = useBuddies();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<GoalCategory>('gym');
  const [cue, setCue] = useState('');
  const [blockers, setBlockers] = useState<string[]>([]);
  const [blockerDraft, setBlockerDraft] = useState('');
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [builderDays, setBuilderDays] = useState<number[]>([1, 3, 5]);
  const [builderTime, setBuilderTime] = useState('07:00');
  const [selectedLabel, setSelectedLabel] = useState<string>();
  const [rudeness, setRudeness] = useState<RudenessLevel>(3);
  const [speed, setSpeed] = useState<EscalationSpeed>('normal');
  const [buddyId, setBuddyId] = useState<string>();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeDraft, setTimeDraft] = useState<Date>(() => timeToDate('07:00'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  function openTimePicker() {
    setTimeDraft(timeToDate(builderTime));
    setShowTimePicker(true);
  }

  // Prefill when editing.
  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setCategory(existing.category);
    setCue(existing.cue ?? '');
    setBlockers(existing.blockers);
    setSlots(existing.schedule.slots);
    setRudeness(existing.rudenessLevel);
    setSpeed(existing.escalationSpeed);
    setBuddyId(existing.buddyId);
  }, [existing]);

  // Default the builder's label + time to the category's first option.
  useEffect(() => {
    const opts = LABEL_OPTIONS[category];
    if (opts) {
      setSelectedLabel(opts[0].label);
      setBuilderTime(opts[0].time);
    } else {
      setSelectedLabel(undefined);
    }
  }, [category]);

  function selectLabel(opt: { label: string; time: string }) {
    setSelectedLabel(opt.label);
    setBuilderTime(opt.time);
  }

  function toggleBuilderDay(d: number) {
    setBuilderDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  function addSlotsFor(time: string, label?: string) {
    if (builderDays.length === 0) {
      setError('Pick at least one day first.');
      return;
    }
    setError(undefined);
    setSlots((cur) => {
      const next = [...cur];
      for (const day of builderDays) {
        const slot: ScheduleSlot = label ? { day, time, label } : { day, time };
        if (!next.some((s) => slotKey(s) === slotKey(slot))) next.push(slot);
      }
      return next.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    });
  }

  function removeSlot(slot: ScheduleSlot) {
    setSlots((cur) => cur.filter((s) => slotKey(s) !== slotKey(slot)));
  }

  function addBlocker() {
    const v = blockerDraft.trim();
    if (!v) return;
    setBlockers((cur) => (cur.includes(v) ? cur : [...cur, v]));
    setBlockerDraft('');
  }

  function removeBlocker(v: string) {
    setBlockers((cur) => cur.filter((x) => x !== v));
  }

  async function onSave() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (slots.length === 0) {
      setError('Add at least one reminder.');
      return;
    }
    setSaving(true);
    setError(undefined);
    const input = {
      name: name.trim(),
      category,
      cue: cue.trim() || undefined,
      blockers,
      schedule: { slots },
      rudenessLevel: rudeness,
      escalationSpeed: speed,
      buddyId,
    };
    try {
      if (goalId) await goalService.update(goalId, input);
      else await goalService.create(input);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Field label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Gym"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
          />
        </Field>

        <Field label="Category">
          <ChipRow
            options={CATEGORIES}
            selected={category}
            onSelect={(c) => setCategory(c)}
            label={(c) => c}
          />
        </Field>

        <Field label="Cue (optional)">
          <TextInput
            value={cue}
            onChangeText={setCue}
            placeholder="bag by the door"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
          />
        </Field>

        <Field label="What usually stops you? (optional)">
          <ThemedText type="small" themeColor="textSecondary">
            Your go-to excuses. We’ll throw them back at you — the excuse, never you.
          </ThemedText>
          <View style={styles.blockerEntry}>
            <TextInput
              value={blockerDraft}
              onChangeText={setBlockerDraft}
              onSubmitEditing={addBlocker}
              placeholder="too tired"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              style={[inputStyle, { flex: 1 }]}
            />
            <Button title="Add" variant="secondary" onPress={addBlocker} style={styles.addBtn} />
          </View>
          {blockers.length > 0 ? (
            <View style={styles.chips}>
              {blockers.map((b) => (
                <Pressable key={b} onPress={() => removeBlocker(b)}>
                  <ThemedView type="backgroundSelected" style={styles.chip}>
                    <ThemedText type="small">{b} ✕</ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Field>

        <Field label="Reminders">
          <ThemedText type="small" themeColor="textSecondary">
            {LABEL_OPTIONS[category]
              ? 'Pick days, choose a type and time, then Add. Add only the ones you want.'
              : 'Pick days and a time, then Add. Add more for extra times.'}
          </ThemedText>

          <View style={styles.chips}>
            {WEEKDAYS.map((w, i) => (
              <Chip
                key={w}
                text={w}
                active={builderDays.includes(i + 1)}
                onPress={() => toggleBuilderDay(i + 1)}
              />
            ))}
          </View>

          {LABEL_OPTIONS[category] ? (
            <View style={styles.chips}>
              {LABEL_OPTIONS[category]!.map((opt) => (
                <Chip
                  key={opt.label}
                  text={opt.label}
                  active={selectedLabel === opt.label}
                  onPress={() => selectLabel(opt)}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.blockerEntry}>
            <Pressable onPress={openTimePicker} style={{ flex: 1 }}>
              <ThemedView type="backgroundElement" style={[styles.input, styles.timeBox]}>
                <ThemedText type="default">{builderTime}</ThemedText>
              </ThemedView>
            </Pressable>
            <Button
              title="Add"
              variant="secondary"
              onPress={() => addSlotsFor(builderTime, selectedLabel)}
              style={styles.addBtn}
            />
          </View>

          {slots.length > 0 ? (
            <View style={styles.chips}>
              {slots.map((s) => (
                <Pressable key={slotKey(s)} onPress={() => removeSlot(s)}>
                  <ThemedView type="backgroundSelected" style={styles.chip}>
                    <ThemedText type="small">{slotText(s)} ✕</ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No reminders yet.
            </ThemedText>
          )}

          {Platform.OS === 'ios' ? (
            <Modal visible={showTimePicker} transparent animationType="slide">
              <Pressable style={styles.modalBackdrop} onPress={() => setShowTimePicker(false)}>
                <Pressable>
                  <ThemedView style={styles.modalSheet}>
                    <View style={styles.modalHeader}>
                      <Pressable onPress={() => setShowTimePicker(false)}>
                        <ThemedText type="link" themeColor="textSecondary">
                          Cancel
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setBuilderTime(dateToTime(timeDraft));
                          setShowTimePicker(false);
                        }}
                      >
                        <ThemedText type="linkPrimary">Done</ThemedText>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={timeDraft}
                      mode="time"
                      display="spinner"
                      onChange={(_, date) => date && setTimeDraft(date)}
                    />
                  </ThemedView>
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
        </Field>

        <Field label="Rudeness">
          <ChipRow
            options={RUDENESS}
            selected={rudeness}
            onSelect={(r) => setRudeness(r)}
            label={(r) => String(r)}
          />
        </Field>

        <Field label="Escalation speed">
          <ChipRow
            options={SPEEDS}
            selected={speed}
            onSelect={(s) => setSpeed(s)}
            label={(s) => s}
          />
        </Field>

        <Field label="Accountability buddy (optional)">
          {buddies.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No buddies yet — add one in Settings.
            </ThemedText>
          ) : (
            <View style={styles.chips}>
              <Chip text="None" active={!buddyId} onPress={() => setBuddyId(undefined)} />
              {buddies.map((b) => (
                <Chip
                  key={b.id}
                  text={b.contact}
                  active={buddyId === b.id}
                  onPress={() => setBuddyId(b.id)}
                />
              ))}
            </View>
          )}
        </Field>

        {error ? (
          <ThemedText type="small" style={{ color: '#E5484D' }}>
            {error}
          </ThemedText>
        ) : null}

        <Button
          title={goalId ? 'Save Changes' : 'Create Goal'}
          onPress={onSave}
          loading={saving}
          style={styles.save}
        />
      </ScrollView>
    </ThemedView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function ChipRow<T>({
  options,
  selected,
  onSelect,
  label,
  style,
}: {
  options: readonly T[];
  selected: T;
  onSelect: (v: T) => void;
  label: (v: T) => string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.chips, style]}>
      {options.map((o) => (
        <Chip key={String(o)} text={label(o)} active={o === selected} onPress={() => onSelect(o)} />
      ))}
    </View>
  );
}

function Chip({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <ThemedView
        type={active ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.chip, active && { borderColor: '#3c87f7', borderWidth: 1 }]}
      >
        <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
          {text}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  field: { gap: Spacing.two },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  timeBox: { justifyContent: 'center', minHeight: 48 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.three,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  blockerEntry: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  addBtn: { paddingHorizontal: Spacing.three, minHeight: 44 },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  save: { marginTop: Spacing.two },
});
