import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, User } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function StaffPortal() {
  const { state } = useApp();
  
  const currentStaff = state.currentUser?.staffId 
    ? state.staff.find(s => s.id === state.currentUser.staffId)
    : null;

  const upcomingShifts = state.schedules
    .flatMap(s => s.shifts)
    .filter(shift => shift.staffId === currentStaff?.id)
    .slice(0, 5);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {currentStaff?.name || 'Staff Member'}!
            </h1>
            <p className="text-muted-foreground">View your schedule and manage your time</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{upcomingShifts.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming Shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Clock className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {upcomingShifts.reduce((total, shift) => total + shift.duration, 0).toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">Hours This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>My Schedule</CardTitle>
            <CardDescription>Your upcoming shifts and assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingShifts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No shifts scheduled</h3>
                <p className="text-muted-foreground">Check back later for your schedule</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingShifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                      <h4 className="font-medium">{shift.date.toLocaleDateString()}</h4>
                      <p className="text-sm text-muted-foreground">
                        {shift.startTime} - {shift.endTime} ({shift.duration}h)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${((shift.payRate || 15) * shift.duration).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Estimated pay</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}