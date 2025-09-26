import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { useToast } from './use-toast';

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
}

export type Availability = Record<DayKey, TimeSlot[]>;

export interface Constraints {
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  minHoursBetweenShifts: number;
}

export interface Staff {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string;
  availability: Availability;
  constraints: Constraints;
  hourly_rate: number;
  max_hours_per_week: number;
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
  const fetchStaff = useCallback(async () => {
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
      let rolesData: { staff_id: string; role_id: string }[] | null = null;
      if (staffIds.length > 0) {
        const rolesResp = await supabase
          .from('staff_roles')
          .select('staff_id, role_id')
          .in('staff_id', staffIds);
        if (rolesResp.error) throw rolesResp.error;
        rolesData = rolesResp.data as { staff_id: string; role_id: string }[] | null;
      }

      // Combine staff with their roles
      const staffWithRoles = staffData?.map(staffMember => ({
        ...staffMember,
        roles: rolesData?.filter(r => r.staff_id === staffMember.id).map(r => r.role_id) || []
      })) || [];

      setStaff(staffWithRoles);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching staff:', message);
      toast({
        title: 'Error loading staff',
        description: 'Failed to load staff data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [business, toast]);

  // Add new staff member
  const addStaff = async (staffData: Omit<Staff, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => {
    if (!business) return { error: 'No business found' };

    try {
      const { roles, ...staffPayload } = staffData;
      
      // Insert staff member
      const insertPayload = {
        ...staffPayload,
        business_id: business.id,
      } as any; // availability/constraints are JSONB-compatible

      const { data: newStaff, error: staffError } = await (supabase as any)
        .from('staff')
        .insert(insertPayload)
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error adding staff:', message);
      toast({
        title: 'Error adding staff',
        description: message,
        variant: 'destructive',
      });
      return { error: message };
    }
  };

  // Update staff member
  const updateStaff = async (staffId: string, staffData: Partial<Staff>) => {
    try {
      const { roles, ...staffPayload } = staffData;
      
      // Update staff member
      const updatePayload = staffPayload as any; // availability/constraints are JSONB-compatible

      const { data: updatedStaff, error: staffError } = await (supabase as any)
        .from('staff')
        .update(updatePayload)
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating staff:', message);
      toast({
        title: 'Error updating staff',
        description: message,
        variant: 'destructive',
      });
      return { error: message };
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error deleting staff:', message);
      toast({
        title: 'Error deleting staff',
        description: message,
        variant: 'destructive',
      });
      return { error: message };
    }
  };

  useEffect(() => {
    if (business) {
      fetchStaff();
    }
  }, [business, fetchStaff]);

  return {
    staff,
    loading,
    addStaff,
    updateStaff,
    deleteStaff,
    refetch: fetchStaff,
  };
}