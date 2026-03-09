import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/queryClient';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';
import { TabLayout } from '@/shared/components';
import { UserSelectionPage } from '@/features/user-selection/UserSelectionPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CleaningChecklist } from '@/features/cleaning/CleaningChecklist';
import { ShoppingList } from '@/features/shopping/ShoppingList';
import { FinanceTracker } from '@/features/finance/FinanceTracker';

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
            element={
              <RequireUser>
                <TabLayout />
              </RequireUser>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/cleaning" element={<CleaningChecklist />} />
            <Route path="/shopping" element={<ShoppingList />} />
            <Route path="/finance" element={<FinanceTracker />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
