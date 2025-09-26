import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Building, Bot, ArrowRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { state } = useApp();
  const navigate = useNavigate();

  const quickStats = {
    totalStaff: state.staff.length,
    totalSchedules: state.schedules.length,
    totalShifts: state.schedules.reduce((total, s) => total + s.shifts.length, 0),
    weeklyHours: state.schedules.reduce((total, s) => 
      total + s.shifts.reduce((shiftTotal, shift) => shiftTotal + shift.duration, 0), 0
    )
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center">
              <Bot className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to ShiftAI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered workforce planning for small shops. Generate optimized schedules, 
            manage staff, and streamline operations with intelligent automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{quickStats.totalStaff}</p>
                  <p className="text-sm text-muted-foreground">Staff Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{quickStats.totalSchedules}</p>
                  <p className="text-sm text-muted-foreground">Schedules</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{quickStats.totalShifts}</p>
                  <p className="text-sm text-muted-foreground">Total Shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Bot className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{quickStats.weeklyHours.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Weekly Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => navigate('/business-setup')} 
                variant="gradient" 
                className="w-full justify-between"
              >
                <span>Configure Business</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => navigate('/staff')} 
                variant="accent" 
                className="w-full justify-between"
              >
                <span>Manage Staff</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => navigate('/schedule')} 
                variant="outline" 
                className="w-full justify-between"
              >
                <span>Generate Schedule</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle>Business Overview</CardTitle>
              <CardDescription>
                {state.business?.name || 'Set up your business to get started'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {state.business ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Business Hours</span>
                    <span className="font-medium">
                      {Object.values(state.business.businessHours).filter(day => day.isOpen).length} days/week
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Roles Defined</span>
                    <span className="font-medium">{state.business.roles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Staff</span>
                    <span className="font-medium">{state.staff.filter(s => s.isActive).length}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Complete your business setup to unlock all features
                  </p>
                  <Button onClick={() => navigate('/business-setup')} variant="gradient">
                    Start Setup
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
