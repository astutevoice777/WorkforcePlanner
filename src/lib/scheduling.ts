import { Business, Staff, Schedule, Shift, AIScheduleRequest, AIScheduleResponse, TimeOffRequest } from '@/types/scheduling';

// Mock AI scheduling service - in real implementation this would call OpenAI/Claude
export async function generateScheduleWithAI(request: AIScheduleRequest): Promise<AIScheduleResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { businessHours, staffAvailability, roles, constraints, weekStartDate, timeOffRequests } = request;
  
  const shifts: Shift[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Get all staff IDs who are available
  const availableStaffIds = Object.keys(staffAvailability);
  
  if (availableStaffIds.length === 0) {
    return {
      success: false,
      schedule: [],
      warnings: ['No staff available for scheduling'],
      efficiency: 0
    };
  }

  // Check for time off requests
  const timeOffMap = new Map<string, TimeOffRequest[]>();
  timeOffRequests.forEach(request => {
    if (request.status === 'APPROVED') {
      const existing = timeOffMap.get(request.staffId) || [];
      existing.push(request);
      timeOffMap.set(request.staffId, existing);
    }
  });

  // Generate shifts for each day of the week
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  days.forEach((day, dayIndex) => {
    const dayHours = businessHours[day as keyof typeof businessHours];
    if (!dayHours.isOpen) return;

    const currentDate = new Date(weekStartDate);
    currentDate.setDate(currentDate.getDate() + dayIndex);

    // Check if anyone is on time off this day
    const staffOnTimeOff = new Set<string>();
    timeOffMap.forEach((requests, staffId) => {
      requests.forEach(request => {
        if (currentDate >= request.startDate && currentDate <= request.endDate) {
          staffOnTimeOff.add(staffId);
        }
      });
    });

    // For each role, try to schedule staff
    roles.forEach(role => {
      const availableStaffForRole = availableStaffIds.filter((staffId) => {
        if (staffOnTimeOff.has(staffId)) return false;
        
        // Check if staff is available for this day and role
        const availability = staffAvailability[staffId];
        const dayAvailability = availability[day as keyof typeof availability];
        
        return dayAvailability && dayAvailability.length > 0;
      });

      if (availableStaffForRole.length < role.minStaffRequired) {
        warnings.push(`Insufficient staff for ${role.name} on ${day}. Need ${role.minStaffRequired}, have ${availableStaffForRole.length}`);
      }

      // Schedule minimum required staff
      const staffToSchedule = Math.min(role.minStaffRequired, availableStaffForRole.length);
      
      for (let i = 0; i < staffToSchedule; i++) {
        const staffId = availableStaffForRole[i];
        const staffAvailabilityData = staffAvailability[staffId];
        const availability = staffAvailabilityData[day as keyof typeof staffAvailabilityData];
        
        if (availability && availability.length > 0) {
          // Use the first available time slot (in real implementation, this would be more sophisticated)
          const timeSlot = availability[0];
          
          // Calculate shift duration with null-safety and support for different key names
          const startStr = (timeSlot as any).startTime ?? (timeSlot as any).start;
          const endStr = (timeSlot as any).endTime ?? (timeSlot as any).end;

          if (!startStr || !endStr || typeof startStr !== 'string' || typeof endStr !== 'string') {
            warnings.push(`Invalid time slot for staff ${staffId} on ${day}: missing start/end time`);
            continue;
          }

          const [startHourStr, startMinuteStr] = startStr.split(':');
          const [endHourStr, endMinuteStr] = endStr.split(':');

          const startHour = parseInt(startHourStr, 10);
          const startMinute = parseInt(startMinuteStr, 10);
          const endHour = parseInt(endHourStr, 10);
          const endMinute = parseInt(endMinuteStr, 10);

          if ([startHour, startMinute, endHour, endMinute].some(n => Number.isNaN(n))) {
            warnings.push(`Invalid time format for staff ${staffId} on ${day}: start=${startStr}, end=${endStr}`);
            continue;
          }
          
          const duration = (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60;
          
          // Check constraints
          if (duration > constraints.maxHoursPerDay) {
            warnings.push(`Staff ${staffId} scheduled for ${duration}h on ${day}, exceeds daily limit of ${constraints.maxHoursPerDay}h`);
          }

          shifts.push({
            id: `shift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            staffId,
            roleId: role.id,
            date: currentDate,
            startTime: startStr,
            endTime: endStr,
            duration,
            status: 'SCHEDULED',
            payRate: role.hourlyRate
          });
        }
      }
    });
  });

  // Generate recommendations
  if (shifts.length === 0) {
    recommendations.push('No shifts could be generated. Please check staff availability and business hours.');
  } else {
    const totalHours = shifts.reduce((sum, shift) => sum + shift.duration, 0);
    const averageShiftLength = totalHours / shifts.length;
    
    if (averageShiftLength < 4) {
      recommendations.push('Consider longer shifts to improve efficiency and reduce staff management overhead.');
    }
    
    const staffUsage = new Map<string, number>();
    shifts.forEach(shift => {
      staffUsage.set(shift.staffId, (staffUsage.get(shift.staffId) || 0) + shift.duration);
    });
    
    const underutilizedStaff = Array.from(staffUsage.entries())
      .filter(([_, hours]) => hours < 20)
      .map(([staffId]) => staffId);
    
    if (underutilizedStaff.length > 0) {
      recommendations.push(`Consider giving more hours to underutilized staff: ${underutilizedStaff.length} staff members have less than 20 hours.`);
    }
  }

  // Calculate efficiency based on coverage and optimization
  const efficiency = Math.min(100, Math.max(0, 
    75 + (shifts.length > 0 ? 25 : -75) + (warnings.length * -5)
  ));

  return {
    success: true,
    schedule: shifts,
    recommendations,
    warnings,
    efficiency
  };
}

// Utility functions for schedule management
export function calculateWeeklyHours(shifts: Shift[], staffId: string): number {
  return shifts
    .filter(shift => shift.staffId === staffId)
    .reduce((total, shift) => total + shift.duration, 0);
}

export function getShiftsForDate(shifts: Shift[], date: Date): Shift[] {
  return shifts.filter(shift => 
    shift.date.toDateString() === date.toDateString()
  );
}

export function getShiftsForStaff(shifts: Shift[], staffId: string): Shift[] {
  return shifts.filter(shift => shift.staffId === staffId);
}

export function calculatePayrollForStaff(shifts: Shift[], regularRate: number = 15): number {
  return shifts.reduce((total, shift) => {
    const rate = shift.payRate || regularRate;
    return total + (shift.duration * rate);
  }, 0);
}

export function validateScheduleConstraints(
  shifts: Shift[], 
  staff: Staff[], 
  constraints: { maxHoursPerDay: number; maxHoursPerWeek: number }
): string[] {
  const violations: string[] = [];
  
  staff.forEach(staffMember => {
    const staffShifts = getShiftsForStaff(shifts, staffMember.id);
    const weeklyHours = calculateWeeklyHours(shifts, staffMember.id);
    
    if (weeklyHours > constraints.maxHoursPerWeek) {
      violations.push(`${staffMember.name} exceeds weekly limit: ${weeklyHours}h > ${constraints.maxHoursPerWeek}h`);
    }
    
    // Check daily hours
    const dailyHours = new Map<string, number>();
    staffShifts.forEach(shift => {
      const dateKey = shift.date.toDateString();
      dailyHours.set(dateKey, (dailyHours.get(dateKey) || 0) + shift.duration);
    });
    
    dailyHours.forEach((hours, date) => {
      if (hours > constraints.maxHoursPerDay) {
        violations.push(`${staffMember.name} exceeds daily limit on ${date}: ${hours}h > ${constraints.maxHoursPerDay}h`);
      }
    });
  });
  
  return violations;
}

// Generate sample data for demo
export function generateSampleData() {
  const sampleBusiness: Business = {
    id: 'business-1',
    name: 'Corner Coffee Shop',
    address: '123 Main Street, Downtown',
    phone: '+1 555-0123',
    email: 'manager@cornercoffee.com',
    businessHours: {
      monday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      tuesday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      wednesday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      thursday: { isOpen: true, openTime: '07:00', closeTime: '18:00' },
      friday: { isOpen: true, openTime: '07:00', closeTime: '20:00' },
      saturday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
      sunday: { isOpen: true, openTime: '08:00', closeTime: '16:00' }
    },
    roles: [
      {
        id: 'role-1',
        name: 'Barista',
        description: 'Coffee preparation and customer service',
        hourlyRate: 16,
        minStaffRequired: 1,
        maxStaffAllowed: 3,
        color: '#3B82F6'
      },
      {
        id: 'role-2',
        name: 'Cashier',
        description: 'Handle transactions and customer orders',
        hourlyRate: 15,
        minStaffRequired: 1,
        maxStaffAllowed: 2,
        color: '#10B981'
      },
      {
        id: 'role-3',
        name: 'Cleaner',
        description: 'Maintain shop cleanliness',
        hourlyRate: 14,
        minStaffRequired: 1,
        maxStaffAllowed: 1,
        color: '#F59E0B'
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleStaff: Staff[] = [
    {
      id: 'staff-1',
      name: 'Alice Johnson',
      email: 'alice@email.com',
      phone: '+1 555-0101',
      roles: ['role-1', 'role-2'],
      availability: {
        monday: [{ startTime: '07:00', endTime: '15:00' }],
        tuesday: [{ startTime: '07:00', endTime: '15:00' }],
        wednesday: [{ startTime: '07:00', endTime: '15:00' }],
        thursday: [{ startTime: '07:00', endTime: '15:00' }],
        friday: [{ startTime: '07:00', endTime: '15:00' }],
        saturday: [],
        sunday: []
      },
      constraints: {
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        minHoursBetweenShifts: 12,
        preferredDaysOff: ['saturday', 'sunday']
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'staff-2',
      name: 'Bob Smith',
      email: 'bob@email.com',
      phone: '+1 555-0102',
      roles: ['role-1', 'role-3'],
      availability: {
        monday: [],
        tuesday: [{ startTime: '14:00', endTime: '20:00' }],
        wednesday: [{ startTime: '14:00', endTime: '20:00' }],
        thursday: [{ startTime: '14:00', endTime: '20:00' }],
        friday: [{ startTime: '14:00', endTime: '20:00' }],
        saturday: [{ startTime: '08:00', endTime: '20:00' }],
        sunday: [{ startTime: '08:00', endTime: '16:00' }]
      },
      constraints: {
        maxHoursPerDay: 8,
        maxHoursPerWeek: 35,
        minHoursBetweenShifts: 12,
        preferredDaysOff: ['monday']
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'staff-3',
      name: 'Carol Williams',
      email: 'carol@email.com',
      phone: '+1 555-0103',
      roles: ['role-2', 'role-3'],
      availability: {
        monday: [{ startTime: '15:00', endTime: '18:00' }],
        tuesday: [{ startTime: '15:00', endTime: '18:00' }],
        wednesday: [{ startTime: '15:00', endTime: '18:00' }],
        thursday: [{ startTime: '15:00', endTime: '18:00' }],
        friday: [{ startTime: '15:00', endTime: '20:00' }],
        saturday: [{ startTime: '08:00', endTime: '12:00' }],
        sunday: [{ startTime: '12:00', endTime: '16:00' }]
      },
      constraints: {
        maxHoursPerDay: 6,
        maxHoursPerWeek: 25,
        minHoursBetweenShifts: 10,
        preferredDaysOff: []
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  return { business: sampleBusiness, staff: sampleStaff };
}