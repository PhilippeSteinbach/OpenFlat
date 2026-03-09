import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/queryClient';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';
import { UserSelectionPage } from '@/features/user-selection/UserSelectionPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';

function RequireUser({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UserSelectionPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireUser>
                <DashboardPage />
              </RequireUser>
            }
          />
          <Route
            path="/cleaning"
            element={
              <RequireUser>
                <div>Cleaning Board (coming soon)</div>
              </RequireUser>
            }
          />
          <Route
            path="/shopping"
            element={
              <RequireUser>
                <div>Shopping List (coming soon)</div>
              </RequireUser>
            }
          />
          <Route
            path="/finance"
            element={
              <RequireUser>
                <div>Finance Tracker (coming soon)</div>
              </RequireUser>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
