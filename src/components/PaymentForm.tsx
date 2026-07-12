import { useForm } from "react-hook-form";
import type { PaymentFormValues } from "../types";
import { todayDate, toDateInputValue } from "../lib/date";
import { Button } from "./Button";

interface PaymentFormProps {
  defaultAmount: number;
  onSubmit: (values: PaymentFormValues) => Promise<void> | void;
  onCancel: () => void;
}

const controlClass =
  "focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export function PaymentForm({ defaultAmount, onSubmit, onCancel }: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    defaultValues: {
      amountPaid: defaultAmount,
      paymentDate: toDateInputValue(todayDate()),
      referenceNumber: "",
      paymentMethod: "Bank Transfer",
      notes: "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Amount Paid</span>
          <input
            type="number"
            step="0.01"
            className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            {...register("amountPaid", { required: "Payment amount is required", min: 0.01, valueAsNumber: true })}
          />
          {errors.amountPaid ? <span className="mt-1 block text-xs font-medium text-red-600">{errors.amountPaid.message}</span> : null}
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Payment Date</span>
          <input type="date" className={`${controlClass} mt-1`} {...register("paymentDate", { required: true })} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reference Number</span>
          <input className={`${controlClass} mt-1`} {...register("referenceNumber")} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Payment Method</span>
          <select className={`${controlClass} mt-1`} {...register("paymentMethod")}>
            <option>Bank Transfer</option>
            <option>Autopay</option>
            <option>Debit Card</option>
            <option>Cash</option>
            <option>Check</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notes</span>
        <textarea className={`${controlClass} mt-1 min-h-28 resize-y`} {...register("notes")} />
      </label>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Record Payment
        </Button>
      </div>
    </form>
  );
}
