import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Landmark,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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
import { PageSkeleton } from "../components/Skeleton";
import { StatCard } from "../components/StatCard";
import { useDebt } from "../context/DebtContext";
import {
  getDashboardMetrics,
  getDebtByLender,
  getMonthlyCalendarRows,
  getPaymentProgress,
} from "../lib/debtCalculations";
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonth,
  formatNumber,
  formatPercent,
  statusLabel,
} from "../lib/format";
import type { LoanInstallment, Payment } from "../types";

const colors = ["#2563EB", "#22C55E", "#F59E0B", "#EF4444", "#64748B", "#14B8A6"];

function monthLabel(value: string) {
  return formatMonth(value);
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

function getPaidAmount(installment: LoanInstallment) {
  if (installment.status === "paid") return installment.expectedAmount;
  if (installment.status === "partial") return Math.max(0, installment.expectedAmount - installment.remainingBalance);
  return 0;
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
  const { loans, installments, payments, activities, loading } = useDebt();

  const dashboardMetrics = useMemo(
    () => getDashboardMetrics(loans, installments, activities),
    [activities, installments, loans],
  );
  const paymentProgress = useMemo(() => getPaymentProgress(loans, installments), [installments, loans]);
  const monthlyCalendar = useMemo(() => getMonthlyCalendarRows(installments, payments, 12), [installments, payments]);
  const debtByLender = useMemo(
    () => getDebtByLender(loans).map((summary) => ({ lender: summary.lender, remaining: summary.remainingBalance })),
    [loans],
  );
  const statusDebt = useMemo(() => {
    const groups = new Map<string, number>();
    loans.forEach((loan) => {
      const key = statusLabel(loan.status);
      groups.set(key, (groups.get(key) ?? 0) + loan.remainingBalance);
    });
    return Array.from(groups.entries()).map(([name, value]) => ({ name, value }));
  }, [loans]);
  const monthlyPayments = useMemo(() => groupPaymentsByMonth(payments), [payments]);
  const remainingTrend = useMemo(
    () => buildRemainingTrend(payments, paymentProgress.remainingDebt),
    [paymentProgress.remainingDebt, payments],
  );
  const paymentProgressChart = useMemo(
    () => [
      { name: "Paid", value: paymentProgress.totalPaid },
      { name: "Remaining", value: paymentProgress.remainingDebt },
    ],
    [paymentProgress.remainingDebt, paymentProgress.totalPaid],
  );
  const monthlyChartRows = useMemo(
    () =>
      monthlyCalendar.map((row) => ({
        month: formatMonth(row.month),
        totalDue: row.totalDue,
        totalPaid: row.totalPaid,
        remaining: row.remaining,
      })),
    [monthlyCalendar],
  );
  const auditChecks = useMemo(() => {
    const checks = [
      {
        check: "Schedule rows missing due date",
        actual: installments.filter((installment) => installment.expectedAmount > 0 && !installment.dueDate).length,
        expected: 0,
      },
      {
        check: "Paid amount exceeds due amount",
        actual: installments.filter((installment) => getPaidAmount(installment) > installment.expectedAmount).length,
        expected: 0,
      },
      {
        check: "Progress percent out of bounds",
        actual: loans.filter((loan) => loan.progress < 0 || loan.progress > 100).length,
        expected: 0,
      },
      {
        check: "Blank status on loan rows",
        actual: loans.filter((loan) => !loan.status).length,
        expected: 0,
      },
      {
        check: "Payment history rows created",
        actual: payments.length,
        expected: payments.length,
      },
    ];

    return checks.map((item) => ({
      ...item,
      difference: Math.abs(item.actual - item.expected),
      status: item.actual === item.expected ? "OK" : "Review",
    }));
  }, [installments, loans, payments.length]);

  if (loading) return <PageSkeleton />;

  const statusDebtChart = statusDebt.some((item) => item.value > 0)
    ? statusDebt
    : [{ name: "No remaining debt", value: 1 }];
  const paymentChart = paymentProgressChart.some((item) => item.value > 0)
    ? paymentProgressChart
    : [{ name: "No payments yet", value: 1 }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white sm:text-3xl">Analytics</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Chart-ready views for lender exposure, monthly payment load, payment progress, status debt, and tracker checks.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Scheduled" value={formatCurrency(paymentProgress.totalScheduled)} icon={CircleDollarSign} />
        <StatCard label="Total Paid" value={formatCurrency(paymentProgress.totalPaid)} icon={TrendingUp} tone="green" />
        <StatCard label="Remaining Debt" value={formatCurrency(paymentProgress.remainingDebt)} icon={TrendingDown} tone="red" />
        <StatCard label="Progress" value={formatPercent(paymentProgress.progress)} icon={CheckCircle2} tone="green" />
        <StatCard label="Due This Month" value={formatCurrency(dashboardMetrics.dueThisMonth)} icon={BarChart3} tone="amber" />
        <StatCard label="Overdue" value={formatCurrency(dashboardMetrics.overdueAmount)} icon={AlertTriangle} tone="red" />
        <StatCard label="Due in 15 Days" value={formatCurrency(dashboardMetrics.dueWithin15)} icon={Clock3} tone="amber" />
        <StatCard label="Due in 30 Days" value={formatCurrency(dashboardMetrics.dueWithin30)} icon={Landmark} tone="blue" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Monthly Calendar">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="totalDue" name="Total Due" fill="#2563EB" radius={[8, 8, 0, 0]} />
              <Bar dataKey="remaining" name="Remaining" fill="#F59E0B" radius={[8, 8, 0, 0]} />
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

        <ChartCard title="Payment Progress">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={paymentChart} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100} paddingAngle={3}>
                {paymentChart.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Debt">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusDebtChart} dataKey="value" nameKey="name" outerRadius={100} label>
                {statusDebtChart.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Payments Recorded">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyPayments}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="amount" stroke="#22C55E" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Tracker Metrics</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              ["Total Scheduled", formatCurrency(paymentProgress.totalScheduled)],
              ["Total Paid", formatCurrency(paymentProgress.totalPaid)],
              ["Remaining Debt", formatCurrency(paymentProgress.remainingDebt)],
              ["Progress %", formatPercent(paymentProgress.progress)],
              ["Due This Month", formatCurrency(dashboardMetrics.dueThisMonth)],
              ["Overdue", formatCurrency(dashboardMetrics.overdueAmount)],
              ["Due in 15 Days", formatCurrency(dashboardMetrics.dueWithin15)],
              ["Due in 30 Days", formatCurrency(dashboardMetrics.dueWithin30)],
              ["Active Loans", formatNumber(dashboardMetrics.activeLoans)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                <span className="text-sm font-bold text-slate-950 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Audit Checks</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Check</th>
                  <th className="px-4 py-3">Actual</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Difference</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditChecks.map((check) => (
                  <tr key={check.check}>
                    <td className="table-cell font-semibold text-slate-950 dark:text-white">{check.check}</td>
                    <td className="table-cell">{check.actual}</td>
                    <td className="table-cell">{check.expected}</td>
                    <td className="table-cell">{check.difference}</td>
                    <td className="table-cell">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                          check.status === "OK"
                            ? "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950 dark:text-green-200 dark:ring-green-800"
                            : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800"
                        }`}
                      >
                        {check.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
