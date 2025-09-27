import { Staff } from '@/hooks/useStaff';

export interface BusinessStaffData {
  businessId: string;
  businessName: string;
  staff: Staff[];
}

export interface N8nScheduleResponse {
  success: boolean;
  message: string;
  scheduleId?: string;
  error?: string;
}

class N8nSchedulingService {
  private readonly webhookUrl = 'https://codedestroyerprashu.app.n8n.cloud/webhook-test/cc606036-1458-423d-bd98-7114a12a4212';

  /**
   * Send staff data to n8n webhook for AI schedule generation
   */
  async generateScheduleWithN8n(businessStaffData: BusinessStaffData): Promise<N8nScheduleResponse> {
    try {
      console.log('Sending staff data to n8n webhook:', businessStaffData);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: businessStaffData.businessId,
          businessName: businessStaffData.businessName,
          staffData: businessStaffData.staff.map(staff => ({
            id: staff.id,
            name: staff.name,
            email: staff.email,
            phone: staff.phone,
            position: staff.position,
            availability: staff.availability,
            constraints: staff.constraints,
            preferred_working_hours: staff.preferred_working_hours,
            shift_preferences: staff.shift_preferences,
            holiday_dates: staff.holiday_dates,
            hourly_rate: staff.hourly_rate,
            roles: staff.roles,
            is_active: staff.is_active
          })),
          timestamp: new Date().toISOString(),
          requestType: 'schedule_generation'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        message: 'Schedule generation request sent successfully',
        scheduleId: result.scheduleId || undefined
      };

    } catch (error: any) {
      console.error('Error sending data to n8n webhook:', error);
      
      return {
        success: false,
        message: 'Failed to send schedule generation request',
        error: error.message
      };
    }
  }

  /**
   * Prepare staff data grouped by business for n8n processing
   */
  prepareBusinessStaffData(businessId: string, businessName: string, staff: Staff[]): BusinessStaffData {
    // Filter active staff only
    const activeStaff = staff.filter(s => s.is_active);
    
    return {
      businessId,
      businessName,
      staff: activeStaff
    };
  }

  /**
   * Validate staff data before sending to n8n
   */
  validateStaffData(staff: Staff[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!staff || staff.length === 0) {
      errors.push('No staff data provided');
      return { isValid: false, errors };
    }

    staff.forEach((staffMember, index) => {
      if (!staffMember.id) {
        errors.push(`Staff member at index ${index} is missing ID`);
      }
      if (!staffMember.name) {
        errors.push(`Staff member at index ${index} is missing name`);
      }
      if (!staffMember.business_id) {
        errors.push(`Staff member at index ${index} is missing business_id`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const n8nSchedulingService = new N8nSchedulingService();
