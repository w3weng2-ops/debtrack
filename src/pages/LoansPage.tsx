import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDebt } from "../context/DebtContext";
import { useToast } from "../context/ToastContext";
import { cx } from "../lib/classes";
import { formatCurrency, formatDate, formatPercent } from "../lib/format";
import type { Loan, LoanFormValues, LoanStatus } from "../types";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { LoanForm } from "../components/LoanForm";
import { Modal } from "../components/Modal";
import { ProgressBar } from "../components/ProgressBar";
import { PageSkeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";

type SortKey = "dueDate" | "startDate" | "createdAt" | "remainingBalance" | "originalAmount" | "loanName";

const pageSize = 6;

const controlClass =
  "focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function sortLoans(loans: Loan[], sortKey: SortKey) {
  return [...loans].sort((a, b) => {
    if (sortKey === "loanName") return a.loanName.localeCompare(b.loanName);
    if (sortKey === "remainingBalance" || sortKey === "originalAmount") return b[sortKey] - a[sortKey];
    return new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime();
  });
}

export function LoansPage() {
  const { loans, createLoan, updateLoan, deleteLoan, loading } = useDebt();
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LoanStatus | "all">("all");
  const [lender, setLender] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [interestMax, setInterestMax] = useState("");
  const [frequency, setFrequency] = useState("all");
  const [page, setPage] = useState(1);
  const [formLoan, setFormLoan] = useState<Loan | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  const lenders = useMemo(() => Array.from(new Set(loans.map((loan) => loan.lender))).sort(), [loans]);
  const frequencies = useMemo(() => Array.from(new Set(loans.map((loan) => loan.paymentFrequency))).sort(), [loans]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    const matches = loans.filter((loan) => {
      const haystack = [loan.id, loan.loanName, loan.lender, loan.notes].join(" ").toLowerCase();
      const due = new Date(loan.nextUnpaidDue ?? loan.dueDate);
      const minAmount = amountMin ? Number(amountMin) : undefined;
      const maxAmount = amountMax ? Number(amountMax) : undefined;
      const maxInterest = interestMax ? Number(interestMax) : undefined;

      return (
        (!term || haystack.includes(term)) &&
        (status === "all" || loan.status === status) &&
        (lender === "all" || loan.lender === lender) &&
        (!dateStart || due >= new Date(dateStart)) &&
        (!dateEnd || due <= new Date(dateEnd)) &&
        (minAmount === undefined || loan.remainingBalance >= minAmount) &&
        (maxAmount === undefined || loan.remainingBalance <= maxAmount) &&
        (maxInterest === undefined || loan.interestRate <= maxInterest) &&
        (frequency === "all" || loan.paymentFrequency === frequency)
      );
    });

    return sortLoans(matches, sortKey);
  }, [amountMax, amountMin, dateEnd, dateStart, frequency, interestMax, lender, loans, query, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <PageSkeleton />;

  const openCreate = () => {
    setFormLoan(undefined);
    setFormOpen(true);
  };

  const handleSubmit = async (values: LoanFormValues) => {
    try {
      if (formLoan) {
        await updateLoan(formLoan.id, values);
        notify({ severity: "success", title: "Loan updated", message: `${values.loanName} was saved.` });
      } else {
        await createLoan(values);
        notify({ severity: "success", title: "Loan created", message: `${values.loanName} was added.` });
      }
      setFormOpen(false);
    } catch (error) {
      notify({
        severity: "danger",
        title: formLoan ? "Loan update failed" : "Loan creation failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleDelete = async (loan: Loan) => {
    const confirmed = window.confirm(`Delete ${loan.loanName}? This removes the loan, schedule, and payments.`);
    if (!confirmed) return;
    try {
      await deleteLoan(loan.id);
      notify({ severity: "success", title: "Loan deleted", message: `${loan.loanName} was removed.` });
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
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white sm:text-3xl">Loan Database</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Search, filter, sort, and maintain every active, upcoming, overdue, paused, and completed loan.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Loan
        </Button>
      </div>

      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white">
          <Filter className="h-4 w-4 text-blue-600" />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search loan name, ID, lender, or notes"
              className={`${controlClass} pl-10`}
            />
          </label>
          <select className={controlClass} value={status} onChange={(event) => setStatus(event.target.value as LoanStatus | "all")}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
            <option value="paused">Paused</option>
          </select>
          <select className={controlClass} value={lender} onChange={(event) => setLender(event.target.value)}>
            <option value="all">All lenders</option>
            {lenders.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input type="date" className={controlClass} value={dateStart} onChange={(event) => setDateStart(event.target.value)} aria-label="Start due date" />
          <input type="date" className={controlClass} value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} aria-label="End due date" />
          <input className={controlClass} value={amountMin} onChange={(event) => setAmountMin(event.target.value)} placeholder="Min balance" type="number" />
          <input className={controlClass} value={amountMax} onChange={(event) => setAmountMax(event.target.value)} placeholder="Max balance" type="number" />
          <input className={controlClass} value={interestMax} onChange={(event) => setInterestMax(event.target.value)} placeholder="Max interest %" type="number" />
          <select className={controlClass} value={frequency} onChange={(event) => setFrequency(event.target.value)}>
            <option value="all">All installment types</option>
            {frequencies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select className={controlClass} value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="dueDate">Sort by due date</option>
            <option value="startDate">Sort by start date</option>
            <option value="createdAt">Sort by created date</option>
            <option value="remainingBalance">Sort by remaining balance</option>
            <option value="originalAmount">Sort by original amount</option>
            <option value="loanName">Sort by loan name</option>
          </select>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Loans</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Showing {paginated.length} of {filtered.length} loans.
            </p>
          </div>
        </div>
        {paginated.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Loan ID</th>
                  <th className="px-4 py-3">Lender</th>
                  <th className="px-4 py-3">Loan Name</th>
                  <th className="px-4 py-3">Original Amount</th>
                  <th className="px-4 py-3">Interest Rate</th>
                  <th className="px-4 py-3">Installments</th>
                  <th className="px-4 py-3">Monthly Payment</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Remaining Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Est. Interest</th>
                  <th className="px-4 py-3">Next Unpaid Due</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((loan) => (
                  <tr key={loan.id} className={cx(loan.status === "overdue" ? "bg-red-50/50 dark:bg-red-950/20" : "")}>
                    <td className="table-cell font-semibold">{loan.id}</td>
                    <td className="table-cell">{loan.lender}</td>
                    <td className="table-cell font-semibold text-slate-950 dark:text-white">{loan.loanName}</td>
                    <td className="table-cell">{formatCurrency(loan.originalAmount)}</td>
                    <td className="table-cell">{loan.interestRate.toFixed(2)}%</td>
                    <td className="table-cell">{loan.installments}</td>
                    <td className="table-cell">{formatCurrency(loan.monthlyPayment)}</td>
                    <td className="table-cell">{formatDate(loan.startDate)}</td>
                    <td className="table-cell">{formatDate(loan.dueDate)}</td>
                    <td className="table-cell font-semibold">{formatCurrency(loan.remainingBalance)}</td>
                    <td className="table-cell">
                      <StatusBadge status={loan.status} />
                    </td>
                    <td className="table-cell">{formatCurrency(loan.estimatedInterestAmount)}</td>
                    <td className="table-cell">{formatDate(loan.nextUnpaidDue)}</td>
                    <td className="table-cell min-w-44">
                      <div className="flex items-center gap-3">
                        <ProgressBar value={loan.progress} />
                        <span className="text-xs font-semibold">{formatPercent(loan.progress)}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <Link className="focus-ring rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950" to={`/loans/${loan.id}`} aria-label={`View ${loan.loanName}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          className="focus-ring rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          onClick={() => {
                            setFormLoan(loan);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${loan.loanName}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          className="focus-ring rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => void handleDelete(loan)}
                          aria-label={`Delete ${loan.loanName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={WalletCards}
              title="No loans match these filters"
              message="Adjust the search and filters, or add a new loan to start tracking repayment."
              actionLabel="Add Loan"
              onAction={openCreate}
            />
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {page} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="secondary" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formLoan ? "Edit Loan" : "Add Loan"}
        description="Loan details, repayment assumptions, and notes feed dashboard calculations automatically."
      >
        <LoanForm loan={formLoan} onSubmit={handleSubmit} onCancel={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
