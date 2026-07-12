import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { Loan, LoanFormValues } from "../types";
import { toDateInputValue, addMonths, todayDate } from "../lib/date";
import { Button } from "./Button";

interface LoanFormProps {
  loan?: Loan;
  onSubmit: (values: LoanFormValues) => Promise<void> | void;
  onCancel: () => void;
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

const controlClass =
  "focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export function LoanForm({ loan, onSubmit, onCancel }: LoanFormProps) {
  const defaults = useMemo<LoanFormValues>(
    () => ({
      lender: loan?.lender ?? "",
      loanName: loan?.loanName ?? "",
      loanType: loan?.loanType ?? "Personal Loan",
      originalAmount: loan?.originalAmount ?? 0,
      interestRate: loan?.interestRate ?? 0,
      estimatedInterestAmount: loan?.estimatedInterestAmount ?? 0,
      installments: loan?.installments ?? 12,
      startDate: loan?.startDate ?? toDateInputValue(todayDate()),
      dueDate: loan?.dueDate ?? toDateInputValue(addMonths(todayDate(), 1)),
      remainingBalance: loan?.remainingBalance ?? 0,
      paymentFrequency: loan?.paymentFrequency ?? "Monthly",
      gracePeriod: loan?.gracePeriod ?? 0,
      notes: loan?.notes ?? "",
      status: loan?.status ?? "active",
    }),
    [loan],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormValues>({ defaultValues: defaults });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("loanType")} />
      <input type="hidden" {...register("paymentFrequency")} />
      <input type="hidden" {...register("gracePeriod", { valueAsNumber: true })} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Lender" error={errors.lender?.message}>
          <input className={controlClass} {...register("lender", { required: "Lender is required" })} />
        </Field>
        <Field label="Loan Name" error={errors.loanName?.message}>
          <input className={controlClass} {...register("loanName", { required: "Loan name is required" })} />
        </Field>
        <Field label="Status">
          <select className={controlClass} {...register("status")}>
            <option value="active">Active</option>
            <option value="upcoming">Due Soon</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Paid</option>
          </select>
        </Field>
        <Field label="Original Amount" error={errors.originalAmount?.message}>
          <input
            type="number"
            step="0.01"
            className={controlClass}
            {...register("originalAmount", { required: "Amount is required", min: 1, valueAsNumber: true })}
          />
        </Field>
        <Field label="Estimated Interest Amount">
          <input type="number" step="0.01" className={controlClass} {...register("estimatedInterestAmount", { valueAsNumber: true })} />
        </Field>
        <Field label="Interest Rate (%)">
          <input type="number" step="0.01" className={controlClass} {...register("interestRate", { valueAsNumber: true })} />
        </Field>
        <Field label="Installments">
          <input type="number" min="1" className={controlClass} {...register("installments", { valueAsNumber: true, min: 1 })} />
        </Field>
        <Field label="Monthly Payment">
          <input
            className={`${controlClass} bg-slate-50 text-slate-500 dark:bg-slate-900`}
            value="Calculated automatically"
            readOnly
          />
        </Field>
        <Field label="Remaining Balance">
          <input type="number" step="0.01" className={controlClass} {...register("remainingBalance", { valueAsNumber: true })} />
        </Field>
        <Field label="Start Date">
          <input type="date" className={controlClass} {...register("startDate", { required: true })} />
        </Field>
        <Field label="Due Date">
          <input type="date" className={controlClass} {...register("dueDate", { required: true })} />
        </Field>
      </div>

      <Field label="Notes">
        <textarea className={`${controlClass} min-h-28 resize-y`} {...register("notes")} />
      </Field>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {loan ? "Save Changes" : "Create Loan"}
        </Button>
      </div>
    </form>
  );
}
