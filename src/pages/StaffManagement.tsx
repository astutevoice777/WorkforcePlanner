import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, Clock, Mail, Phone } from 'lucide-react';
import { useStaff, useBusiness } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Staff, StaffAvailability, TimeSlot } from '@/types/scheduling';

const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const dayLabels = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', 
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
};

const defaultAvailability: StaffAvailability = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: []
};

export default function StaffManagement() {
  const { staff, addStaff, updateStaff, deleteStaff } = useStaff();
  const { business } = useBusiness();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<Partial<Staff>>({
    name: '',
    email: '',
    phone: '',
    roles: [],
    availability: defaultAvailability,
    constraints: {
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      minHoursBetweenShifts: 12,
      preferredDaysOff: []
    },
    isActive: true
  });

  const openAddDialog = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      roles: [],
      availability: defaultAvailability,
      constraints: {
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        minHoursBetweenShifts: 12,
        preferredDaysOff: []
      },
      isActive: true
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData(staffMember);
    setIsDialogOpen(true);
  };

  const handleInputChange = (field: keyof Staff, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const newRoles = checked 
      ? [...(formData.roles || []), roleId]
      : (formData.roles || []).filter(id => id !== roleId);
    
    handleInputChange('roles', newRoles);
  };

  const handleAvailabilityChange = (day: keyof StaffAvailability, timeSlots: TimeSlot[]) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability!,
        [day]: timeSlots
      }
    }));
  };

  const addTimeSlot = (day: keyof StaffAvailability) => {
    const currentSlots = formData.availability![day] || [];
    const newSlot: TimeSlot = { startTime: '09:00', endTime: '17:00' };
    handleAvailabilityChange(day, [...currentSlots, newSlot]);
  };

  const removeTimeSlot = (day: keyof StaffAvailability, index: number) => {
    const currentSlots = formData.availability![day] || [];
    const newSlots = currentSlots.filter((_, i) => i !== index);
    handleAvailabilityChange(day, newSlots);
  };

  const updateTimeSlot = (day: keyof StaffAvailability, index: number, field: keyof TimeSlot, value: string) => {
    const currentSlots = [...(formData.availability![day] || [])];
    currentSlots[index] = { ...currentSlots[index], [field]: value };
    handleAvailabilityChange(day, currentSlots);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in name, email, and phone number.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.roles!.length === 0) {
      toast({
        title: 'No roles selected',
        description: 'Please select at least one role for this staff member.',
        variant: 'destructive',
      });
      return;
    }

    const staffData: Staff = {
      id: editingStaff?.id || `staff-${Date.now()}`,
      name: formData.name!,
      email: formData.email!,
      phone: formData.phone!,
      roles: formData.roles!,
      availability: formData.availability!,
      constraints: formData.constraints!,
      isActive: formData.isActive!,
      createdAt: editingStaff?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (editingStaff) {
      updateStaff(staffData);
      toast({
        title: 'Staff updated',
        description: `${staffData.name}'s information has been updated.`,
      });
    } else {
      addStaff(staffData);
      toast({
        title: 'Staff added',
        description: `${staffData.name} has been added to your team.`,
      });
    }

    setIsDialogOpen(false);
  };

  const handleDeleteStaff = (staffMember: Staff) => {
    deleteStaff(staffMember.id);
    toast({
      title: 'Staff removed',
      description: `${staffMember.name} has been removed from your team.`,
    });
  };

  const getRoleNames = (roleIds: string[]) => {
    return roleIds
      .map(id => business?.roles.find(r => r.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const getAvailabilityDays = (availability: StaffAvailability) => {
    return weekDays
      .filter(day => availability[day] && availability[day].length > 0)
      .map(day => dayLabels[day])
      .join(', ');
  };

  const getTotalWeeklyHours = (availability: StaffAvailability) => {
    return weekDays.reduce((total, day) => {
      const slots = availability[day] || [];
      const dayHours = slots.reduce((dayTotal, slot) => {
        const start = slot.startTime.split(':');
        const end = slot.endTime.split(':');
        const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
        const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
        return dayTotal + (endMinutes - startMinutes) / 60;
      }, 0);
      return total + dayHours;
    }, 0);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
              <p className="text-muted-foreground">Manage your team and their availability</p>
            </div>
          </div>
          
          <Button onClick={openAddDialog} variant="gradient">
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>

        {/* Staff Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{staff.length}</p>
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {staff.reduce((total, s) => total + getTotalWeeklyHours(s.availability), 0).toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Weekly Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {staff.filter(s => s.isActive).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Staff</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              View and manage your staff members and their availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No staff members yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first staff member to get started with scheduling
                </p>
                <Button onClick={openAddDialog} variant="gradient">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {staff.map((staffMember) => (
                  <div key={staffMember.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-smooth">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {staffMember.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{staffMember.name}</h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{staffMember.email}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{staffMember.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <div className="flex flex-wrap gap-1">
                          {staffMember.roles.map(roleId => {
                            const role = business?.roles.find(r => r.id === roleId);
                            return role ? (
                              <Badge key={roleId} variant="outline" style={{ borderColor: role.color }}>
                                {role.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                        <Badge variant="secondary">
                          {getAvailabilityDays(staffMember.availability)}
                        </Badge>
                        <Badge variant="outline">
                          {getTotalWeeklyHours(staffMember.availability).toFixed(1)}h/week
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(staffMember)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStaff(staffMember)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Staff Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
              <DialogDescription>
                {editingStaff 
                  ? 'Update staff member information and availability'
                  : 'Add a new team member with their roles and availability'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff-name">Name *</Label>
                    <Input
                      id="staff-name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-email">Email *</Label>
                    <Input
                      id="staff-email"
                      type="email"
                      placeholder="john@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-phone">Phone *</Label>
                    <Input
                      id="staff-phone"
                      placeholder="+1 555-0123"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-4">
                <h4 className="font-medium">Roles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {business?.roles.map(role => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={formData.roles?.includes(role.id)}
                        onCheckedChange={(checked) => handleRoleToggle(role.id, checked as boolean)}
                      />
                      <Label htmlFor={`role-${role.id}`} className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.color }}
                          />
                          <span>{role.name}</span>
                          <span className="text-sm text-muted-foreground">(${role.hourlyRate}/hr)</span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-4">
                <h4 className="font-medium">Availability</h4>
                <div className="space-y-4">
                  {weekDays.map(day => (
                    <div key={day} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium capitalize">{day}</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTimeSlot(day)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Time
                        </Button>
                      </div>
                      
                      {formData.availability![day]?.map((slot, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateTimeSlot(day, index, 'startTime', e.target.value)}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateTimeSlot(day, index, 'endTime', e.target.value)}
                            className="w-32"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTimeSlot(day, index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      
                      {(!formData.availability![day] || formData.availability![day].length === 0) && (
                        <p className="text-sm text-muted-foreground">Not available</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Constraints */}
              <div className="space-y-4">
                <h4 className="font-medium">Work Constraints</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-hours-day">Max Hours Per Day</Label>
                    <Input
                      id="max-hours-day"
                      type="number"
                      min="1"
                      max="12"
                      value={formData.constraints?.maxHoursPerDay}
                      onChange={(e) => handleInputChange('constraints', {
                        ...formData.constraints!,
                        maxHoursPerDay: parseInt(e.target.value) || 8
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-hours-week">Max Hours Per Week</Label>
                    <Input
                      id="max-hours-week"
                      type="number"
                      min="1"
                      max="60"
                      value={formData.constraints?.maxHoursPerWeek}
                      onChange={(e) => handleInputChange('constraints', {
                        ...formData.constraints!,
                        maxHoursPerWeek: parseInt(e.target.value) || 40
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min-hours-between">Min Hours Between Shifts</Label>
                    <Input
                      id="min-hours-between"
                      type="number"
                      min="0"
                      max="24"
                      value={formData.constraints?.minHoursBetweenShifts}
                      onChange={(e) => handleInputChange('constraints', {
                        ...formData.constraints!,
                        minHoursBetweenShifts: parseInt(e.target.value) || 12
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="gradient">
                  {editingStaff ? 'Update Staff' : 'Add Staff'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}