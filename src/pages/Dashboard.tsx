import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  DollarSign,
  Landmark,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useDebt } from "../context/DebtContext";
import {
  getDashboardMetrics,
  getDebtByLender,
  getDueSoonRows,
  getNotifications,
} from "../lib/debtCalculations";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "../lib/format";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { ProgressBar } from "../components/ProgressBar";
import { PageSkeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";

export function Dashboard() {
  const { loans, installments, activities, loading } = useDebt();

  const metrics = useMemo(
    () => getDashboardMetrics(loans, installments, activities),
    [activities, installments, loans],
  );
  const dueSoon = useMemo(() => getDueSoonRows(loans, installments, 15), [installments, loans]);
  const lenderSummary = useMemo(() => getDebtByLender(loans), [loans]);
  const notifications = useMemo(() => getNotifications(loans, installments).slice(0, 5), [installments, loans]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white sm:text-3xl">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Track repayment progress, upcoming obligations, lender exposure, and recent account movement.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <RefreshCw className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Last updated {formatDateTime(metrics.lastUpdated)}
          </span>
        </div>
      </div>

      {notifications.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-3">
          {notifications.slice(0, 3).map((notification) => (
            <Link
              key={notification.id}
              to={notification.loanId ? `/loans/${notification.loanId}` : "/loans"}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-950 dark:text-white">{notification.title}</p>
                    <StatusBadge status={notification.severity} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{notification.message}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <StatCard label="Active Loans" value={String(metrics.activeLoans)} helper="Excludes completed loans" icon={WalletCards} />
        <StatCard label="Remaining Debt" value={formatCurrency(metrics.remainingDebt)} icon={DollarSign} tone="red" />
        <StatCard label="Due This Month" value={formatCurrency(metrics.dueThisMonth)} icon={CalendarClock} tone="amber" />
        <StatCard label="Overall Progress" value={formatPercent(metrics.overallProgress)} helper="Paid across all loans" icon={TrendingUp} tone="green" />
        <StatCard label="Due Within 15 Days" value={formatCurrency(metrics.dueWithin15)} icon={Clock3} tone="amber" />
        <StatCard label="Due Within 30 Days" value={formatCurrency(metrics.dueWithin30)} icon={Clock3} tone="blue" />
        <StatCard label="Last Updated" value={formatDate(metrics.lastUpdated)} helper={formatDateTime(metrics.lastUpdated)} icon={RefreshCw} tone="slate" />
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Due Soon (15 Days)</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Upcoming unpaid installments and overdue payments that need attention.
            </p>
          </div>
          <Link className="text-sm font-semibold text-blue-600 hover:text-blue-700" to="/loans">
            View all loans
          </Link>
        </div>
        {dueSoon.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Loan ID</th>
                  <th className="px-4 py-3">Lender</th>
                  <th className="px-4 py-3">Loan Name</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Amount Due</th>
                  <th className="px-4 py-3">Remaining Balance</th>
                  <th className="px-4 py-3">Days Remaining</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dueSoon.map((row) => (
                  <tr
                    key={row.installment.id}
                    className={row.isOverdue ? "bg-red-50/60 dark:bg-red-950/20" : "bg-white dark:bg-slate-900"}
                  >
                    <td className="table-cell font-semibold">{row.loan.id}</td>
                    <td className="table-cell">{row.loan.lender}</td>
                    <td className="table-cell font-semibold text-slate-950 dark:text-white">{row.loan.loanName}</td>
                    <td className="table-cell">{formatDate(row.installment.dueDate)}</td>
                    <td className="table-cell font-semibold">{formatCurrency(row.installment.expectedAmount)}</td>
                    <td className="table-cell">{formatCurrency(row.loan.remainingBalance)}</td>
                    <td className="table-cell">
                      {row.daysRemaining < 0 ? `${Math.abs(row.daysRemaining)} days overdue` : `${row.daysRemaining} days`}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={row.isOverdue ? "overdue" : row.installment.status} />
                    </td>
                    <td className="table-cell">
                      <Link className="font-semibold text-blue-600 hover:text-blue-700" to={`/loans/${row.loan.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={CalendarClock}
              title="No payments due within 15 days"
              message="You are clear for the next two weeks. New due payments will appear here automatically."
            />
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Debt by Lender</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sorted by highest remaining balance.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Lender</th>
                  <th className="px-4 py-3">Loans</th>
                  <th className="px-4 py-3">Original Balance</th>
                  <th className="px-4 py-3">Remaining Balance</th>
                  <th className="px-4 py-3">Total Paid</th>
                  <th className="px-4 py-3">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lenderSummary.map((summary) => (
                  <tr key={summary.lender}>
                    <td className="table-cell font-semibold text-slate-950 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-blue-600" />
                        {summary.lender}
                      </div>
                    </td>
                    <td className="table-cell">{summary.numberOfLoans}</td>
                    <td className="table-cell">{formatCurrency(summary.originalBalance)}</td>
                    <td className="table-cell font-semibold">{formatCurrency(summary.remainingBalance)}</td>
                    <td className="table-cell">{formatCurrency(summary.totalPaid)}</td>
                    <td className="table-cell min-w-44">
                      <div className="flex items-center gap-3">
                        <ProgressBar value={summary.progress} />
                        <span className="text-xs font-semibold">{formatPercent(summary.progress)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Recent Activity</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Newest loan and payment actions first.</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activities.slice(0, 8).map((activity) => (
              <div key={activity.id} className="px-5 py-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{activity.description}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(activity.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
