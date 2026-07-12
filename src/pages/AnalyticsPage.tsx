import { BarChart3, Calculator, CircleDollarSign, Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ProgressBar } from "../components/ProgressBar";
import { PageSkeleton } from "../components/Skeleton";
import { StatCard } from "../components/StatCard";
import { useDebt } from "../context/DebtContext";
import { getDebtByLender } from "../lib/debtCalculations";
import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent, statusLabel } from "../lib/format";
import type { LoanInstallment, Payment } from "../types";

const colors = ["#2563EB", "#22C55E", "#F59E0B", "#EF4444", "#64748B", "#14B8A6"];

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(new Date(value));
}

function groupPaymentsByMonth(payments: Payment[]) {
  const groups = new Map<string, number>();
  payments.forEach((payment) => {
    const key = payment.paymentDate.slice(0, 7);
    groups.set(key, (groups.get(key) ?? 0) + payment.amountPaid);
  });
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month: monthLabel(`${month}-01`), amount }));
}

function groupUpcomingByMonth(installments: LoanInstallment[]) {
  const groups = new Map<string, number>();
  installments
    .filter((installment) => installment.status !== "paid")
    .forEach((installment) => {
      const key = installment.dueDate.slice(0, 7);
      groups.set(key, (groups.get(key) ?? 0) + installment.expectedAmount);
    });
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 8)
    .map(([month, amount]) => ({ month: monthLabel(`${month}-01`), amount }));
}

function buildRemainingTrend(payments: Payment[], currentRemaining: number) {
  const sorted = [...payments].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  const totalPaid = sorted.reduce((sum, payment) => sum + payment.amountPaid, 0);
  let running = currentRemaining + totalPaid;

  const trend = sorted.map((payment) => {
    running -= payment.amountPaid;
    return {
      date: monthLabel(payment.paymentDate),
      remaining: running,
    };
  });

  return trend.length > 0 ? trend : [{ date: "Current", remaining: currentRemaining }];
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
      <div className="mt-4 h-72">{children}</div>
    </section>
  );
}

export function AnalyticsPage() {
  const { loans, installments, payments, loading } = useDebt();

  const analytics = useMemo(() => {
    const activeLoans = loans.filter((loan) => loan.status !== "completed");
    const completedLoans = loans.filter((loan) => loan.status === "completed");
    const overdueLoans = loans.filter((loan) => loan.status === "overdue");
    const totalBorrowed = loans.reduce((sum, loan) => sum + loan.originalAmount, 0);
    const totalInterest = loans.reduce((sum, loan) => sum + loan.estimatedInterestAmount, 0);
    const totalPaid = loans.reduce((sum, loan) => sum + loan.amountPaid, 0);
    const remainingDebt = activeLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    const averageMonthlyPayment =
      activeLoans.length > 0 ? activeLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0) / activeLoans.length : 0;
    const averageInterestRate =
      loans.length > 0 ? loans.reduce((sum, loan) => sum + loan.interestRate, 0) / loans.length : 0;
    const highestLoan = loans.reduce((highest, loan) => (loan.originalAmount > highest.originalAmount ? loan : highest), loans[0]);
    const lowestLoan = loans.reduce((lowest, loan) => (loan.originalAmount < lowest.originalAmount ? loan : lowest), loans[0]);
    const paidInstallments = installments.filter((installment) => installment.status === "paid").length;
    const completionRate = installments.length > 0 ? (paidInstallments / installments.length) * 100 : 0;

    return {
      activeLoans,
      completedLoans,
      overdueLoans,
      totalBorrowed,
      totalInterest,
      totalPaid,
      remainingDebt,
      averageMonthlyPayment,
      averageInterestRate,
      highestLoan,
      lowestLoan,
      completionRate,
    };
  }, [installments, loans]);

  const debtByLender = useMemo(
    () => getDebtByLender(loans).map((summary) => ({ lender: summary.lender, remaining: summary.remainingBalance })),
    [loans],
  );
  const statusDistribution = useMemo(() => {
    const groups = new Map<string, number>();
    loans.forEach((loan) => groups.set(statusLabel(loan.status), (groups.get(statusLabel(loan.status)) ?? 0) + 1));
    return Array.from(groups.entries()).map(([name, value]) => ({ name, value }));
  }, [loans]);
  const monthlyPayments = useMemo(() => groupPaymentsByMonth(payments), [payments]);
  const remainingTrend = useMemo(() => buildRemainingTrend(payments, analytics.remainingDebt), [analytics.remainingDebt, payments]);
  const upcomingDue = useMemo(() => groupUpcomingByMonth(installments), [installments]);
  const principalInterest = useMemo(
    () => [
      { name: "Principal Paid", value: payments.reduce((sum, payment) => sum + payment.principalPaid, 0) },
      { name: "Interest Paid", value: payments.reduce((sum, payment) => sum + payment.interestPaid, 0) },
    ],
    [payments],
  );

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white sm:text-3xl">Analytics</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Visualize repayment velocity, lender concentration, status health, and upcoming obligations.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Borrowed" value={formatCurrency(analytics.totalBorrowed)} icon={CircleDollarSign} />
        <StatCard label="Total Interest" value={formatCurrency(analytics.totalInterest)} icon={Calculator} tone="amber" />
        <StatCard label="Total Paid" value={formatCurrency(analytics.totalPaid)} icon={TrendingUp} tone="green" />
        <StatCard label="Remaining Debt" value={formatCurrency(analytics.remainingDebt)} icon={TrendingDown} tone="red" />
        <StatCard label="Average Monthly Payment" value={formatCurrency(analytics.averageMonthlyPayment)} icon={BarChart3} />
        <StatCard label="Average Interest Rate" value={`${analytics.averageInterestRate.toFixed(2)}%`} icon={Calculator} tone="amber" />
        <StatCard label="Active Loans" value={formatNumber(analytics.activeLoans.length)} icon={Landmark} />
        <StatCard label="Completed Loans" value={formatNumber(analytics.completedLoans.length)} icon={TrendingUp} tone="green" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <p className="muted-label">Highest Loan</p>
          <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">
            {analytics.highestLoan?.loanName ?? "None"}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {formatCurrency(analytics.highestLoan?.originalAmount ?? 0)}
          </p>
        </div>
        <div className="card p-5">
          <p className="muted-label">Lowest Loan</p>
          <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{analytics.lowestLoan?.loanName ?? "None"}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {formatCurrency(analytics.lowestLoan?.originalAmount ?? 0)}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="muted-label">Payment Completion Rate</p>
              <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{formatPercent(analytics.completionRate)}</p>
            </div>
            <p className="text-sm font-semibold text-red-600">{analytics.overdueLoans.length} overdue</p>
          </div>
          <ProgressBar value={analytics.completionRate} className="mt-4" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Monthly Debt Payments">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyPayments}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="amount" fill="#2563EB" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Remaining Debt Trend">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={remainingTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area type="monotone" dataKey="remaining" stroke="#2563EB" fill="#DBEAFE" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Debt by Lender">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={debtByLender} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(Number(value))} />
              <YAxis type="category" dataKey="lender" width={120} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="remaining" fill="#2563EB" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Loan Status Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100} paddingAngle={3}>
                {statusDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Interest vs Principal Paid">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={principalInterest} dataKey="value" nameKey="name" outerRadius={100} label>
                {principalInterest.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Upcoming Due Amounts">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={upcomingDue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="amount" stroke="#F59E0B" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  );
}
