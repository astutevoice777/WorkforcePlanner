import { SchedulingData, SchedulingResponse, OptimizedShift } from './openaiSchedulingService';

export class MockAISchedulingService {
  // Mock AI schedule generation that works without OpenAI API
  async generateOptimizedSchedule(data: SchedulingData): Promise<SchedulingResponse> {
    try {
      console.log('🤖 Mock AI: Processing scheduling data...', data);
      
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const shifts = this.generateMockShifts(data);
      const totalCost = shifts.reduce((sum, shift) => sum + (shift.duration * shift.pay_rate), 0);
      
      return {
        success: true,
        shifts,
        optimization_score: Math.floor(Math.random() * 15) + 85, // 85-100%
        total_cost: totalCost,
        coverage_analysis: {
          fully_covered_hours: 168,
          under_staffed_periods: [],
          over_staffed_periods: []
        },
        recommendations: [
          "Consider cross-training staff for better flexibility",
          "Peak hours (12-2 PM) may need additional coverage",
          "Weekend scheduling could be optimized for cost savings"
        ],
        warnings: [],
        ai_insights: "Based on your staff availability and business requirements, this schedule optimizes for both cost efficiency and adequate coverage. The AI has balanced workload distribution while respecting individual constraints and preferences."
      };
    } catch (error) {
      console.error('Mock AI Error:', error);
      return {
        success: false,
        shifts: [],
        optimization_score: 0,
        total_cost: 0,
        coverage_analysis: {
          fully_covered_hours: 0,
          under_staffed_periods: [],
          over_staffed_periods: []
        },
        recommendations: [],
        warnings: ['Mock AI scheduling failed'],
        ai_insights: 'Unable to generate schedule due to processing error.'
      };
    }
  }

  private generateMockShifts(data: SchedulingData): OptimizedShift[] {
    const shifts: OptimizedShift[] = [];
    const weekStart = new Date(data.week_start_date);
    
    // Generate shifts for each day of the week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + dayOffset);
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Check if business is open this day
      const businessHours = data.business.business_hours[dayName as keyof typeof data.business.business_hours];
      if (!businessHours?.isOpen) continue;
      
      // Get available staff for this day
      const availableStaff = data.staff.filter(staff => {
        const availability = staff.availability[dayName as keyof typeof staff.availability];
        return availability?.available;
      });
      
      if (availableStaff.length === 0) continue;
      
      // Generate shifts based on roles needed
      data.roles.forEach(role => {
        const staffForRole = availableStaff.filter(staff => 
          staff.roles.includes(role.id)
        );
        
        if (staffForRole.length === 0) return;
        
        // Assign shifts to meet minimum requirements
        const shiftsNeeded = Math.max(1, role.min_staff_required || 1);
        
        for (let i = 0; i < Math.min(shiftsNeeded, staffForRole.length); i++) {
          const assignedStaff = staffForRole[i];
          const availability = assignedStaff.availability[dayName as keyof typeof assignedStaff.availability];
          
          // Create shift within business hours and staff availability
          const shiftStart = this.getLatestTime(businessHours.openTime, availability.startTime || '09:00');
          const shiftEnd = this.getEarliestTime(businessHours.closeTime, availability.endTime || '17:00');
          
          if (shiftStart >= shiftEnd) continue;
          
          const duration = this.calculateHours(shiftStart, shiftEnd);
          if (duration < 2) continue; // Minimum 2-hour shifts
          
          shifts.push({
            staff_id: assignedStaff.id,
            staff_name: assignedStaff.name,
            role_id: role.id,
            role_name: role.name,
            date: currentDate.toISOString().split('T')[0],
            start_time: shiftStart,
            end_time: shiftEnd,
            duration: duration,
            pay_rate: role.hourly_rate || assignedStaff.hourly_rate || 15.0,
            confidence_score: Math.random() * 0.3 + 0.7, // 70-100%
            reasoning: `Assigned based on availability (${availability.startTime}-${availability.endTime}) and role requirements. Optimized for ${role.name} coverage during business hours.`
          });
        }
      });
    }
    
    return shifts;
  }
  
  private getLatestTime(time1: string, time2: string): string {
    return time1 > time2 ? time1 : time2;
  }
  
  private getEarliestTime(time1: string, time2: string): string {
    return time1 < time2 ? time1 : time2;
  }
  
  private calculateHours(startTime: string, endTime: string): number {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  // Mock connection test that always succeeds
  async testConnection(): Promise<boolean> {
    console.log('🤖 Mock AI: Connection test - Always successful!');
    return true;
  }
}

export const mockAISchedulingService = new MockAISchedulingService();
