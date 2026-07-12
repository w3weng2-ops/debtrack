const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function daysBetween(start: Date, end: Date) {
  const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.ceil((endOnly.getTime() - startOnly.getTime()) / DAY_IN_MS);
}

export function isSameMonth(date: Date, comparison: Date) {
  return date.getFullYear() === comparison.getFullYear() && date.getMonth() === comparison.getMonth();
}

export function monthsBetween(start: Date, end: Date) {
  return Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1,
  );
}
