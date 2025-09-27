import { useState, useEffect } from 'react';
import { StaffLayout } from '@/components/layout/StaffLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, MapPin, Clock, Settings } from 'lucide-react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { useToast } from '@/hooks/use-toast';
import { staffDatabaseService } from '@/services/staffDatabaseService';

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  availability?: any;
  constraints?: any;
  is_active: boolean;
  created_at: string;
  business?: {
    name: string;
    address: string | null;
  };
}

interface Role {
  id: string;
  name: string;
  color: string;
  hourly_rate: number;
}

export default function StaffProfile() {
  const { staffUser } = useStaffAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const fetchStaffData = async () => {
    if (!staffUser) return;
    
    setLoading(true);
    try {
      // Get staff data
      const staffResult = await staffDatabaseService.getStaffById(staffUser.staff_id);
      if (staffResult.error) {
        throw new Error(staffResult.error);
      }

      if (staffResult.data) {
        setStaff(staffResult.data);
        setFormData({
          name: staffResult.data.name,
          phone: staffResult.data.phone,
        });
      }

      // Fetch staff roles
      const rolesResult = await staffDatabaseService.getStaffRoles(staffUser.staff_id);
      if (rolesResult.error) {
        console.warn('Error fetching roles:', rolesResult.error);
      } else {
        setRoles(rolesResult.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching staff data:', error);
      toast({
        title: 'Error loading profile',
        description: error.message || 'Failed to load your profile data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!staff) return;

    try {
      const result = await staffDatabaseService.updateStaffProfile(staff.id, {
        name: formData.name,
        phone: formData.phone,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated',
      });

      setIsEditing(false);
      fetchStaffData();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error updating profile',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    if (staff) {
      setFormData({
        name: staff.name,
        phone: staff.phone,
      });
    }
    setIsEditing(false);
  };

  useEffect(() => {
    fetchStaffData();
  }, [staffUser]);

  if (!staff) {
    return (
      <StaffLayout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Staff Access Required</h2>
            <p className="text-muted-foreground mt-2">
              You need to be added as staff by a business owner to access this profile.
            </p>
          </div>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your personal information and preferences
            </p>
          </div>
          <Button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={loading}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={staff.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              {isEditing && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Workplace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold">{staff.business.name}</p>
                    {staff.business.address && (
                      <p className="text-sm text-muted-foreground">{staff.business.address}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>
                      Started on {new Date(staff.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Roles</CardTitle>
                <CardDescription>
                  Your assigned roles and responsibilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No roles assigned yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-6 rounded"
                            style={{ backgroundColor: role.color }}
                          />
                          <div>
                            <p className="font-medium">{role.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ${role.hourly_rate}/hour
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}