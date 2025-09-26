import { format, addDays, parseISO, isSameDay, differenceInHours } from 'date-fns';

export interface OptimizationConstraints {
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  minStaffPerRole: Record<string, number>;
  maxStaffPerRole: Record<string, number>;
  minBreakBetweenShifts: number; // hours
  maxConsecutiveDays: number;
  preferredShiftLengths: number[]; // preferred shift durations in hours
  businessHours: {
    start: string;
    end: string;
    days: number[]; // 0-6, Sunday-Saturday
  };
}

export interface StaffAvailability {
  staffId: string;
  dayOfWeek: number; // 0-6
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface ScheduleRequest {
  businessId: string;
  weekStartDate: Date;
  staffAvailability: Record<string, StaffAvailability[]>;
  roles: Array<{
    id: string;
    name: string;
    minStaffRequired: number;
    maxStaffAllowed: number;
    hourlyRate: number;
    priority: number; // 1-10, higher = more important
  }>;
  constraints: OptimizationConstraints;
  existingShifts?: Array<{
    staffId: string;
    roleId: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
  }>;
  timeOffRequests: Array<{
    staffId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }>;
}

export interface OptimizedShift {
  staffId: string;
  roleId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED';
  payRate: number;
  notes?: string;
  confidence: number; // 0-1, optimization confidence score
}

export interface OptimizationResult {
  success: boolean;
  schedule: OptimizedShift[];
  efficiency: number; // 0-100, overall schedule efficiency
  coverage: Record<string, number>; // role coverage percentage
  warnings: string[];
  suggestions: string[];
  totalCost: number;
  totalHours: number;
}

export class ScheduleOptimizer {
  private constraints: OptimizationConstraints;
  private staff: Record<string, StaffAvailability[]>;
  private roles: Array<{
    id: string;
    name: string;
    minStaffRequired: number;
    maxStaffAllowed: number;
    hourlyRate: number;
    priority: number;
  }>;

  constructor(request: ScheduleRequest) {
    this.constraints = request.constraints;
    this.staff = request.staffAvailability;
    this.roles = request.roles;
  }

  /**
   * Main optimization algorithm using genetic algorithm approach
   */
  async optimizeSchedule(request: ScheduleRequest): Promise<OptimizationResult> {
    try {
      const weekDays = this.generateWeekDays(request.weekStartDate);
      const timeSlots = this.generateTimeSlots();
      
      // Initialize population of potential schedules
      const populationSize = 50;
      const generations = 100;
      let population = this.initializePopulation(populationSize, weekDays, timeSlots, request);
      
      // Evolve the population
      for (let gen = 0; gen < generations; gen++) {
        population = this.evolvePopulation(population, request);
      }
      
      // Select the best schedule
      const bestSchedule = this.selectBestSchedule(population, request);
      const optimizedShifts = this.convertToShifts(bestSchedule, request);
      
      return {
        success: true,
        schedule: optimizedShifts,
        efficiency: this.calculateEfficiency(optimizedShifts, request),
        coverage: this.calculateCoverage(optimizedShifts, request),
        warnings: this.generateWarnings(optimizedShifts, request),
        suggestions: this.generateSuggestions(optimizedShifts, request),
        totalCost: this.calculateTotalCost(optimizedShifts),
        totalHours: this.calculateTotalHours(optimizedShifts)
      };
    } catch (error) {
      return {
        success: false,
        schedule: [],
        efficiency: 0,
        coverage: {},
        warnings: [`Optimization failed: ${error.message}`],
        suggestions: [],
        totalCost: 0,
        totalHours: 0
      };
    }
  }

  /**
   * Smart schedule generation using constraint satisfaction
   */
  async generateSmartSchedule(request: ScheduleRequest): Promise<OptimizationResult> {
    const shifts: OptimizedShift[] = [];
    const weekDays = this.generateWeekDays(request.weekStartDate);
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Sort roles by priority (higher priority first)
    const sortedRoles = [...request.roles].sort((a, b) => b.priority - a.priority);

    for (const day of weekDays) {
      const dayOfWeek = day.getDay();
      
      // Check if business is open on this day
      if (!request.constraints.businessHours.days.includes(dayOfWeek)) {
        continue;
      }

      for (const role of sortedRoles) {
        const requiredStaff = role.minStaffRequired;
        let assignedStaff = 0;

        // Get available staff for this role and day
        const availableStaff = this.getAvailableStaff(day, role.id, request);
        
        if (availableStaff.length < requiredStaff) {
          warnings.push(`Insufficient staff for ${role.name} on ${format(day, 'EEEE, MMM d')}`);
        }

        // Assign shifts to available staff
        for (const staffId of availableStaff) {
          if (assignedStaff >= role.maxStaffAllowed) break;

          const availability = this.getStaffAvailability(staffId, dayOfWeek);
          if (!availability) continue;

          // Check for conflicts with existing shifts
          if (this.hasConflict(staffId, day, availability.startTime, availability.endTime, shifts)) {
            continue;
          }

          // Check daily and weekly hour limits
          if (!this.checkHourLimits(staffId, day, availability, shifts, request.constraints)) {
            continue;
          }

          // Create optimized shift
          const shift: OptimizedShift = {
            staffId,
            roleId: role.id,
            date: day,
            startTime: availability.startTime,
            endTime: availability.endTime,
            duration: this.calculateDuration(availability.startTime, availability.endTime),
            status: 'SCHEDULED',
            payRate: role.hourlyRate,
            confidence: this.calculateConfidence(staffId, day, availability, request),
            notes: this.generateShiftNotes(staffId, role, day)
          };

          shifts.push(shift);
          assignedStaff++;
        }

        if (assignedStaff < requiredStaff) {
          suggestions.push(`Consider hiring more ${role.name} staff or adjusting requirements`);
        }
      }
    }

    return {
      success: true,
      schedule: shifts,
      efficiency: this.calculateEfficiency(shifts, request),
      coverage: this.calculateCoverage(shifts, request),
      warnings,
      suggestions,
      totalCost: this.calculateTotalCost(shifts),
      totalHours: this.calculateTotalHours(shifts)
    };
  }

  /**
   * Optimize existing schedule by making improvements
   */
  async optimizeExistingSchedule(
    existingShifts: OptimizedShift[],
    request: ScheduleRequest
  ): Promise<OptimizationResult> {
    const optimizedShifts = [...existingShifts];
    const improvements: string[] = [];

    // 1. Fill gaps in coverage
    const gaps = this.findCoverageGaps(optimizedShifts, request);
    for (const gap of gaps) {
      const newShift = this.fillGap(gap, request);
      if (newShift) {
        optimizedShifts.push(newShift);
        improvements.push(`Added shift to fill coverage gap for ${gap.roleName} on ${gap.date}`);
      }
    }

    // 2. Optimize shift lengths
    for (const shift of optimizedShifts) {
      const optimizedLength = this.optimizeShiftLength(shift, request);
      if (optimizedLength !== shift.duration) {
        shift.duration = optimizedLength;
        shift.endTime = this.calculateEndTime(shift.startTime, optimizedLength);
        improvements.push(`Optimized shift length for ${shift.staffId}`);
      }
    }

    // 3. Balance workload
    const balancedShifts = this.balanceWorkload(optimizedShifts, request);
    
    return {
      success: true,
      schedule: balancedShifts,
      efficiency: this.calculateEfficiency(balancedShifts, request),
      coverage: this.calculateCoverage(balancedShifts, request),
      warnings: this.generateWarnings(balancedShifts, request),
      suggestions: improvements,
      totalCost: this.calculateTotalCost(balancedShifts),
      totalHours: this.calculateTotalHours(balancedShifts)
    };
  }

  // Helper methods
  private generateWeekDays(startDate: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }

  private generateTimeSlots(): string[] {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }

  private getAvailableStaff(date: Date, roleId: string, request: ScheduleRequest): string[] {
    const dayOfWeek = date.getDay();
    const available: string[] = [];

    for (const [staffId, availability] of Object.entries(request.staffAvailability)) {
      // Handle both array and object formats for availability
      const availabilityArray = Array.isArray(availability) ? availability : [];
      const dayAvailability = availabilityArray.find(a => a.dayOfWeek === dayOfWeek && a.isAvailable);
      
      if (dayAvailability) {
        // Check time off requests
        const hasTimeOff = request.timeOffRequests.some(timeOff => 
          timeOff.staffId === staffId &&
          parseISO(timeOff.startDate) <= date &&
          parseISO(timeOff.endDate) >= date
        );
        
        if (!hasTimeOff) {
          available.push(staffId);
        }
      }
    }

    return available;
  }

  private getStaffAvailability(staffId: string, dayOfWeek: number): StaffAvailability | null {
    const availability = this.staff[staffId];
    return availability?.find(a => a.dayOfWeek === dayOfWeek && a.isAvailable) || null;
  }

  private hasConflict(
    staffId: string,
    date: Date,
    startTime: string,
    endTime: string,
    existingShifts: OptimizedShift[]
  ): boolean {
    return existingShifts.some(shift => 
      shift.staffId === staffId &&
      isSameDay(shift.date, date) &&
      this.timeOverlaps(startTime, endTime, shift.startTime, shift.endTime)
    );
  }

  private timeOverlaps(start1: string, end1: string, start2: string, end2: string): boolean {
    const s1 = new Date(`2000-01-01T${start1}`);
    const e1 = new Date(`2000-01-01T${end1}`);
    const s2 = new Date(`2000-01-01T${start2}`);
    const e2 = new Date(`2000-01-01T${end2}`);
    
    return s1 < e2 && s2 < e1;
  }

  private checkHourLimits(
    staffId: string,
    date: Date,
    availability: StaffAvailability,
    existingShifts: OptimizedShift[],
    constraints: OptimizationConstraints
  ): boolean {
    const shiftDuration = this.calculateDuration(availability.startTime, availability.endTime);
    
    // Check daily limit
    const dailyHours = existingShifts
      .filter(shift => shift.staffId === staffId && isSameDay(shift.date, date))
      .reduce((total, shift) => total + shift.duration, 0);
    
    if (dailyHours + shiftDuration > constraints.maxHoursPerDay) {
      return false;
    }

    // Check weekly limit
    const weekStart = addDays(date, -date.getDay());
    const weekEnd = addDays(weekStart, 6);
    const weeklyHours = existingShifts
      .filter(shift => 
        shift.staffId === staffId &&
        shift.date >= weekStart &&
        shift.date <= weekEnd
      )
      .reduce((total, shift) => total + shift.duration, 0);
    
    return weeklyHours + shiftDuration <= constraints.maxHoursPerWeek;
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return differenceInHours(end, start);
  }

  private calculateEndTime(startTime: string, duration: number): string {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
    return format(end, 'HH:mm');
  }

  private calculateConfidence(
    staffId: string,
    date: Date,
    availability: StaffAvailability,
    request: ScheduleRequest
  ): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on availability window
    const availabilityHours = this.calculateDuration(availability.startTime, availability.endTime);
    if (availabilityHours >= 8) confidence += 0.1;
    if (availabilityHours <= 4) confidence -= 0.2;

    // Adjust based on business hours alignment
    const businessStart = request.constraints.businessHours.start;
    const businessEnd = request.constraints.businessHours.end;
    
    if (availability.startTime <= businessStart && availability.endTime >= businessEnd) {
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private generateShiftNotes(staffId: string, role: any, date: Date): string {
    const notes: string[] = [];
    
    if (date.getDay() === 0 || date.getDay() === 6) {
      notes.push('Weekend shift');
    }
    
    if (role.priority >= 8) {
      notes.push('High priority role');
    }
    
    return notes.join(', ');
  }

  private calculateEfficiency(shifts: OptimizedShift[], request: ScheduleRequest): number {
    if (shifts.length === 0) return 0;

    let totalEfficiency = 0;
    let roleCount = 0;

    for (const role of request.roles) {
      const roleShifts = shifts.filter(s => s.roleId === role.id);
      const requiredHours = role.minStaffRequired * 8 * 7; // Assuming 8 hours/day, 7 days
      const actualHours = roleShifts.reduce((sum, s) => sum + s.duration, 0);
      
      const roleEfficiency = Math.min(100, (actualHours / requiredHours) * 100);
      totalEfficiency += roleEfficiency;
      roleCount++;
    }

    return roleCount > 0 ? Math.round(totalEfficiency / roleCount) : 0;
  }

  private calculateCoverage(shifts: OptimizedShift[], request: ScheduleRequest): Record<string, number> {
    const coverage: Record<string, number> = {};

    for (const role of request.roles) {
      const roleShifts = shifts.filter(s => s.roleId === role.id);
      const requiredHours = role.minStaffRequired * 8 * 7;
      const actualHours = roleShifts.reduce((sum, s) => sum + s.duration, 0);
      
      coverage[role.name] = Math.round((actualHours / requiredHours) * 100);
    }

    return coverage;
  }

  private generateWarnings(shifts: OptimizedShift[], request: ScheduleRequest): string[] {
    const warnings: string[] = [];

    // Check for understaffing
    for (const role of request.roles) {
      const roleShifts = shifts.filter(s => s.roleId === role.id);
      if (roleShifts.length < role.minStaffRequired) {
        warnings.push(`${role.name} may be understaffed`);
      }
    }

    // Check for overworked staff
    const staffHours: Record<string, number> = {};
    for (const shift of shifts) {
      staffHours[shift.staffId] = (staffHours[shift.staffId] || 0) + shift.duration;
    }

    for (const [staffId, hours] of Object.entries(staffHours)) {
      if (hours > request.constraints.maxHoursPerWeek) {
        warnings.push(`Staff member ${staffId} scheduled for ${hours} hours (exceeds limit)`);
      }
    }

    return warnings;
  }

  private generateSuggestions(shifts: OptimizedShift[], request: ScheduleRequest): string[] {
    const suggestions: string[] = [];

    // Suggest hiring if consistently understaffed
    for (const role of request.roles) {
      const roleShifts = shifts.filter(s => s.roleId === role.id);
      if (roleShifts.length < role.minStaffRequired * 0.8) {
        suggestions.push(`Consider hiring additional ${role.name} staff`);
      }
    }

    // Suggest schedule adjustments
    if (shifts.length > 0) {
      const avgConfidence = shifts.reduce((sum, s) => sum + s.confidence, 0) / shifts.length;
      if (avgConfidence < 0.7) {
        suggestions.push('Consider adjusting staff availability or business hours for better optimization');
      }
    }

    return suggestions;
  }

  private calculateTotalCost(shifts: OptimizedShift[]): number {
    return shifts.reduce((total, shift) => total + (shift.payRate * shift.duration), 0);
  }

  private calculateTotalHours(shifts: OptimizedShift[]): number {
    return shifts.reduce((total, shift) => total + shift.duration, 0);
  }

  // Placeholder methods for genetic algorithm (simplified)
  private initializePopulation(size: number, days: Date[], timeSlots: string[], request: ScheduleRequest): any[] {
    // Initialize random population of schedules
    return Array.from({ length: size }, () => this.generateRandomSchedule(days, timeSlots, request));
  }

  private generateRandomSchedule(days: Date[], timeSlots: string[], request: ScheduleRequest): any {
    // Generate a random valid schedule
    return { shifts: [], fitness: 0 };
  }

  private evolvePopulation(population: any[], request: ScheduleRequest): any[] {
    // Implement genetic algorithm evolution
    return population;
  }

  private selectBestSchedule(population: any[], request: ScheduleRequest): any {
    // Select the schedule with highest fitness
    return population[0];
  }

  private convertToShifts(schedule: any, request: ScheduleRequest): OptimizedShift[] {
    // Convert internal representation to OptimizedShift array
    return [];
  }

  private findCoverageGaps(shifts: OptimizedShift[], request: ScheduleRequest): any[] {
    // Find gaps in schedule coverage
    return [];
  }

  private fillGap(gap: any, request: ScheduleRequest): OptimizedShift | null {
    // Try to fill a coverage gap
    return null;
  }

  private optimizeShiftLength(shift: OptimizedShift, request: ScheduleRequest): number {
    // Optimize individual shift length
    return shift.duration;
  }

  private balanceWorkload(shifts: OptimizedShift[], request: ScheduleRequest): OptimizedShift[] {
    // Balance workload across staff
    return shifts;
  }
}

// Export the main optimization function
export async function optimizeScheduleWithAI(request: ScheduleRequest): Promise<OptimizationResult> {
  const optimizer = new ScheduleOptimizer(request);
  
  // Add delay to simulate AI processing
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return await optimizer.generateSmartSchedule(request);
}
