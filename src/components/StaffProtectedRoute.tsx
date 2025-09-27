import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface StaffProtectedRouteProps {
  children: React.ReactNode;
}

export function StaffProtectedRoute({ children }: StaffProtectedRouteProps) {
  const { staffUser, loading, error } = useStaffAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Authentication Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Navigate to="/staff-auth" replace />
        </div>
      </div>
    );
  }

  if (!staffUser) {
    return <Navigate to="/staff-auth" replace />;
  }

  return <>{children}</>;
}
