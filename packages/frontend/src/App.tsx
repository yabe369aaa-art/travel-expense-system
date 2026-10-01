import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { ToastProvider } from '@/components/ui/toast';
import { initializeAuth, useAuthStore } from '@/stores/auth.store';
import { LoginPage } from '@/pages/LoginPage';
import { MfaPage } from '@/pages/MfaPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { Layout } from '@/components/Layout';
import { ApplicantDashboard } from '@/pages/applicant/Dashboard';
import { ApplicantApplicationList } from '@/pages/applicant/ApplicationList';
import { ApplicantApplicationDetail } from '@/pages/applicant/ApplicationDetail';
import { ApplicantApplicationNew } from '@/pages/applicant/ApplicationNew';
import { CoordinatorDashboard } from '@/pages/coordinator/Dashboard';
import { CoordinatorApplicationNew } from '@/pages/coordinator/ApplicationNew';
import { AdminPendingList } from '@/pages/admin/PendingList';
import { AdminApplicationDetail } from '@/pages/admin/ApplicationDetail';
import { AdminApprovedList } from '@/pages/admin/ApprovedList';
import { AdminTransferAssist } from '@/pages/admin/TransferAssist';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

initializeAuth();

function AppRoutes() {
  const { isAuthenticated, user, isMfaRequired } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/mfa" element={isMfaRequired ? <MfaPage /> : <Navigate to="/login" replace />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Applicant Routes */}
        <Route 
          path="/dashboard" 
          element={
            user?.role === 'applicant' ? <ApplicantDashboard /> :
            user?.role === 'coordinator' ? <CoordinatorDashboard /> :
            <AdminPendingList />
          } 
        />
        
        <Route 
          path="/applications" 
          element={user?.role === 'applicant' ? <ApplicantApplicationList /> : <Navigate to="/dashboard" replace />}
        />
        <Route 
          path="/applications/new" 
          element={user?.role === 'applicant' ? <ApplicantApplicationNew /> : <Navigate to="/dashboard" replace />}
        />
        <Route 
          path="/applications/:id" 
          element={user?.role === 'applicant' ? <ApplicantApplicationDetail /> : <Navigate to="/dashboard" replace />}
        />

        {/* Coordinator Routes */}
        <Route 
          path="/coordinator/applications/new" 
          element={(user?.role === 'coordinator' || user?.role === 'admin') ? <CoordinatorApplicationNew /> : <Navigate to="/dashboard" replace />}
        />

        {/* Admin Routes */}
        <Route 
          path="/admin/pending" 
          element={user?.role === 'admin' ? <AdminPendingList /> : <Navigate to="/dashboard" replace />}
        />
        <Route 
          path="/admin/approved" 
          element={user?.role === 'admin' ? <AdminApprovedList /> : <Navigate to="/dashboard" replace />}
        />
        <Route 
          path="/admin/applications/:id" 
          element={user?.role === 'admin' ? <AdminApplicationDetail /> : <Navigate to="/dashboard" replace />}
        />
        <Route 
          path="/admin/applications/:id/transfer" 
          element={user?.role === 'admin' ? <AdminTransferAssist /> : <Navigate to="/dashboard" replace />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AppRoutes />
          <Toaster />
        </ToastProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}