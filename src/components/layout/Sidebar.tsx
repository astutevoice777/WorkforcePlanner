import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  Settings, 
  BarChart3, 
  Clock,
  Building,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

const ownerNavItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: BarChart3,
  },
  {
    title: 'Business Setup',
    href: '/business-setup',
    icon: Building,
  },
  {
    title: 'Staff Management',
    href: '/staff',
    icon: Users,
  },
  {
    title: 'Schedule',
    href: '/schedule',
    icon: Calendar,
  },
  {
    title: 'Time Off',
    href: '/time-off',
    icon: Clock,
  },
];

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

export function Sidebar() {
  const { state } = useApp();
  
  const navItems = state.currentUser?.role === 'OWNER' ? ownerNavItems : staffNavItems;

  return (
    <aside className="w-64 bg-card border-r border-border shadow-card">
      <div className="p-6">
        <nav className="space-y-2">
          {navItems.map((item) => (
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
        </nav>
      </div>
    </aside>
  );
}