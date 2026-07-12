import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDebt } from "../context/DebtContext";
import { cx } from "../lib/classes";
import { formatCurrency } from "../lib/format";
import { Button } from "./Button";
import { useToast } from "../context/ToastContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/loans", label: "Loans", icon: WalletCards },
  { to: "/completed", label: "Completed", icon: CheckCircle2 },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = window.localStorage.getItem("debt-tracker-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("debt-tracker-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return [isDark, setIsDark] as const;
}

export function AppShell() {
  const { user, signOut } = useAuth();
  const { loans, error, createLoan } = useDebt();
  const { notify } = useToast();
  const [isDark, setIsDark] = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return loans
      .filter((loan) =>
        [loan.id, loan.loanName, loan.lender, loan.notes].some((value) => value.toLowerCase().includes(term)),
      )
      .slice(0, 6);
  }, [loans, search]);

  const nav = (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cx(
                "focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
              )
            }
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-finance-surface text-slate-950 dark:bg-slate-950 dark:text-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white/90 px-4 py-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold">Debt Tracker</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loan command center</p>
          </div>
        </div>
        <div className="mt-8">{nav}</div>
        <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name || user?.email}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Supabase workspace
          </p>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/50 p-4 backdrop-blur-sm lg:hidden">
          <div className="h-full max-w-xs rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <CreditCard className="h-5 w-5" />
                </div>
                <p className="font-bold">Debt Tracker</p>
              </div>
              <button
                className="focus-ring rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8">{nav}</div>
          </div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-finance-surface/90 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="focus-ring rounded-xl p-2 text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search loans, lenders, IDs, or notes"
                className="focus-ring h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              {searchResults.length > 0 ? (
                <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
                  {searchResults.map((loan) => (
                    <button
                      key={loan.id}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => {
                        navigate(`/loans/${loan.id}`);
                        setSearch("");
                      }}
                    >
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{loan.loanName}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {loan.id} - {loan.lender}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(loan.remainingBalance)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="focus-ring hidden rounded-xl p-2.5 text-slate-600 transition hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900 sm:inline-flex"
              onClick={() => setIsDark((value) => !value)}
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Button
              type="button"
              className="hidden sm:inline-flex"
              onClick={async () => {
                const total = 4000;
                try {
                  const loan = await createLoan({
                    lender: "New Lender",
                    loanName: "New Loan",
                    loanType: "Personal Loan",
                    originalAmount: total,
                    interestRate: 7.5,
                    estimatedInterestAmount: 420,
                    installments: 12,
                    startDate: new Date().toISOString().slice(0, 10),
                    dueDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
                    remainingBalance: total + 420,
                    paymentFrequency: "Monthly",
                    gracePeriod: 3,
                    notes: "Created from quick add. Edit details from the loan page.",
                    status: "active",
                  });
                  navigate(`/loans/${loan.id}`);
                  notify({ severity: "success", title: "Loan created", message: "New Loan was added." });
                } catch (error) {
                  notify({
                    severity: "danger",
                    title: "Quick add failed",
                    message: error instanceof Error ? error.message : "Please try again.",
                  });
                }
              }}
            >
              <Plus className="h-4 w-4" />
              Quick Add
            </Button>
            <button
              type="button"
              className="focus-ring rounded-xl p-2.5 text-slate-600 transition hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900"
              onClick={() => void signOut()}
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          {error ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
              Supabase data could not be loaded: {error}
            </div>
          ) : null}
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
