import React from 'react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { User } from 'lucide-react';

export function StaffHeader() {
  const { staffUser } = useStaffAuth();

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">AI Staff Maker</h1>
              <p className="text-sm text-muted-foreground">Staff Portal</p>
            </div>
          </div>
          
          {staffUser && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{staffUser.name}</p>
                <p className="text-xs text-muted-foreground">{staffUser.email}</p>
              </div>
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-accent-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
