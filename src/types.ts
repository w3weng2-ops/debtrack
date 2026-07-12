export type LoanStatus = "active" | "completed" | "overdue" | "upcoming" | "paused";
export type InstallmentStatus = "upcoming" | "paid" | "late" | "missed" | "partial";
export type ActivityType =
  | "loan_created"
  | "loan_updated"
  | "payment_added"
  | "loan_completed"
  | "loan_deleted"
  | "notes_updated";

export type NotificationSeverity = "info" | "success" | "warning" | "danger";

export interface AppUser {
  id: string;
  email: string;
  name?: string;
}

export interface Loan {
  id: string;
  lender: string;
  loanName: string;
  loanType: string;
  originalAmount: number;
  interestRate: number;
  estimatedInterestAmount: number;
  totalLoanAmount: number;
  installments: number;
  monthlyPayment: number;
  startDate: string;
  dueDate: string;
  remainingBalance: number;
  amountPaid: number;
  progress: number;
  status: LoanStatus;
  nextUnpaidDue?: string;
  daysRemaining: number;
  paymentFrequency: string;
  gracePeriod: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  completionDate?: string;
}

export interface LoanInstallment {
  id: string;
  loanId: string;
  installmentNo: number;
  dueDate: string;
  expectedAmount: number;
  principal: number;
  interest: number;
  status: InstallmentStatus;
  paidDate?: string;
  remainingBalance: number;
}

export interface Payment {
  id: string;
  loanId: string;
  paymentDate: string;
  amountPaid: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  referenceNumber: string;
  paymentMethod: string;
  recordedBy: string;
  notes: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  type: ActivityType;
  loanId?: string;
  description: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  loanId?: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: string;
}

export interface DebtState {
  loans: Loan[];
  installments: LoanInstallment[];
  payments: Payment[];
  activities: ActivityLog[];
}

export interface LoanFormValues {
  lender: string;
  loanName: string;
  loanType: string;
  originalAmount: number;
  interestRate: number;
  estimatedInterestAmount: number;
  installments: number;
  startDate: string;
  dueDate: string;
  remainingBalance: number;
  paymentFrequency: string;
  gracePeriod: number;
  notes: string;
  status: LoanStatus;
}

export interface PaymentFormValues {
  amountPaid: number;
  paymentDate: string;
  referenceNumber: string;
  paymentMethod: string;
  notes: string;
}

export interface DashboardMetrics {
  activeLoans: number;
  remainingDebt: number;
  dueThisMonth: number;
  overdueAmount: number;
  overallProgress: number;
  dueWithin15: number;
  dueWithin30: number;
  lastUpdated?: string;
}

export interface DueSoonRow {
  loan: Loan;
  installment: LoanInstallment;
  daysRemaining: number;
  isOverdue: boolean;
}

export interface LenderSummary {
  lender: string;
  numberOfLoans: number;
  originalBalance: number;
  remainingBalance: number;
  totalPaid: number;
  progress: number;
}

export interface CompletedLoanSummary {
  loan: Loan;
  totalBorrowed: number;
  totalInterest: number;
  totalPaid: number;
  completionDate: string;
  loanDuration: string;
}

export interface MonthlyCalendarRow {
  month: string;
  totalDue: number;
  totalPaid: number;
  remaining: number;
  dueAccounts: number;
}

export interface PaymentProgressSummary {
  totalScheduled: number;
  totalPaid: number;
  remainingDebt: number;
  progress: number;
}
