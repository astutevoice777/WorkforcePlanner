import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { useToast } from './use-toast';

export interface Staff {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string;
  availability: any;
  constraints: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles?: string[]; // Role IDs populated from staff_roles
}

export function useStaff() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch staff with their roles
  const fetchStaff = async () => {
    if (!business) return;
    
    setLoading(true);
    try {
      // Get staff data
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at');

      if (staffError) throw staffError;

      // Get staff roles for all staff members
      const staffIds = staffData?.map(s => s.id) || [];
      const { data: rolesData, error: rolesError } = await supabase
        .from('staff_roles')
        .select('staff_id, role_id')
        .in('staff_id', staffIds);

      if (rolesError) throw rolesError;

      // Combine staff with their roles
      const staffWithRoles = staffData?.map(staffMember => ({
        ...staffMember,
        roles: rolesData?.filter(r => r.staff_id === staffMember.id).map(r => r.role_id) || []
      })) || [];

      setStaff(staffWithRoles);
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      toast({
        title: 'Error loading staff',
        description: 'Failed to load staff data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new staff member
  const addStaff = async (staffData: Omit<Staff, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => {
    if (!business) return { error: 'No business found' };

    try {
      const { roles, ...staffPayload } = staffData;
      
      // Insert staff member
      const { data: newStaff, error: staffError } = await supabase
        .from('staff')
        .insert({
          ...staffPayload,
          business_id: business.id,
        })
        .select()
        .single();

      if (staffError) throw staffError;

      // Insert staff roles
      if (roles && roles.length > 0) {
        const roleInserts = roles.map(roleId => ({
          staff_id: newStaff.id,
          role_id: roleId,
        }));

        const { error: rolesError } = await supabase
          .from('staff_roles')
          .insert(roleInserts);

        if (rolesError) throw rolesError;
      }

      await fetchStaff();
      return { data: newStaff, error: null };
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast({
        title: 'Error adding staff',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Update staff member
  const updateStaff = async (staffId: string, staffData: Partial<Staff>) => {
    try {
      const { roles, ...staffPayload } = staffData;
      
      // Update staff member
      const { data: updatedStaff, error: staffError } = await supabase
        .from('staff')
        .update(staffPayload)
        .eq('id', staffId)
        .select()
        .single();

      if (staffError) throw staffError;

      // Update staff roles
      if (roles !== undefined) {
        // Delete existing roles
        await supabase
          .from('staff_roles')
          .delete()
          .eq('staff_id', staffId);

        // Insert new roles
        if (roles.length > 0) {
          const roleInserts = roles.map(roleId => ({
            staff_id: staffId,
            role_id: roleId,
          }));

          const { error: rolesError } = await supabase
            .from('staff_roles')
            .insert(roleInserts);

          if (rolesError) throw rolesError;
        }
      }

      await fetchStaff();
      return { data: updatedStaff, error: null };
    } catch (error: any) {
      console.error('Error updating staff:', error);
      toast({
        title: 'Error updating staff',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Delete staff member
  const deleteStaff = async (staffId: string) => {
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      await fetchStaff();
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting staff:', error);
      toast({
        title: 'Error deleting staff',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  useEffect(() => {
    if (business) {
      fetchStaff();
    }
  }, [business]);

  return {
    staff,
    loading,
    addStaff,
    updateStaff,
    deleteStaff,
    refetch: fetchStaff,
  };
}