import { CheckCircle2, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/Skeleton";
import { useDebt } from "../context/DebtContext";
import { getCompletedLoans } from "../lib/debtCalculations";
import { formatCurrency, formatDate } from "../lib/format";

export function CompletedLoansPage() {
  const { loans, loading } = useDebt();
  const completed = useMemo(() => getCompletedLoans(loans), [loans]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white sm:text-3xl">Completed Loans</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Paid-off loans are archived here and excluded from active debt totals.
        </p>
      </div>

      <section className="card overflow-hidden">
        {completed.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Loan ID</th>
                  <th className="px-4 py-3">Lender</th>
                  <th className="px-4 py-3">Loan Name</th>
                  <th className="px-4 py-3">Total Borrowed</th>
                  <th className="px-4 py-3">Total Interest</th>
                  <th className="px-4 py-3">Total Paid</th>
                  <th className="px-4 py-3">Completion Date</th>
                  <th className="px-4 py-3">Loan Duration</th>
                  <th className="px-4 py-3">View Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {completed.map((summary) => (
                  <tr key={summary.loan.id}>
                    <td className="table-cell font-semibold">{summary.loan.id}</td>
                    <td className="table-cell">{summary.loan.lender}</td>
                    <td className="table-cell font-semibold text-slate-950 dark:text-white">{summary.loan.loanName}</td>
                    <td className="table-cell">{formatCurrency(summary.totalBorrowed)}</td>
                    <td className="table-cell">{formatCurrency(summary.totalInterest)}</td>
                    <td className="table-cell font-semibold">{formatCurrency(summary.totalPaid)}</td>
                    <td className="table-cell">{formatDate(summary.completionDate)}</td>
                    <td className="table-cell">{summary.loanDuration}</td>
                    <td className="table-cell">
                      <Link
                        className="focus-ring inline-flex items-center gap-2 rounded-lg px-2 py-1.5 font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        to={`/loans/${summary.loan.id}`}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={CheckCircle2}
              title="No completed loans yet"
              message="When a remaining balance reaches zero, the loan will automatically move into this page."
            />
          </div>
        )}
      </section>
    </div>
  );
}
