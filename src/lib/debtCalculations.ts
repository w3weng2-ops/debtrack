import type {
  ActivityLog,
  CompletedLoanSummary,
  DashboardMetrics,
  DueSoonRow,
  LenderSummary,
  Loan,
  LoanFormValues,
  LoanInstallment,
  MonthlyCalendarRow,
  NotificationItem,
  Payment,
  PaymentProgressSummary,
} from "../types";
import { addDays, addMonths, daysBetween, isSameMonth, monthsBetween, todayDate, toDateInputValue } from "./date";

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function numberOrFallback(value: number, fallback: number, allowZero = true) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  if (!allowZero && number <= 0) return fallback;
  return number;
}

export function calculateLoanStatus(loan: Pick<Loan, "remainingBalance" | "dueDate">, nextUnpaidDue?: string): Loan["status"] {
  if (loan.remainingBalance <= 0) return "completed";
  const now = todayDate();
  const activeDueDate = nextUnpaidDue ? new Date(nextUnpaidDue) : new Date(loan.dueDate);
  const days = daysBetween(now, activeDueDate);
  if (days < 0) return "overdue";
  if (days <= 30) return "upcoming";
  return "active";
}

export function deriveLoanFields(loan: Loan, installments: LoanInstallment[] = []): Loan {
  const related = installments
    .filter((installment) => installment.loanId === loan.id && installment.status !== "paid")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextUnpaidDue = related[0]?.dueDate;
  const totalLoanAmount = loan.totalLoanAmount || loan.originalAmount + loan.estimatedInterestAmount;
  const amountPaid = Math.max(0, totalLoanAmount - Math.max(0, loan.remainingBalance));
  const progress = totalLoanAmount > 0 ? clampPercent((amountPaid / totalLoanAmount) * 100) : 0;
  const activeDueDate = nextUnpaidDue ?? loan.dueDate;
  const status = calculateLoanStatus({ remainingBalance: loan.remainingBalance, dueDate: loan.dueDate }, nextUnpaidDue);

  return {
    ...loan,
    totalLoanAmount,
    amountPaid,
    progress,
    nextUnpaidDue,
    daysRemaining: daysBetween(todayDate(), new Date(activeDueDate)),
    status,
    completionDate: status === "completed" ? loan.completionDate ?? new Date().toISOString() : loan.completionDate,
    updatedAt: loan.updatedAt,
  };
}

export function createLoanFromForm(values: LoanFormValues): Loan {
  const now = new Date().toISOString();
  const totalLoanAmount = Number(values.originalAmount) + Number(values.estimatedInterestAmount || 0);
  const remainingBalance = numberOrFallback(
    values.remainingBalance,
    totalLoanAmount,
    values.status === "completed",
  );
  const monthlyPayment = values.installments > 0 ? totalLoanAmount / Number(values.installments) : 0;

  return deriveLoanFields({
    id: uid("LN"),
    lender: values.lender,
    loanName: values.loanName,
    loanType: values.loanType,
    originalAmount: Number(values.originalAmount),
    interestRate: Number(values.interestRate || 0),
    estimatedInterestAmount: Number(values.estimatedInterestAmount || 0),
    totalLoanAmount,
    installments: Number(values.installments || 1),
    monthlyPayment,
    startDate: values.startDate,
    dueDate: values.dueDate,
    remainingBalance,
    amountPaid: 0,
    progress: 0,
    status: values.status,
    daysRemaining: 0,
    paymentFrequency: values.paymentFrequency,
    gracePeriod: Number(values.gracePeriod || 0),
    notes: values.notes,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateLoanFromForm(existing: Loan, values: LoanFormValues, installments: LoanInstallment[]): Loan {
  const totalLoanAmount = Number(values.originalAmount) + Number(values.estimatedInterestAmount || 0);
  const monthlyPayment = values.installments > 0 ? totalLoanAmount / Number(values.installments) : 0;

  return deriveLoanFields(
    {
      ...existing,
      lender: values.lender,
      loanName: values.loanName,
      loanType: values.loanType,
      originalAmount: Number(values.originalAmount),
      interestRate: Number(values.interestRate || 0),
      estimatedInterestAmount: Number(values.estimatedInterestAmount || 0),
      totalLoanAmount,
      installments: Number(values.installments || 1),
      monthlyPayment,
      startDate: values.startDate,
      dueDate: values.dueDate,
      remainingBalance: numberOrFallback(values.remainingBalance, totalLoanAmount),
      paymentFrequency: values.paymentFrequency,
      gracePeriod: Number(values.gracePeriod || 0),
      notes: values.notes,
      status: values.status,
      updatedAt: new Date().toISOString(),
    },
    installments,
  );
}

export function generateInstallments(loan: Loan): LoanInstallment[] {
  const principalPerInstallment = loan.originalAmount / Math.max(loan.installments, 1);
  const interestPerInstallment = loan.estimatedInterestAmount / Math.max(loan.installments, 1);

  return Array.from({ length: loan.installments }, (_, index) => {
    const expectedAmount =
      index === loan.installments - 1
        ? loan.totalLoanAmount - (principalPerInstallment + interestPerInstallment) * index
        : principalPerInstallment + interestPerInstallment;

    return {
      id: uid("SCH"),
      loanId: loan.id,
      installmentNo: index + 1,
      dueDate: toDateInputValue(addMonths(new Date(loan.dueDate), index)),
      expectedAmount,
      principal: principalPerInstallment,
      interest: interestPerInstallment,
      status: "upcoming",
      remainingBalance: expectedAmount,
    };
  });
}

export function getDashboardMetrics(
  loans: Loan[],
  installments: LoanInstallment[],
  activities: ActivityLog[],
): DashboardMetrics {
  const now = todayDate();
  const activeLoans = loans.filter((loan) => loan.status !== "completed");
  const unpaid = installments.filter((installment) => installment.status !== "paid");
  const totalBorrowed = loans.reduce((sum, loan) => sum + loan.totalLoanAmount, 0);
  const totalPaid = loans.reduce((sum, loan) => sum + loan.amountPaid, 0);

  return {
    activeLoans: activeLoans.length,
    remainingDebt: activeLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0),
    dueThisMonth: unpaid
      .filter((installment) => isSameMonth(new Date(installment.dueDate), now))
      .reduce((sum, installment) => sum + installment.expectedAmount, 0),
    overdueAmount: unpaid
      .filter((installment) => new Date(installment.dueDate) < now)
      .reduce((sum, installment) => sum + installment.expectedAmount, 0),
    overallProgress: totalBorrowed > 0 ? clampPercent((totalPaid / totalBorrowed) * 100) : 0,
    dueWithin15: amountDueWithinDays(unpaid, 15),
    dueWithin30: amountDueWithinDays(unpaid, 30),
    lastUpdated: [activities[0]?.createdAt, ...loans.map((loan) => loan.updatedAt)]
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0],
  };
}

export function getPaymentProgress(loans: Loan[], installments: LoanInstallment[]): PaymentProgressSummary {
  const totalScheduled =
    installments.reduce((sum, installment) => sum + installment.expectedAmount, 0) ||
    loans.reduce((sum, loan) => sum + loan.totalLoanAmount, 0);
  const totalPaid = loans.reduce((sum, loan) => sum + loan.amountPaid, 0);
  const remainingDebt = loans
    .filter((loan) => loan.status !== "completed")
    .reduce((sum, loan) => sum + loan.remainingBalance, 0);

  return {
    totalScheduled,
    totalPaid,
    remainingDebt,
    progress: totalScheduled > 0 ? clampPercent((totalPaid / totalScheduled) * 100) : 0,
  };
}

export function getMonthlyCalendarRows(
  installments: LoanInstallment[],
  payments: Payment[],
  months = 12,
): MonthlyCalendarRow[] {
  const now = todayDate();
  const firstMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return Array.from({ length: months }, (_, index) => {
    const monthStart = addMonths(firstMonth, index);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const inMonth = (value: string) => {
      const date = new Date(value);
      return date >= monthStart && date <= monthEnd;
    };

    const dueInstallments = installments.filter((installment) => inMonth(installment.dueDate));
    const totalDue = dueInstallments.reduce((sum, installment) => sum + installment.expectedAmount, 0);
    const totalPaid = payments
      .filter((payment) => inMonth(payment.paymentDate))
      .reduce((sum, payment) => sum + payment.amountPaid, 0);

    return {
      month: toDateInputValue(monthEnd),
      totalDue,
      totalPaid,
      remaining: Math.max(0, totalDue - totalPaid),
      dueAccounts: dueInstallments.filter((installment) => installment.expectedAmount > 0).length,
    };
  });
}

export function amountDueWithinDays(installments: LoanInstallment[], days: number) {
  const now = todayDate();
  const limit = addDays(now, days);
  return installments
    .filter((installment) => {
      const due = new Date(installment.dueDate);
      return installment.status !== "paid" && due <= limit;
    })
    .reduce((sum, installment) => sum + installment.expectedAmount, 0);
}

export function getDueSoonRows(loans: Loan[], installments: LoanInstallment[], windowDays = 15): DueSoonRow[] {
  const now = todayDate();
  const limit = addDays(now, windowDays);
  const loanMap = new Map(loans.map((loan) => [loan.id, loan]));

  return installments
    .filter((installment) => {
      const due = new Date(installment.dueDate);
      return installment.status !== "paid" && due <= limit;
    })
    .map((installment) => {
      const dueDate = new Date(installment.dueDate);
      return {
        loan: loanMap.get(installment.loanId)!,
        installment,
        daysRemaining: daysBetween(now, dueDate),
        isOverdue: dueDate < now,
      };
    })
    .filter((row) => row.loan)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function getDebtByLender(loans: Loan[]): LenderSummary[] {
  const groups = new Map<string, LenderSummary>();

  loans.forEach((loan) => {
    const current =
      groups.get(loan.lender) ??
      ({
        lender: loan.lender,
        numberOfLoans: 0,
        originalBalance: 0,
        remainingBalance: 0,
        totalPaid: 0,
        progress: 0,
      } satisfies LenderSummary);

    current.numberOfLoans += 1;
    current.originalBalance += loan.totalLoanAmount;
    current.remainingBalance += loan.remainingBalance;
    current.totalPaid += loan.amountPaid;
    current.progress =
      current.originalBalance > 0 ? clampPercent((current.totalPaid / current.originalBalance) * 100) : 0;
    groups.set(loan.lender, current);
  });

  return Array.from(groups.values()).sort((a, b) => b.remainingBalance - a.remainingBalance);
}

export function getCompletedLoans(loans: Loan[]): CompletedLoanSummary[] {
  return loans
    .filter((loan) => loan.status === "completed")
    .map((loan) => ({
      loan,
      totalBorrowed: loan.originalAmount,
      totalInterest: loan.estimatedInterestAmount,
      totalPaid: loan.amountPaid,
      completionDate: loan.completionDate ?? loan.updatedAt,
      loanDuration: `${monthsBetween(new Date(loan.startDate), new Date(loan.completionDate ?? loan.updatedAt))} months`,
    }));
}

export function getNotifications(loans: Loan[], installments: LoanInstallment[]): NotificationItem[] {
  const rows = getDueSoonRows(loans, installments, 30);
  const notifications = rows.map<NotificationItem>((row) => {
    const dueToday = row.daysRemaining === 0;
    const overdue = row.daysRemaining < 0;
    const within15 = row.daysRemaining <= 15;

    return {
      id: `N-${row.installment.id}`,
      loanId: row.loan.id,
      title: overdue ? "Overdue payment" : dueToday ? "Payment due today" : within15 ? "Due in 15 days" : "Due in 30 days",
      message: `${row.loan.loanName} has an installment due ${overdue ? `${Math.abs(row.daysRemaining)} days ago` : `in ${row.daysRemaining} days`}.`,
      severity: overdue ? "danger" : dueToday ? "warning" : within15 ? "warning" : "info",
      createdAt: row.installment.dueDate,
    };
  });

  const completed = loans
    .filter((loan) => loan.status === "completed")
    .slice(0, 2)
    .map<NotificationItem>((loan) => ({
      id: `N-COMP-${loan.id}`,
      loanId: loan.id,
      title: "Loan completed",
      message: `${loan.loanName} is fully repaid.`,
      severity: "success",
      createdAt: loan.completionDate ?? loan.updatedAt,
    }));

  return [...notifications, ...completed].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addPaymentToState(
  loans: Loan[],
  installments: LoanInstallment[],
  payments: Payment[],
  activities: ActivityLog[],
  loanId: string,
  paymentValues: {
    amountPaid: number;
    paymentDate: string;
    referenceNumber: string;
    paymentMethod: string;
    notes: string;
    recordedBy: string;
  },
) {
  const loan = loans.find((item) => item.id === loanId);
  if (!loan) return { loans, installments, payments, activities };

  const sortedInstallments = installments
    .filter((installment) => installment.loanId === loanId && installment.status !== "paid")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const targetInstallment = sortedInstallments[0];
  const amountPaid = Number(paymentValues.amountPaid);
  const interestPaid = Math.min(targetInstallment?.interest ?? loan.estimatedInterestAmount, amountPaid * 0.2);
  const principalPaid = Math.max(0, amountPaid - interestPaid);
  const remainingBalance = Math.max(0, loan.remainingBalance - amountPaid);
  const now = new Date().toISOString();

  const nextInstallments = installments.map((installment) => {
    if (installment.id !== targetInstallment?.id) return installment;

    const installmentPaid = amountPaid >= installment.expectedAmount;
    return {
      ...installment,
      status: installmentPaid ? "paid" : "partial",
      paidDate: paymentValues.paymentDate,
      remainingBalance: Math.max(0, installment.expectedAmount - amountPaid),
    } satisfies LoanInstallment;
  });

  const updatedLoan = deriveLoanFields(
    {
      ...loan,
      remainingBalance,
      updatedAt: now,
      completionDate: remainingBalance <= 0 ? now : loan.completionDate,
    },
    nextInstallments,
  );

  const payment: Payment = {
    id: uid("PAY"),
    loanId,
    paymentDate: paymentValues.paymentDate,
    amountPaid,
    principalPaid,
    interestPaid,
    remainingBalance,
    referenceNumber: paymentValues.referenceNumber,
    paymentMethod: paymentValues.paymentMethod,
    recordedBy: paymentValues.recordedBy,
    notes: paymentValues.notes,
    createdAt: now,
  };

  const activity: ActivityLog = {
    id: uid("ACT"),
    type: remainingBalance <= 0 ? "loan_completed" : "payment_added",
    loanId,
    description:
      remainingBalance <= 0
        ? `${loan.loanName} was completed with a final payment.`
        : `Payment recorded for ${loan.loanName}.`,
    createdAt: now,
  };

  return {
    loans: loans.map((item) => (item.id === loanId ? updatedLoan : item)),
    installments: nextInstallments,
    payments: [payment, ...payments],
    activities: [activity, ...activities],
  };
}
