import { cx } from "../lib/classes";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));

  return (
    <div className={cx("h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800", className)}>
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-500"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
