import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { demoState } from "../data/demoData";
import {
  addPaymentToState,
  createLoanFromForm,
  deriveLoanFields,
  generateInstallments,
  updateLoanFromForm,
  uid,
} from "../lib/debtCalculations";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { ActivityLog, DebtState, Loan, LoanFormValues, LoanInstallment, PaymentFormValues } from "../types";
import { useAuth } from "./AuthContext";

interface DebtContextValue extends DebtState {
  loading: boolean;
  error?: string;
  createLoan: (values: LoanFormValues) => Promise<Loan>;
  updateLoan: (loanId: string, values: LoanFormValues) => Promise<void>;
  deleteLoan: (loanId: string) => Promise<void>;
  addPayment: (loanId: string, values: PaymentFormValues) => Promise<void>;
}

const DebtContext = createContext<DebtContextValue | undefined>(undefined);
const storageKey = "debt-tracker-state-v1";

function readStoredState() {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as DebtState) : demoState;
  } catch {
    return demoState;
  }
}

function loanFromRow(row: Record<string, unknown>): Loan {
  return deriveLoanFields({
    id: String(row.id),
    lender: String(row.lender_name ?? row.lender ?? ""),
    loanName: String(row.loan_name ?? ""),
    loanType: String(row.loan_type ?? "Personal Loan"),
    originalAmount: Number(row.original_amount ?? 0),
    interestRate: Number(row.interest_rate ?? 0),
    estimatedInterestAmount: Number(row.estimated_interest_amount ?? 0),
    totalLoanAmount: Number(row.total_loan_amount ?? 0),
    installments: Number(row.installments ?? 1),
    monthlyPayment: Number(row.monthly_payment ?? 0),
    startDate: String(row.start_date),
    dueDate: String(row.due_date),
    remainingBalance: Number(row.remaining_balance ?? 0),
    amountPaid: Number(row.amount_paid ?? 0),
    progress: Number(row.progress ?? 0),
    status: String(row.status ?? "active") as Loan["status"],
    nextUnpaidDue: row.next_unpaid_due ? String(row.next_unpaid_due) : undefined,
    daysRemaining: Number(row.days_remaining ?? 0),
    paymentFrequency: String(row.payment_frequency ?? "Monthly"),
    gracePeriod: Number(row.grace_period ?? 0),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completionDate: row.completion_date ? String(row.completion_date) : undefined,
  });
}

function installmentFromRow(row: Record<string, unknown>): LoanInstallment {
  return {
    id: String(row.id),
    loanId: String(row.loan_id),
    installmentNo: Number(row.installment_no),
    dueDate: String(row.due_date),
    expectedAmount: Number(row.expected_amount),
    principal: Number(row.principal),
    interest: Number(row.interest),
    status: String(row.status) as LoanInstallment["status"],
    paidDate: row.paid_date ? String(row.paid_date) : undefined,
    remainingBalance: Number(row.remaining_balance),
  };
}

function activityFromRow(row: Record<string, unknown>): ActivityLog {
  return {
    id: String(row.id),
    type: String(row.type) as ActivityLog["type"],
    loanId: row.loan_id ? String(row.loan_id) : undefined,
    description: String(row.description ?? ""),
    createdAt: String(row.created_at),
  };
}

function loanToRow(loan: Loan) {
  return {
    id: loan.id,
    lender_name: loan.lender,
    loan_name: loan.loanName,
    loan_type: loan.loanType,
    original_amount: loan.originalAmount,
    interest_rate: loan.interestRate,
    estimated_interest_amount: loan.estimatedInterestAmount,
    total_loan_amount: loan.totalLoanAmount,
    installments: loan.installments,
    monthly_payment: loan.monthlyPayment,
    start_date: loan.startDate,
    due_date: loan.dueDate,
    remaining_balance: loan.remainingBalance,
    amount_paid: loan.amountPaid,
    progress: loan.progress,
    status: loan.status,
    next_unpaid_due: loan.nextUnpaidDue ?? null,
    days_remaining: loan.daysRemaining,
    payment_frequency: loan.paymentFrequency,
    grace_period: loan.gracePeriod,
    notes: loan.notes,
    completion_date: loan.completionDate ?? null,
    created_at: loan.createdAt,
    updated_at: loan.updatedAt,
  };
}

function installmentToRow(installment: LoanInstallment) {
  return {
    id: installment.id,
    loan_id: installment.loanId,
    installment_no: installment.installmentNo,
    due_date: installment.dueDate,
    expected_amount: installment.expectedAmount,
    principal: installment.principal,
    interest: installment.interest,
    status: installment.status,
    paid_date: installment.paidDate ?? null,
    remaining_balance: installment.remainingBalance,
  };
}

export function DebtProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<DebtState>(() => readStoredState());
  const [loading, setLoading] = useState(Boolean(isSupabaseConfigured));
  const [error, setError] = useState<string>();

  const loadSupabaseData = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);

    const [loansResult, installmentsResult, paymentsResult, activitiesResult] = await Promise.all([
      supabase.from("loans").select("*").order("created_at", { ascending: false }),
      supabase.from("loan_installments").select("*").order("due_date", { ascending: true }),
      supabase.from("payments").select("*").order("payment_date", { ascending: false }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    const firstError =
      loansResult.error ?? installmentsResult.error ?? paymentsResult.error ?? activitiesResult.error;
    if (firstError) {
      setError(firstError.message);
      setState(demoState);
      setLoading(false);
      return;
    }

    const installments = (installmentsResult.data ?? []).map((row) => installmentFromRow(row));
    const loans = (loansResult.data ?? []).map((row) => deriveLoanFields(loanFromRow(row), installments));

    setState({
      loans,
      installments,
      payments: (paymentsResult.data ?? []).map((row) => ({
        id: String(row.id),
        loanId: String(row.loan_id),
        paymentDate: String(row.payment_date),
        amountPaid: Number(row.amount_paid),
        principalPaid: Number(row.principal_paid),
        interestPaid: Number(row.interest_paid),
        remainingBalance: Number(row.remaining_balance),
        referenceNumber: String(row.reference_number ?? ""),
        paymentMethod: String(row.payment_method ?? ""),
        recordedBy: String(row.recorded_by ?? ""),
        notes: String(row.notes ?? ""),
        createdAt: String(row.created_at),
      })),
      activities: (activitiesResult.data ?? []).map((row) => activityFromRow(row)),
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      void loadSupabaseData();
    } else {
      setLoading(false);
    }
  }, [loadSupabaseData]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [state]);

  const createLoan = useCallback(
    async (values: LoanFormValues) => {
      const baseLoan = createLoanFromForm(values);
      const generatedInstallments = generateInstallments(baseLoan);
      const loan = deriveLoanFields(baseLoan, generatedInstallments);
      const activity: ActivityLog = {
        id: uid("ACT"),
        type: "loan_created",
        loanId: loan.id,
        description: `${loan.loanName} was added to the tracker.`,
        createdAt: new Date().toISOString(),
      };

      setState((current) => ({
        loans: [loan, ...current.loans],
        installments: [...generatedInstallments, ...current.installments],
        payments: current.payments,
        activities: [activity, ...current.activities],
      }));

      if (supabase && user) {
        await supabase.from("loans").insert({ ...loanToRow(loan), user_id: user.id });
        await supabase
          .from("loan_installments")
          .insert(generatedInstallments.map((item) => ({ ...installmentToRow(item), user_id: user.id })));
        await supabase.from("activity_logs").insert({
          id: activity.id,
          user_id: user.id,
          loan_id: loan.id,
          type: activity.type,
          description: activity.description,
          created_at: activity.createdAt,
        });
      }

      return loan;
    },
    [user],
  );

  const updateLoan = useCallback(
    async (loanId: string, values: LoanFormValues) => {
      let updatedLoan: Loan | undefined;
      let activity: ActivityLog | undefined;

      setState((current) => {
        const loan = current.loans.find((item) => item.id === loanId);
        if (!loan) return current;

        updatedLoan = updateLoanFromForm(loan, values, current.installments);
        activity = {
          id: uid("ACT"),
          type: values.notes !== loan.notes ? "notes_updated" : "loan_updated",
          loanId,
          description:
            values.notes !== loan.notes
              ? `${updatedLoan.loanName} notes were updated.`
              : `${updatedLoan.loanName} was updated.`,
          createdAt: new Date().toISOString(),
        };

        return {
          ...current,
          loans: current.loans.map((item) => (item.id === loanId ? updatedLoan! : item)),
          activities: [activity, ...current.activities],
        };
      });

      if (supabase && user && updatedLoan && activity) {
        await supabase.from("loans").update(loanToRow(updatedLoan)).eq("id", loanId);
        await supabase.from("activity_logs").insert({
          id: activity.id,
          user_id: user.id,
          loan_id: loanId,
          type: activity.type,
          description: activity.description,
          created_at: activity.createdAt,
        });
      }
    },
    [user],
  );

  const deleteLoan = useCallback(
    async (loanId: string) => {
      const loan = state.loans.find((item) => item.id === loanId);
      const activity: ActivityLog = {
        id: uid("ACT"),
        type: "loan_deleted",
        loanId,
        description: `${loan?.loanName ?? "A loan"} was deleted.`,
        createdAt: new Date().toISOString(),
      };

      setState((current) => ({
        loans: current.loans.filter((item) => item.id !== loanId),
        installments: current.installments.filter((item) => item.loanId !== loanId),
        payments: current.payments.filter((item) => item.loanId !== loanId),
        activities: [activity, ...current.activities],
      }));

      if (supabase && user) {
        await supabase.from("loans").delete().eq("id", loanId);
        await supabase.from("activity_logs").insert({
          id: activity.id,
          user_id: user.id,
          loan_id: loanId,
          type: activity.type,
          description: activity.description,
          created_at: activity.createdAt,
        });
      }
    },
    [state.loans, user],
  );

  const addPayment = useCallback(
    async (loanId: string, values: PaymentFormValues) => {
      const nextState = addPaymentToState(
        state.loans,
        state.installments,
        state.payments,
        state.activities,
        loanId,
        {
          ...values,
          amountPaid: Number(values.amountPaid),
          recordedBy: user?.name ?? user?.email ?? "Current User",
        },
      );

      setState(nextState);

      if (supabase && user) {
        const changedLoan = nextState.loans.find((loan) => loan.id === loanId);
        const changedInstallment = nextState.installments.find(
          (installment, index) =>
            installment.loanId === loanId && installment !== state.installments[index] && installment.paidDate,
        );
        const newPayment = nextState.payments[0];
        const newActivity = nextState.activities[0];

        if (changedLoan) await supabase.from("loans").update(loanToRow(changedLoan)).eq("id", loanId);
        if (changedInstallment) {
          await supabase.from("loan_installments").update(installmentToRow(changedInstallment)).eq("id", changedInstallment.id);
        }
        await supabase.from("payments").insert({
          id: newPayment.id,
          user_id: user.id,
          loan_id: loanId,
          payment_date: newPayment.paymentDate,
          amount_paid: newPayment.amountPaid,
          principal_paid: newPayment.principalPaid,
          interest_paid: newPayment.interestPaid,
          remaining_balance: newPayment.remainingBalance,
          reference_number: newPayment.referenceNumber,
          payment_method: newPayment.paymentMethod,
          recorded_by: newPayment.recordedBy,
          notes: newPayment.notes,
          created_at: newPayment.createdAt,
        });
        await supabase.from("activity_logs").insert({
          id: newActivity.id,
          user_id: user.id,
          loan_id: loanId,
          type: newActivity.type,
          description: newActivity.description,
          created_at: newActivity.createdAt,
        });
      }
    },
    [state, user],
  );

  const value = useMemo<DebtContextValue>(
    () => ({
      ...state,
      loading,
      error,
      createLoan,
      updateLoan,
      deleteLoan,
      addPayment,
    }),
    [addPayment, createLoan, deleteLoan, error, loading, state, updateLoan],
  );

  return <DebtContext.Provider value={value}>{children}</DebtContext.Provider>;
}

export function useDebt() {
  const context = useContext(DebtContext);
  if (!context) throw new Error("useDebt must be used within DebtProvider");
  return context;
}
