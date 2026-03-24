import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'merchant' | 'agent';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, isLoading, totpEnabled, totpVerified } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If TOTP status is still loading, show loader
  if (totpEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying security...</p>
        </div>
      </div>
    );
  }

  // If TOTP is not set up, force setup
  if (!totpEnabled) {
    return <Navigate to="/totp-setup" replace />;
  }

  // If TOTP is enabled but not verified this session, redirect to login
  if (totpEnabled && !totpVerified) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (role === 'agent') {
      return <Navigate to="/agent" replace />;
    } else if (role === 'merchant') {
      return <Navigate to="/merchant" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
