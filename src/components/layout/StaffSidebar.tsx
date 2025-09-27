import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Calendar, 
  Clock,
  UserCheck,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStaffAuth } from '@/hooks/useStaffAuth';

const staffNavItems = [
  {
    title: 'My Schedule',
    href: '/staff-portal',
    icon: Calendar,
  },
  {
    title: 'Time Off Requests',
    href: '/staff-portal/time-off',
    icon: Clock,
  },
  {
    title: 'Profile',
    href: '/staff-portal/profile',
    icon: UserCheck,
  },
];

export function StaffSidebar() {
  const { signOut } = useStaffAuth();

  const handleLogout = () => {
    signOut();
    window.location.href = '/staff-auth';
  };

  return (
    <aside className="w-64 bg-card border-r border-border shadow-card">
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground">Staff Portal</h2>
          <p className="text-sm text-muted-foreground">Employee Dashboard</p>
        </div>
        
        <nav className="space-y-2">
          {staffNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-smooth',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </NavLink>
          ))}
          
          <div className="pt-4 mt-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-smooth"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}
