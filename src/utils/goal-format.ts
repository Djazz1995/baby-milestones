import type { Goal, ScheduleSlot } from '@/models/goal';

const DOW_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "7:00 AM" from a "HH:mm" 24h string. */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * The one-line cadence label shown on goal cards / rows, e.g.
 * "Mon · Wed · Fri · 7am", "3× a week", "Everyday", "Daily · 6am".
 */
export function scheduleLabel(goal: Goal): string {
  const s = goal.schedule;
  if (s.dates?.length) {
    return `${s.dates.length} ${s.dates.length === 1 ? 'date' : 'dates'}`;
  }
  if (s.weeklyTarget) {
    return `${s.weeklyTarget}× a week`;
  }

  const slots = s.slots ?? [];
  if (slots.length === 0) return 'No schedule';

  const days = [...new Set(slots.map((x: ScheduleSlot) => x.day))].sort((a, b) => a - b);
  const times = [...new Set(slots.map((x: ScheduleSlot) => x.time))];
  const timePart = times.length === 1 ? shortTime(times[0]) : `${times.length} times`;

  if (days.length === 7) return `Everyday · ${timePart}`;
  const dayPart = days.map((d) => DOW_SHORT[d]).join(' · ');
  return `${dayPart} · ${timePart}`;
}

/** Compact time for cards: "7am", "6:30pm". */
function shortTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`;
}
