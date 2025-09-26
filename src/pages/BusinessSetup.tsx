import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Building } from 'lucide-react';
import { useBusiness } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Business, Role, DayHours } from '@/types/scheduling';

const defaultDayHours: DayHours = {
  isOpen: true,
  openTime: '09:00',
  closeTime: '17:00'
};

const weekDays = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
] as const;

const dayLabels = {
  monday: 'Monday',
  tuesday: 'Tuesday', 
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

export default function BusinessSetup() {
  const navigate = useNavigate();
  const { business, updateBusiness } = useBusiness();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Business>>({
    name: business?.name || '',
    address: business?.address || '',
    phone: business?.phone || '',
    email: business?.email || '',
    businessHours: business?.businessHours || {
      monday: defaultDayHours,
      tuesday: defaultDayHours,
      wednesday: defaultDayHours,
      thursday: defaultDayHours,
      friday: defaultDayHours,
      saturday: { isOpen: true, openTime: '10:00', closeTime: '18:00' },
      sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00' }
    },
    roles: business?.roles || [
      {
        id: 'role-1',
        name: 'General Staff',
        description: 'General duties and customer service',
        hourlyRate: 15,
        minStaffRequired: 1,
        maxStaffAllowed: 3,
        color: '#3B82F6'
      }
    ]
  });

  const handleInputChange = (field: keyof Business, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBusinessHoursChange = (day: keyof typeof formData.businessHours, field: keyof DayHours, value: any) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours!,
        [day]: {
          ...prev.businessHours![day],
          [field]: value
        }
      }
    }));
  };

  const handleRoleChange = (roleId: string, field: keyof Role, value: any) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles!.map(role => 
        role.id === roleId ? { ...role, [field]: value } : role
      )
    }));
  };

  const addRole = () => {
    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: '',
      description: '',
      hourlyRate: 15,
      minStaffRequired: 1,
      maxStaffAllowed: 2,
      color: '#10B981'
    };

    setFormData(prev => ({
      ...prev,
      roles: [...(prev.roles || []), newRole]
    }));
  };

  const removeRole = (roleId: string) => {
    if (formData.roles!.length <= 1) {
      toast({
        title: 'Cannot remove role',
        description: 'You must have at least one role defined.',
        variant: 'destructive',
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      roles: prev.roles!.filter(role => role.id !== roleId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: 'Business name required',
        description: 'Please enter your business name.',
        variant: 'destructive',
      });
      return;
    }

    const businessData: Business = {
      id: business?.id || `business-${Date.now()}`,
      name: formData.name!,
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      businessHours: formData.businessHours!,
      roles: formData.roles!,
      createdAt: business?.createdAt || new Date(),
      updatedAt: new Date()
    };

    updateBusiness(businessData);
    
    toast({
      title: 'Business setup saved!',
      description: 'Your business configuration has been updated.',
    });

    navigate('/staff');
  };

  const getTotalOpenDays = () => {
    return weekDays.filter(day => formData.businessHours?.[day]?.isOpen).length;
  };

  const getWeeklyHours = () => {
    return weekDays.reduce((total, day) => {
      const dayHours = formData.businessHours?.[day];
      if (!dayHours?.isOpen) return total;
      
      const open = dayHours.openTime.split(':');
      const close = dayHours.closeTime.split(':');
      const openMinutes = parseInt(open[0]) * 60 + parseInt(open[1]);
      const closeMinutes = parseInt(close[0]) * 60 + parseInt(close[1]);
      
      return total + (closeMinutes - openMinutes) / 60;
    }, 0);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Building className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Business Setup</h1>
            <p className="text-muted-foreground">Configure your business details and operating hours</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Basic details about your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name *</Label>
                  <Input
                    id="business-name"
                    placeholder="Corner Coffee Shop"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-email">Email</Label>
                  <Input
                    id="business-email"
                    type="email"
                    placeholder="manager@business.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business-phone">Phone</Label>
                  <Input
                    id="business-phone"
                    placeholder="+1 555-0123"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-address">Address</Label>
                  <Input
                    id="business-address"
                    placeholder="123 Main Street, Downtown"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Business Hours</span>
              </CardTitle>
              <CardDescription>
                Set your operating hours for each day of the week
              </CardDescription>
              <div className="flex space-x-4 text-sm">
                <Badge variant="outline">
                  {getTotalOpenDays()} days open
                </Badge>
                <Badge variant="outline">
                  {getWeeklyHours().toFixed(1)} hours/week
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weekDays.map(day => (
                  <div key={day} className="flex items-center space-x-4 p-4 rounded-lg border border-border">
                    <div className="w-24">
                      <span className="font-medium text-sm">{dayLabels[day]}</span>
                    </div>
                    
                    <Switch
                      checked={formData.businessHours?.[day]?.isOpen}
                      onCheckedChange={(checked) => 
                        handleBusinessHoursChange(day, 'isOpen', checked)
                      }
                    />
                    
                    {formData.businessHours?.[day]?.isOpen && (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          value={formData.businessHours[day].openTime}
                          onChange={(e) => 
                            handleBusinessHoursChange(day, 'openTime', e.target.value)
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={formData.businessHours[day].closeTime}
                          onChange={(e) => 
                            handleBusinessHoursChange(day, 'closeTime', e.target.value)
                          }
                          className="w-32"
                        />
                      </div>
                    )}
                    
                    {!formData.businessHours?.[day]?.isOpen && (
                      <span className="text-muted-foreground text-sm">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Staff Roles */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Staff Roles</CardTitle>
              <CardDescription>
                Define the different roles your staff can work in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.roles?.map((role, index) => (
                  <div key={role.id} className="p-4 rounded-lg border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Role {index + 1}</h4>
                      {formData.roles!.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRole(role.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role Name</Label>
                        <Input
                          placeholder="Barista"
                          value={role.name}
                          onChange={(e) => handleRoleChange(role.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hourly Rate ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.50"
                          placeholder="15.00"
                          value={role.hourlyRate}
                          onChange={(e) => handleRoleChange(role.id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="Coffee preparation and customer service"
                        value={role.description}
                        onChange={(e) => handleRoleChange(role.id, 'description', e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Min Staff Required</Label>
                        <Input
                          type="number"
                          min="1"
                          value={role.minStaffRequired}
                          onChange={(e) => handleRoleChange(role.id, 'minStaffRequired', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Staff Allowed</Label>
                        <Input
                          type="number"
                          min="1"
                          value={role.maxStaffAllowed}
                          onChange={(e) => handleRoleChange(role.id, 'maxStaffAllowed', parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRole}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Role
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient">
              Save & Continue to Staff Management
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}