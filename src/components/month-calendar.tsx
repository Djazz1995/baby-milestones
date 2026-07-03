import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
/** Local `YYYY-MM-DD` for a date (no UTC shift). */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function monthWeeks(view: Date): Date[][] {
  const first = startOfMonth(view);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const cells = Array.from(
    { length: 42 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  );
  return Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

type Props = {
  /** Selected dates as `YYYY-MM-DD`. */
  selected: string[];
  onToggle: (date: string) => void;
  /** Dates strictly before this day are disabled (e.g. today → no past). */
  minDate?: Date;
};

/** Multi-select month calendar with month navigation. Past disabled via minDate. */
export function MonthCalendar({ selected, onToggle, minDate }: Props) {
  const [view, setView] = useState(() => startOfMonth(new Date()));
  const weeks = monthWeeks(view);
  const sel = new Set(selected);
  const today = new Date();
  const minFloor = minDate ? startOfDay(minDate).getTime() : -Infinity;

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} hitSlop={12} style={styles.navBtn}>
          <ThemedText style={styles.navArrow}>‹</ThemedText>
        </Pressable>
        <ThemedText type="bodyStrong">
          {MONTHS[view.getMonth()]} {view.getFullYear()}
        </ThemedText>
        <Pressable onPress={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} hitSlop={12} style={styles.navBtn}>
          <ThemedText style={styles.navArrow}>›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w) => (
          <ThemedText key={w} type="caption" color="muted" style={styles.weekdayCell}>
            {w}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((d) => {
            const inMonth = d.getMonth() === view.getMonth();
            const isToday = startOfDay(d).getTime() === startOfDay(today).getTime();
            const isSel = sel.has(ymd(d));
            const disabled = startOfDay(d).getTime() < minFloor;
            return (
              <Pressable
                key={d.toISOString()}
                disabled={disabled}
                onPress={() => onToggle(ymd(d))}
                style={styles.cell}
              >
                <View style={[styles.cellInner, isSel && styles.cellSelected, isToday && !isSel && styles.cellToday]}>
                  <ThemedText
                    type="caption"
                    style={[isSel && styles.cellTextSel, (!inMonth || disabled) && styles.cellTextDim]}
                  >
                    {d.getDate()}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.two },
  navBtn: { paddingHorizontal: Spacing.three },
  navArrow: { fontSize: 24, fontWeight: '600', color: '#3c87f7' },
  weekdayRow: { flexDirection: 'row', marginBottom: Spacing.one },
  weekdayCell: { flex: 1, textAlign: 'center' },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.one },
  cellInner: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { backgroundColor: '#3c87f7' },
  cellToday: { borderWidth: 1, borderColor: '#3c87f7' },
  cellTextSel: { color: '#fff', fontWeight: '700' },
  cellTextDim: { opacity: 0.3 },
});
