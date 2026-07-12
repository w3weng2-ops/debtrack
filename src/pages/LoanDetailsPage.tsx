import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Edit3,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { LoanForm } from "../components/LoanForm";
import { Modal } from "../components/Modal";
import { PaymentForm } from "../components/PaymentForm";
import { ProgressBar } from "../components/ProgressBar";
import { PageSkeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { useDebt } from "../context/DebtContext";
import { useToast } from "../context/ToastContext";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "../lib/format";
import type { Loan, LoanFormValues, PaymentFormValues } from "../types";

function detailFormValues(loan: Loan, overrides: Partial<LoanFormValues> = {}): LoanFormValues {
  return {
    lender: loan.lender,
    loanName: loan.loanName,
    loanType: loan.loanType,
    originalAmount: loan.originalAmount,
    interestRate: loan.interestRate,
    estimatedInterestAmount: loan.estimatedInterestAmount,
    installments: loan.installments,
    startDate: loan.startDate,
    dueDate: loan.dueDate,
    remainingBalance: loan.remainingBalance,
    paymentFrequency: loan.paymentFrequency,
    gracePeriod: loan.gracePeriod,
    notes: loan.notes,
    status: loan.status,
    ...overrides,
  };
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="muted-label">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

export function LoanDetailsPage() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const { loans, installments, payments, updateLoan, deleteLoan, addPayment, loading } = useDebt();
  const { notify } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const loan = loans.find((item) => item.id === loanId);
  const schedule = useMemo(
    () =>
      installments
        .filter((installment) => installment.loanId === loanId)
        .sort((a, b) => a.installmentNo - b.installmentNo),
    [installments, loanId],
  );
  const history = useMemo(
    () =>
      payments
        .filter((payment) => payment.loanId === loanId)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()),
    [loanId, payments],
  );
  const nextInstallment = schedule.find((installment) => installment.status !== "paid");

  if (loading) return <PageSkeleton />;

  if (!loan) {
    return (
      <EmptyState
        icon={FileText}
        title="Loan not found"
        message="The selected loan may have been deleted or filtered out of the current workspace."
        actionLabel="Back to Loans"
        onAction={() => navigate("/loans")}
      />
    );
  }

  const handleUpdate = async (values: LoanFormValues) => {
    try {
      await updateLoan(loan.id, values);
      notify({ severity: "success", title: "Loan updated", message: `${values.loanName} was saved.` });
      setEditOpen(false);
    } catch (error) {
      notify({
        severity: "danger",
        title: "Loan update failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handlePayment = async (values: PaymentFormValues) => {
    try {
      await addPayment(loan.id, values);
      notify({ severity: "success", title: "Payment recorded", message: `${loan.loanName} balance was updated.` });
      setPaymentOpen(false);
    } catch (error) {
      notify({
        severity: "danger",
        title: "Payment failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleComplete = async () => {
    try {
      await updateLoan(loan.id, detailFormValues(loan, { remainingBalance: 0, status: "completed" }));
      notify({ severity: "success", title: "Loan completed", message: `${loan.loanName} moved to completed loans.` });
    } catch (error) {
      notify({
        severity: "danger",
        title: "Completion failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete ${loan.loanName}? This removes the loan, schedule, and payments.`);
    if (!confirmed) return;
    try {
      await deleteLoan(loan.id);
      notify({ severity: "success", title: "Loan deleted", message: `${loan.loanName} was removed.` });
      navigate("/loans");
    } catch (error) {
      notify({
        severity: "danger",
        title: "Delete failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700" to="/loans">
            <ArrowLeft className="h-4 w-4" />
            Back to loans
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white sm:text-3xl">{loan.loanName}</h1>
            <StatusBadge status={loan.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {loan.id} from {loan.lender}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
          <Button onClick={() => setPaymentOpen(true)} disabled={loan.status === "completed"}>
            <Plus className="h-4 w-4" />
            Add Payment
          </Button>
          <Button variant="secondary" onClick={() => void handleComplete()} disabled={loan.status === "completed"}>
            <CheckCircle2 className="h-4 w-4" />
            Mark Completed
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <DollarSign className="h-5 w-5 text-red-500" />
          <p className="muted-label mt-4">Remaining Balance</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(loan.remainingBalance)}</p>
        </div>
        <div className="card p-5">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <p className="muted-label mt-4">Amount Paid</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(loan.amountPaid)}</p>
        </div>
        <div className="card p-5">
          <CalendarClock className="h-5 w-5 text-amber-500" />
          <p className="muted-label mt-4">Next Unpaid Due</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatDate(loan.nextUnpaidDue)}</p>
        </div>
        <div className="card p-5">
          <p className="muted-label">Progress</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{formatPercent(loan.progress)}</p>
          <ProgressBar value={loan.progress} className="mt-4" />
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Loan Details</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Complete record for this loan.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Loan ID" value={loan.id} />
          <DetailItem label="Lender" value={loan.lender} />
          <DetailItem label="Loan Name" value={loan.loanName} />
          <DetailItem label="Loan Type" value={loan.loanType} />
          <DetailItem label="Original Amount" value={formatCurrency(loan.originalAmount)} />
          <DetailItem label="Interest Rate" value={`${loan.interestRate.toFixed(2)}%`} />
          <DetailItem label="Estimated Interest Amount" value={formatCurrency(loan.estimatedInterestAmount)} />
          <DetailItem label="Total Loan Amount" value={formatCurrency(loan.totalLoanAmount)} />
          <DetailItem label="Installments" value={loan.installments} />
          <DetailItem label="Monthly Payment" value={formatCurrency(loan.monthlyPayment)} />
          <DetailItem label="Start Date" value={formatDate(loan.startDate)} />
          <DetailItem label="Due Date" value={formatDate(loan.dueDate)} />
          <DetailItem label="Remaining Balance" value={formatCurrency(loan.remainingBalance)} />
          <DetailItem label="Amount Paid" value={formatCurrency(loan.amountPaid)} />
          <DetailItem label="Progress %" value={formatPercent(loan.progress)} />
          <DetailItem label="Status" value={<StatusBadge status={loan.status} />} />
          <DetailItem label="Next Unpaid Due" value={formatDate(loan.nextUnpaidDue)} />
          <DetailItem
            label="Days Remaining"
            value={loan.daysRemaining < 0 ? `${Math.abs(loan.daysRemaining)} days overdue` : `${loan.daysRemaining} days`}
          />
          <DetailItem label="Payment Frequency" value={loan.paymentFrequency} />
          <DetailItem label="Grace Period" value={`${loan.gracePeriod} days`} />
          <DetailItem label="Created At" value={formatDateTime(loan.createdAt)} />
          <DetailItem label="Updated At" value={formatDateTime(loan.updatedAt)} />
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="muted-label">Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{loan.notes || "No notes recorded."}</p>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Payment Schedule</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Automatically generated installments for this loan.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Installment No.</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Expected Amount</th>
                <th className="px-4 py-3">Principal</th>
                <th className="px-4 py-3">Interest</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid Date</th>
                <th className="px-4 py-3">Remaining Balance</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {schedule.map((installment) => (
                <tr key={installment.id}>
                  <td className="table-cell font-semibold">{installment.installmentNo}</td>
                  <td className="table-cell">{formatDate(installment.dueDate)}</td>
                  <td className="table-cell font-semibold">{formatCurrency(installment.expectedAmount)}</td>
                  <td className="table-cell">{formatCurrency(installment.principal)}</td>
                  <td className="table-cell">{formatCurrency(installment.interest)}</td>
                  <td className="table-cell">
                    <StatusBadge status={installment.status} />
                  </td>
                  <td className="table-cell">{formatDate(installment.paidDate)}</td>
                  <td className="table-cell">{formatCurrency(installment.remainingBalance)}</td>
                  <td className="table-cell">
                    {installment.status === "paid" ? (
                      <span className="text-xs font-semibold text-slate-400">Recorded</span>
                    ) : (
                      <button
                        className="font-semibold text-blue-600 hover:text-blue-700"
                        onClick={() => setPaymentOpen(true)}
                      >
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">Payment History</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Recorded payments and references.</p>
        </div>
        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Payment Date</th>
                  <th className="px-4 py-3">Amount Paid</th>
                  <th className="px-4 py-3">Principal Paid</th>
                  <th className="px-4 py-3">Interest Paid</th>
                  <th className="px-4 py-3">Remaining Balance</th>
                  <th className="px-4 py-3">Reference Number</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3">Recorded By</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((payment) => (
                  <tr key={payment.id}>
                    <td className="table-cell">{formatDate(payment.paymentDate)}</td>
                    <td className="table-cell font-semibold">{formatCurrency(payment.amountPaid)}</td>
                    <td className="table-cell">{formatCurrency(payment.principalPaid)}</td>
                    <td className="table-cell">{formatCurrency(payment.interestPaid)}</td>
                    <td className="table-cell">{formatCurrency(payment.remainingBalance)}</td>
                    <td className="table-cell">{payment.referenceNumber || "None"}</td>
                    <td className="table-cell">{payment.paymentMethod}</td>
                    <td className="table-cell">{payment.recordedBy}</td>
                    <td className="table-cell max-w-64 truncate">{payment.notes || "No notes"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={DollarSign}
              title="No payments recorded"
              message="Record the first payment to update the schedule, balance, progress, and activity log."
              actionLabel="Add Payment"
              onAction={() => setPaymentOpen(true)}
            />
          </div>
        )}
      </section>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Loan"
        description="Changes update the dashboard, analytics, and activity feed."
      >
        <LoanForm loan={loan} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} />
      </Modal>

      <Modal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Add Payment"
        description="Payments update the remaining balance, progress, next unpaid due, and activity log."
      >
        <PaymentForm
          defaultAmount={nextInstallment?.expectedAmount ?? loan.monthlyPayment}
          onSubmit={handlePayment}
          onCancel={() => setPaymentOpen(false)}
        />
      </Modal>
    </div>
  );
}
