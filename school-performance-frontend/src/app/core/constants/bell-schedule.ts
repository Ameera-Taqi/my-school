/** One teaching period on the official school bell. */
export interface BellPeriod {
  period: number;
  start: string;
  end: string;
}

/**
 * Official bell for the seven teaching periods.
 * Morning assembly (07:45–07:55), the first break (10:20–10:35),
 * and the prayer break (12:10–12:20) sit in the gaps and are not periods.
 */
/** Morning lineup, before the first teaching period. */
export const MORNING_ASSEMBLY = { start: '07:45', end: '07:55' };

export function morningAssemblyRange(): string {
  return `${MORNING_ASSEMBLY.start}–${MORNING_ASSEMBLY.end}`;
}

export const BELL_PERIODS: readonly BellPeriod[] = [
  { period: 1, start: '07:55', end: '08:40' },
  { period: 2, start: '08:45', end: '09:30' },
  { period: 3, start: '09:35', end: '10:20' },
  { period: 4, start: '10:35', end: '11:20' },
  { period: 5, start: '11:25', end: '12:10' },
  { period: 6, start: '12:20', end: '13:05' },
  { period: 7, start: '13:10', end: '13:55' }
];

export function periodRange(period: number): string {
  const slot = BELL_PERIODS[period - 1];
  return slot ? `${slot.start}–${slot.end}` : '';
}

export function currentPeriod(now = new Date()): number | null {
  return BELL_PERIODS.find(slot => isPeriodNow(slot.period, now))?.period ?? null;
}

export function isPeriodNow(period: number, now = new Date()): boolean {
  const slot = BELL_PERIODS[period - 1];
  if (!slot) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= minutesOf(slot.start) && minutes < minutesOf(slot.end);
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
