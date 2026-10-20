// fn — weekStart (Depth 0, pure). The first instant of the local calendar week that contains a
// date, for "this week vs earlier" grouping. Local time, not UTC; the week starts on Monday
// unless `firstDay` says otherwise (0 = Sunday ... 6 = Saturday). Returns a new Date.
export function weekStart(date: Date | number | string, firstDay: number = 1): Date {
  const d = new Date(date);
  const back = (d.getDay() - firstDay + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back, 0, 0, 0, 0);
}
