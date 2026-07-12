import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AppShell } from "./components/AppShell";
import { PageSkeleton } from "./components/Skeleton";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DebtProvider } from "./context/DebtContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthPage } from "./pages/AuthPage";

const Dashboard = lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const LoansPage = lazy(() => import("./pages/LoansPage").then((module) => ({ default: module.LoansPage })));
const LoanDetailsPage = lazy(() =>
  import("./pages/LoanDetailsPage").then((module) => ({ default: module.LoanDetailsPage })),
);
const CompletedLoansPage = lazy(() =>
  import("./pages/CompletedLoansPage").then((module) => ({ default: module.CompletedLoansPage })),
);
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })));

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-finance-surface p-6 dark:bg-slate-950">
        <PageSkeleton />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <DebtProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Suspense
          fallback={
            <div className="p-6">
              <PageSkeleton />
            </div>
          }
        >
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="loans" element={<LoansPage />} />
              <Route path="loans/:loanId" element={<LoanDetailsPage />} />
              <Route path="completed" element={<CompletedLoansPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DebtProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ProtectedApp />
      </ToastProvider>
    </AuthProvider>
  );
}
