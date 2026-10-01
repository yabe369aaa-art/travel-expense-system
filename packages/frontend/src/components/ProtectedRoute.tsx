import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  allowedRoles?: ('applicant' | 'coordinator' | 'admin')[];
  children?: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, user, isMfaRequired } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated && !isMfaRequired) {
      // Redirect to login with return URL
    }
  }, [isAuthenticated, isMfaRequired]);

  if (!isAuthenticated) {
    if (isMfaRequired) {
      return <Navigate to="/mfa" replace state={{ from: location }} />;
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}