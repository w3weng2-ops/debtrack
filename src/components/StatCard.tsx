import type { LucideIcon } from "lucide-react";
import { cx } from "../lib/classes";

interface StatCardProps {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
}

const tones = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
  green: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function StatCard({ label, value, helper, icon: Icon, tone = "blue" }: StatCardProps) {
  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="muted-label">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-normal text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className={cx("rounded-xl p-3", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {helper ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{helper}</p> : null}
    </section>
  );
}
