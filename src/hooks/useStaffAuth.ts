import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StaffUser {
  staff_id: string;
  name: string;
  email: string;
  business_id: string;
  is_active: boolean;
}

export function useStaffAuth() {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session in localStorage and validate with database
    checkStaffSession();
  }, []);

  const checkStaffSession = async () => {
    try {
      setError(null);
      const storedUser = localStorage.getItem('staff_user');
      
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // Validate the stored user data with the database
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id, name, email, business_id, is_active')
          .eq('id', userData.staff_id)
          .eq('is_active', true)
          .single();

        if (staffError || !staffData) {
          console.warn('Stored staff user not found or inactive, clearing session');
          localStorage.removeItem('staff_user');
          setStaffUser(null);
        } else {
          // Update stored user data with latest from database
          const updatedUserData = {
            staff_id: staffData.id,
            name: staffData.name,
            email: staffData.email,
            business_id: staffData.business_id,
            is_active: staffData.is_active
          };
          
          localStorage.setItem('staff_user', JSON.stringify(updatedUserData));
          setStaffUser(updatedUserData);
        }
      }
    } catch (error: any) {
      console.error('Error checking staff session:', error);
      setError('Failed to validate session');
      localStorage.removeItem('staff_user');
      setStaffUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      // Check if staff exists with this email
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, email, business_id, is_active')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (staffError || !staffData) {
        const errorMsg = 'No active staff member found with this email address. Please contact your manager.';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Create session data
      const userData = {
        staff_id: staffData.id,
        name: staffData.name,
        email: staffData.email,
        business_id: staffData.business_id,
        is_active: staffData.is_active
      };

      localStorage.setItem('staff_user', JSON.stringify(userData));
      setStaffUser(userData);

      return { success: true };
    } catch (error: any) {
      console.error('Staff sign in error:', error);
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('staff_user');
    setStaffUser(null);
    setError(null);
  };

  const refreshSession = async () => {
    if (staffUser) {
      await checkStaffSession();
    }
  };

  return {
    staffUser,
    loading,
    error,
    signIn,
    signOut,
    refreshSession,
  };
}
