/** Tanggal kalender bandara harus dihitung di WITA, bukan zona waktu perangkat. */
export function todayWita(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function flightDateStatus(date: string | null | undefined, now: Date): 'today' | 'yesterday' | 'older' | 'future' | 'unknown' {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'unknown';
  const today = todayWita(now);
  if (date === today) return 'today';
  if (date > today) return 'future';

  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return date === yesterday.toISOString().slice(0, 10) ? 'yesterday' : 'older';
}
