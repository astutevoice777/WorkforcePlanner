import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Calendar, Settings, Plus, Trash2 } from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';

interface ShiftRequirement {
  roleId: string;
  minStaff: number;
  maxStaff: number;
}

interface BusinessConfig {
  operatingHours: {
    [key: string]: {
      isOpen: boolean;
      openTime: string;
      closeTime: string;
    };
  };
  shiftLengths: number[]; // in hours
  shiftRequirements: ShiftRequirement[];
  schedulingPeriods: {
    defaultPeriod: 'this_week' | 'next_week' | 'custom';
    customStartDate?: string;
    customEndDate?: string;
  };
}

export function BusinessSettings() {
  const { business, roles, saveBusiness } = useBusiness();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  const [config, setConfig] = useState<BusinessConfig>({
    operatingHours: {
      monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      sunday: { isOpen: false, openTime: '09:00', closeTime: '21:00' }
    },
    shiftLengths: [4, 6, 8],
    shiftRequirements: [],
    schedulingPeriods: {
      defaultPeriod: 'this_week'
    }
  });

  const handleOperatingHoursChange = (day: string, field: 'isOpen' | 'openTime' | 'closeTime', value: boolean | string) => {
    setConfig(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    }));
  };

  const addShiftLength = () => {
    const newLength = 4; // Default 4 hours
    setConfig(prev => ({
      ...prev,
      shiftLengths: [...prev.shiftLengths, newLength]
    }));
  };

  const updateShiftLength = (index: number, length: number) => {
    setConfig(prev => ({
      ...prev,
      shiftLengths: prev.shiftLengths.map((l, i) => i === index ? length : l)
    }));
  };

  const removeShiftLength = (index: number) => {
    setConfig(prev => ({
      ...prev,
      shiftLengths: prev.shiftLengths.filter((_, i) => i !== index)
    }));
  };

  const addShiftRequirement = () => {
    if (roles.length === 0) {
      toast({
        title: 'No roles available',
        description: 'Please create roles first before setting shift requirements.',
        variant: 'destructive',
      });
      return;
    }

    setConfig(prev => ({
      ...prev,
      shiftRequirements: [
        ...prev.shiftRequirements,
        { roleId: roles[0].id, minStaff: 1, maxStaff: 2 }
      ]
    }));
  };

  const updateShiftRequirement = (index: number, field: keyof ShiftRequirement, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      shiftRequirements: prev.shiftRequirements.map((req, i) => 
        i === index ? { ...req, [field]: value } : req
      )
    }));
  };

  const removeShiftRequirement = (index: number) => {
    setConfig(prev => ({
      ...prev,
      shiftRequirements: prev.shiftRequirements.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save configuration to business settings
      await saveBusiness({
        name: business?.name || 'Business',
        business_hours: config.operatingHours
      });

      toast({
        title: 'Settings saved',
        description: 'Business configuration has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: 'Failed to save business configuration.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Shop Operating Hours</CardTitle>
          </div>
          <CardDescription>
            Set your business hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map(day => (
            <div key={day} className="flex items-center space-x-4 p-3 border rounded-lg">
              <div className="min-w-[100px]">
                <Label className="capitalize font-medium">{day}</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.operatingHours[day].isOpen}
                  onChange={(e) => handleOperatingHoursChange(day, 'isOpen', e.target.checked)}
                  className="rounded"
                />
                <Label className="text-sm">Open</Label>
              </div>

              {config.operatingHours[day].isOpen && (
                <div className="flex items-center space-x-2">
                  <Input
                    type="time"
                    value={config.operatingHours[day].openTime}
                    onChange={(e) => handleOperatingHoursChange(day, 'openTime', e.target.value)}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={config.operatingHours[day].closeTime}
                    onChange={(e) => handleOperatingHoursChange(day, 'closeTime', e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Shift Lengths */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Shift Length Options</CardTitle>
          </div>
          <CardDescription>
            Define available shift durations (in hours)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {config.shiftLengths.map((length, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 border rounded-lg">
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={length}
                  onChange={(e) => updateShiftLength(index, parseInt(e.target.value) || 4)}
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">hours</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeShiftLength(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={addShiftLength}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Shift Length
          </Button>
        </CardContent>
      </Card>

      {/* Roles Required Per Shift */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Roles Required Per Shift</CardTitle>
          </div>
          <CardDescription>
            Set minimum and maximum staff requirements for each role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.shiftRequirements.map((requirement, index) => {
            const role = roles.find(r => r.id === requirement.roleId);
            return (
              <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <Select
                    value={requirement.roleId}
                    onValueChange={(value) => updateShiftRequirement(index, 'roleId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: role.color }}
                            />
                            <span>{role.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Label className="text-sm">Min:</Label>
                  <Input
                    type="number"
                    min="0"
                    value={requirement.minStaff}
                    onChange={(e) => updateShiftRequirement(index, 'minStaff', parseInt(e.target.value) || 0)}
                    className="w-16"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Label className="text-sm">Max:</Label>
                  <Input
                    type="number"
                    min="0"
                    value={requirement.maxStaff}
                    onChange={(e) => updateShiftRequirement(index, 'maxStaff', parseInt(e.target.value) || 0)}
                    className="w-16"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeShiftRequirement(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={addShiftRequirement}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Role Requirement
          </Button>
        </CardContent>
      </Card>

      {/* Scheduling Periods */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Scheduling Periods</CardTitle>
          </div>
          <CardDescription>
            Configure default scheduling timeframes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Scheduling Period</Label>
            <Select
              value={config.schedulingPeriods.defaultPeriod}
              onValueChange={(value: 'this_week' | 'next_week' | 'custom') => 
                setConfig(prev => ({
                  ...prev,
                  schedulingPeriods: { ...prev.schedulingPeriods, defaultPeriod: value }
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="next_week">Next Week</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.schedulingPeriods.defaultPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={config.schedulingPeriods.customStartDate || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    schedulingPeriods: {
                      ...prev.schedulingPeriods,
                      customStartDate: e.target.value
                    }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={config.schedulingPeriods.customEndDate || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    schedulingPeriods: {
                      ...prev.schedulingPeriods,
                      customEndDate: e.target.value
                    }
                  }))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
