import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Business {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  business_hours: any;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  hourly_rate: number;
  min_staff_required: number;
  max_staff_allowed: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export function useBusiness() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch business data
  const fetchBusiness = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setBusiness(data);
    } catch (error: any) {
      console.error('Error fetching business:', error);
      toast({
        title: 'Error loading business',
        description: 'Failed to load business data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch roles for the business
  const fetchRoles = async () => {
    if (!business) return;
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at');

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      console.error('Error fetching roles:', error);
    }
  };

  // Create or update business
  const saveBusiness = async (businessData: Partial<Business> & { name: string }) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const payload = {
        ...businessData,
        user_id: user.id,
      };

      let result;
      if (business) {
        // Update existing
        result = await supabase
          .from('businesses')
          .update(payload)
          .eq('id', business.id)
          .select()
          .single();
      } else {
        // Create new
        result = await supabase
          .from('businesses')
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      
      setBusiness(result.data);
      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Error saving business:', error);
      toast({
        title: 'Error saving business',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Save roles (replace all existing roles with new ones)
  const saveRoles = async (newRoles: Omit<Role, 'id' | 'business_id' | 'created_at' | 'updated_at'>[]) => {
    if (!business) return { error: 'No business found' };

    try {
      // Delete existing roles
      await supabase
        .from('roles')
        .delete()
        .eq('business_id', business.id);

      // Insert new roles
      const rolesWithBusinessId = newRoles.map(role => ({
        ...role,
        business_id: business.id,
      }));

      const { data, error } = await supabase
        .from('roles')
        .insert(rolesWithBusinessId)
        .select();

      if (error) throw error;
      
      setRoles(data || []);
      return { data, error: null };
    } catch (error: any) {
      console.error('Error saving roles:', error);
      toast({
        title: 'Error saving roles',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  useEffect(() => {
    if (user) {
      fetchBusiness();
    }
  }, [user]);

  useEffect(() => {
    if (business) {
      fetchRoles();
    }
  }, [business]);

  return {
    business,
    roles,
    loading,
    saveBusiness,
    saveRoles,
    refetch: fetchBusiness,
  };
}