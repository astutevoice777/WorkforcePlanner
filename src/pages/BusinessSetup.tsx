import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Building } from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';

interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

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
  const { business, roles, saveBusiness, saveRoles, loading } = useBusiness();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    business_hours: {
      monday: defaultDayHours,
      tuesday: defaultDayHours,
      wednesday: defaultDayHours,
      thursday: defaultDayHours,
      friday: defaultDayHours,
      saturday: { isOpen: true, openTime: '10:00', closeTime: '18:00' },
      sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00' }
    },
    roles: [
      {
        name: 'General Staff',
        description: 'General duties and customer service',
        hourly_rate: 15,
        min_staff_required: 1,
        max_staff_allowed: 3,
        color: '#3B82F6'
      }
    ]
  });

  useEffect(() => {
    if (business) {
      setFormData({
        name: business.name,
        address: business.address || '',
        phone: business.phone || '',
        email: business.email || '',
        business_hours: business.business_hours || formData.business_hours,
        roles: roles.length > 0 ? roles.map(r => ({
          name: r.name,
          description: r.description || '',
          hourly_rate: r.hourly_rate,
          min_staff_required: r.min_staff_required,
          max_staff_allowed: r.max_staff_allowed,
          color: r.color
        })) : formData.roles
      });
    }
  }, [business, roles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: 'Business name required',
        description: 'Please enter your business name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Save business
      const businessResult = await saveBusiness({
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        business_hours: formData.business_hours,
      });

      if (businessResult.error) throw businessResult.error;

      // Save roles
      const rolesResult = await saveRoles(formData.roles);
      if (rolesResult.error) throw rolesResult.error;

      toast({
        title: 'Business setup saved!',
        description: 'Your business configuration has been updated.',
      });

      navigate('/staff');
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleBusinessHoursChange = (day: keyof typeof formData.business_hours, field: keyof DayHours, value: any) => {
    setFormData(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          [field]: value
        }
      }
    }));
  };

  const addRole = () => {
    const newRole = {
      name: '',
      description: '',
      hourly_rate: 15,
      min_staff_required: 1,
      max_staff_allowed: 2,
      color: '#10B981'
    };

    setFormData(prev => ({
      ...prev,
      roles: [...prev.roles, newRole]
    }));
  };

  const removeRole = (index: number) => {
    if (formData.roles.length <= 1) {
      toast({
        title: 'Cannot remove role',
        description: 'You must have at least one role defined.',
        variant: 'destructive',
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== index)
    }));
  };

  const updateRole = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.map((role, i) => 
        i === index ? { ...role, [field]: value } : role
      )
    }));
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
              <CardDescription>Basic details about your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name *</Label>
                  <Input
                    id="business-name"
                    placeholder="Corner Coffee Shop"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-address">Address</Label>
                  <Input
                    id="business-address"
                    placeholder="123 Main Street, Downtown"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
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
              <CardDescription>Set your operating hours for each day of the week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weekDays.map(day => (
                  <div key={day} className="flex items-center space-x-4 p-4 rounded-lg border border-border">
                    <div className="w-24">
                      <span className="font-medium text-sm">{dayLabels[day]}</span>
                    </div>
                    
                    <Switch
                      checked={formData.business_hours[day]?.isOpen}
                      onCheckedChange={(checked) => 
                        handleBusinessHoursChange(day, 'isOpen', checked)
                      }
                    />
                    
                    {formData.business_hours[day]?.isOpen && (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          value={formData.business_hours[day].openTime}
                          onChange={(e) => 
                            handleBusinessHoursChange(day, 'openTime', e.target.value)
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={formData.business_hours[day].closeTime}
                          onChange={(e) => 
                            handleBusinessHoursChange(day, 'closeTime', e.target.value)
                          }
                          className="w-32"
                        />
                      </div>
                    )}
                    
                    {!formData.business_hours[day]?.isOpen && (
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
              <CardDescription>Define the different roles your staff can work in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.roles.map((role, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Role {index + 1}</h4>
                      {formData.roles.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRole(index)}
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
                          onChange={(e) => updateRole(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hourly Rate ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.50"
                          placeholder="15.00"
                          value={role.hourly_rate}
                          onChange={(e) => updateRole(index, 'hourly_rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="Coffee preparation and customer service"
                        value={role.description}
                        onChange={(e) => updateRole(index, 'description', e.target.value)}
                      />
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
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? 'Saving...' : 'Save & Continue to Staff Management'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}