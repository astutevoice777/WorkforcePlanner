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
import { useStaff } from '@/hooks/useStaff';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';

export default function StaffManagement() {
  const { staff, addStaff, updateStaff, deleteStaff, loading } = useStaff();
  const { business, roles } = useBusiness();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roles: [] as string[],
    availability: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    },
    constraints: {
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      minHoursBetweenShifts: 12
    },
    is_active: true
  });
  // Raw text state for availability inputs (so typing is smooth)
  const [availabilityText, setAvailabilityText] = useState<Record<string, string>>({
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: ''
  });

  const openAddDialog = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      roles: [],
      availability: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      },
      constraints: {
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        minHoursBetweenShifts: 12
      },
      is_active: true
    });
    setAvailabilityText({
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (staffMember: any) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      roles: staffMember.roles || [],
      availability: staffMember.availability || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      },
      constraints: staffMember.constraints || {
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        minHoursBetweenShifts: 12
      },
      is_active: staffMember.is_active
    });
    // Seed raw text from availability
    const toText = (slots: any[] = []) => slots.map(s => `${s.start}-${s.end}`).join(', ');
    setAvailabilityText({
      monday: toText(staffMember.availability?.monday),
      tuesday: toText(staffMember.availability?.tuesday),
      wednesday: toText(staffMember.availability?.wednesday),
      thursday: toText(staffMember.availability?.thursday),
      friday: toText(staffMember.availability?.friday),
      saturday: toText(staffMember.availability?.saturday),
      sunday: toText(staffMember.availability?.sunday),
    });
    setIsDialogOpen(true);
  };

  // Parse "HH:mm-HH:mm, HH:mm-HH:mm" -> [{start,end},...]
  const parseTimeSlots = (value: string) => {
    if (!value?.trim()) return [] as { start: string; end: string }[];
    // Accept formats like "9:00-17:00", "09:00 - 17:00" (optional spaces, single-digit hour)
    const segmentRe = /^\s*([0-1]?\d|2[0-3]):([0-5]\d)\s*-\s*([0-1]?\d|2[0-3]):([0-5]\d)\s*$/;

    const pad2 = (n: string) => (n.length === 1 ? `0${n}` : n);

    return value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(seg => {
        const match = seg.match(segmentRe);
        if (!match) return null;
        const [, sh, sm, eh, em] = match;
        const start = `${pad2(sh)}:${sm}`;
        const end = `${pad2(eh)}:${em}`;
        // Ensure start < end within the same day
        return start < end ? { start, end } : null;
      })
      .filter(Boolean) as { start: string; end: string }[];
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    const newRoles = checked 
      ? [...formData.roles, roleId]
      : formData.roles.filter(id => id !== roleId);
    setFormData(prev => ({ ...prev, roles: newRoles }));
  };

  const handleAvailabilityBlur = (day: string) => {
    const parsedAvailability = parseTimeSlots(availabilityText[day]);
    setFormData(prev => ({ ...prev, availability: { ...prev.availability, [day]: parsedAvailability } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure latest availability text is parsed before saving
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const parsedAvailability = days.reduce((acc: any, day) => {
      acc[day] = parseTimeSlots(availabilityText[day]);
      return acc;
    }, { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] });
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in name, email, and phone number.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = { ...formData, availability: parsedAvailability } as any;
      if (editingStaff) {
        await updateStaff(editingStaff.id, payload);
      } else {
        await addStaff(payload);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving staff:', error);
    }
  };


  const handleDeleteStaff = async (staffMember: any) => {
    await deleteStaff(staffMember.id);
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
                  <p className="text-2xl font-bold text-foreground">0</p>
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
                    {staff.filter(s => s.is_active).length}
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
            <CardDescription>View and manage your staff members and their availability</CardDescription>
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
                            {staffMember.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
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
                          {staffMember.roles?.map((roleId: string) => {
                            const role = roles.find(r => r.id === roleId);
                            return role ? (
                              <Badge key={roleId} variant="outline" style={{ borderColor: role.color }}>
                                {role.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
              <DialogDescription>
                {editingStaff 
                  ? 'Update staff member information and availability'
                  : 'Add a new team member with their roles'
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
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-phone">Phone *</Label>
                    <Input
                      id="staff-phone"
                      placeholder="+1 555-0123"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Constraints (stored in staff.constraints JSONB) */}
              <div className="space-y-4">
                <h4 className="font-medium">Constraints</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-hours-day">Max Hours / Day</Label>
                    <Input
                      id="max-hours-day"
                      type="number"
                      min={1}
                      max={24}
                      value={formData.constraints.maxHoursPerDay}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        constraints: { ...prev.constraints, maxHoursPerDay: Number(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-hours-week">Max Hours / Week</Label>
                    <Input
                      id="max-hours-week"
                      type="number"
                      min={1}
                      max={168}
                      value={formData.constraints.maxHoursPerWeek}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        constraints: { ...prev.constraints, maxHoursPerWeek: Number(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min-hours-between">Min Hours Between Shifts</Label>
                    <Input
                      id="min-hours-between"
                      type="number"
                      min={0}
                      max={24}
                      value={formData.constraints.minHoursBetweenShifts}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        constraints: { ...prev.constraints, minHoursBetweenShifts: Number(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Weekly Availability (days and timings) */}
              <div className="space-y-4">
                <h4 className="font-medium">Weekly Availability</h4>
                <p className="text-sm text-muted-foreground">Use HH:mm-HH:mm ranges, comma-separated. Example: 09:00-12:00, 13:00-17:00</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const).map((day) => (
                    <div key={day} className="space-y-2">
                      <Label htmlFor={`avail-${day}`}>{day.charAt(0).toUpperCase() + day.slice(1)}</Label>
                      <Input
                        id={`avail-${day}`}
                        placeholder="09:00-17:00, 18:00-20:00"
                        value={availabilityText[day]}
                        onChange={(e) => setAvailabilityText(prev => ({ ...prev, [day]: e.target.value }))}
                        onBlur={() => handleAvailabilityBlur(day)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-4">
                <h4 className="font-medium">Roles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={formData.roles.includes(role.id)}
                        onCheckedChange={(checked) => handleRoleToggle(role.id, checked as boolean)}
                      />
                      <Label htmlFor={`role-${role.id}`} className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.color }}
                          />
                          <span>{role.name}</span>
                          <span className="text-sm text-muted-foreground">(${role.hourly_rate}/hr)</span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" disabled={loading}>
                  {loading ? 'Saving...' : editingStaff ? 'Update Staff' : 'Add Staff'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}