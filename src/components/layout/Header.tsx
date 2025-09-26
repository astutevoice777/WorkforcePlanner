import React from 'react';
import { Bell, User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch({ type: 'SET_CURRENT_USER', payload: null });
    navigate('/login');
  };

  const getUserInitials = () => {
    if (state.currentUser?.role === 'OWNER') {
      return state.business?.name?.charAt(0).toUpperCase() || 'O';
    }
    if (state.currentUser?.staffId) {
      const staff = state.staff.find(s => s.id === state.currentUser?.staffId);
      return staff?.name?.charAt(0).toUpperCase() || 'S';
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    if (state.currentUser?.role === 'OWNER') {
      return state.business?.name || 'Business Owner';
    }
    if (state.currentUser?.staffId) {
      const staff = state.staff.find(s => s.id === state.currentUser?.staffId);
      return staff?.name || 'Staff Member';
    }
    return 'User';
  };

  return (
    <header className="bg-card border-b border-border shadow-card sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">
              ShiftAI
            </h1>
          </div>
          {state.business && (
            <div className="hidden md:block">
              <span className="text-sm text-muted-foreground">•</span>
              <span className="ml-2 text-sm font-medium text-foreground">
                {state.business.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
              2
            </span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-primary text-white text-sm font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium">
                  {getUserDisplayName()}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}