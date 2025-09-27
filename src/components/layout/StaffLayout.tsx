import React from 'react';
import { StaffSidebar } from './StaffSidebar';
import { StaffHeader } from './StaffHeader';

interface StaffLayoutProps {
  children: React.ReactNode;
}

export function StaffLayout({ children }: StaffLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <StaffHeader />
      <div className="flex">
        <StaffSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
