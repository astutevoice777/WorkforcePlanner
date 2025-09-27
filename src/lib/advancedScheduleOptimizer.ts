import { format, addDays, parseISO, isSameDay, differenceInHours, startOfWeek, endOfWeek } from 'date-fns';

export interface OptimizedShift {
  id: string;
  staffId: string;
  roleId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  score: number; // optimization score
  conflicts: string[]; // any constraint violations
}

export interface OptimizationResult {
  shifts: OptimizedShift[];
  totalScore: number;
  coverageScore: number;
  fairnessScore: number;
  costScore: number;
  constraintViolations: string[];
  recommendations: string[];
}

export interface AdvancedConstraints {
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  minHoursPerWeek: number;
  minStaffPerRole: Record<string, number>;
  maxStaffPerRole: Record<string, number>;
  minBreakBetweenShifts: number;
  maxConsecutiveDays: number;
  preferredShiftLengths: number[];
  businessHours: {
    start: string;
    end: string;
    days: number[];
  };
  peakHours: Array<{
    day: number;
    startTime: string;
    endTime: string;
    multiplier: number; // staff requirement multiplier
  }>;
  skillRequirements: Record<string, string[]>; // roleId -> required skills
  staffSkills: Record<string, string[]>; // staffId -> skills
  laborCostBudget?: number;
  fairnessWeight: number; // 0-1, how much to prioritize fair distribution
  costWeight: number; // 0-1, how much to prioritize cost optimization
}

export class AdvancedScheduleOptimizer {
  private constraints: AdvancedConstraints;
  private staffAvailability: Record<string, any[]>;
  private roles: any[];
  private weekStartDate: Date;
  private businessId: string;

  constructor(
    businessId: string,
    weekStartDate: Date,
    staffAvailability: Record<string, any[]>,
    roles: any[],
    constraints: AdvancedConstraints
  ) {
    this.businessId = businessId;
    this.weekStartDate = weekStartDate;
    this.staffAvailability = staffAvailability;
    this.roles = roles;
    this.constraints = constraints;
  }

  /**
   * Main optimization method using genetic algorithm with multiple objectives
   */
  async optimizeSchedule(): Promise<OptimizationResult> {
    console.log('🧠 Starting advanced schedule optimization...');
    
    // Generate initial population of schedules
    const populationSize = 50;
    const generations = 100;
    let population = this.generateInitialPopulation(populationSize);
    
    // Evolve population through genetic algorithm
    for (let gen = 0; gen < generations; gen++) {
      population = this.evolvePopulation(population);
      
      if (gen % 20 === 0) {
        const best = population[0];
        console.log(`Generation ${gen}: Best score = ${best.totalScore.toFixed(2)}`);
      }
    }

    const bestSchedule = population[0];
    
    return {
      shifts: bestSchedule.shifts,
      totalScore: bestSchedule.totalScore,
      coverageScore: bestSchedule.coverageScore,
      fairnessScore: bestSchedule.fairnessScore,
      costScore: bestSchedule.costScore,
      constraintViolations: this.validateSchedule(bestSchedule.shifts),
      recommendations: this.generateRecommendations(bestSchedule)
    };
  }

  /**
   * Generate initial population of random valid schedules
   */
  private generateInitialPopulation(size: number): any[] {
    const population = [];
    
    for (let i = 0; i < size; i++) {
      const schedule = this.generateRandomSchedule();
      const scores = this.evaluateSchedule(schedule);
      
      population.push({
        shifts: schedule,
        ...scores
      });
    }
    
    // Sort by total score (descending)
    return population.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Generate a random valid schedule
   */
  private generateRandomSchedule(): OptimizedShift[] {
    const shifts: OptimizedShift[] = [];
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(this.weekStartDate, i));
    
    for (const day of weekDays) {
      const dayOfWeek = day.getDay();
      
      // Skip if business is closed
      if (!this.constraints.businessHours.days.includes(dayOfWeek)) continue;
      
      for (const role of this.roles) {
        const requiredStaff = this.getRequiredStaffForRole(role.id, dayOfWeek);
        const availableStaff = this.getAvailableStaff(day, role.id);
        
        // Randomly select staff for this role and day
        const selectedStaff = this.randomlySelectStaff(availableStaff, requiredStaff);
        
        for (const staffId of selectedStaff) {
          const shift = this.generateShiftForStaff(staffId, role.id, day);
          if (shift) {
            shifts.push(shift);
          }
        }
      }
    }
    
    return shifts;
  }

  /**
   * Evolve population using genetic algorithm operators
   */
  private evolvePopulation(population: any[]): any[] {
    const newPopulation = [];
    const eliteSize = Math.floor(population.length * 0.1); // Keep top 10%
    
    // Keep elite individuals
    for (let i = 0; i < eliteSize; i++) {
      newPopulation.push(population[i]);
    }
    
    // Generate offspring through crossover and mutation
    while (newPopulation.length < population.length) {
      const parent1 = this.tournamentSelection(population);
      const parent2 = this.tournamentSelection(population);
      
      let offspring = this.crossover(parent1, parent2);
      offspring = this.mutate(offspring);
      
      const scores = this.evaluateSchedule(offspring.shifts);
      newPopulation.push({
        shifts: offspring.shifts,
        ...scores
      });
    }
    
    return newPopulation.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Tournament selection for genetic algorithm
   */
  private tournamentSelection(population: any[], tournamentSize: number = 5): any {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }
    return tournament.sort((a, b) => b.totalScore - a.totalScore)[0];
  }

  /**
   * Crossover operation for genetic algorithm
   */
  private crossover(parent1: any, parent2: any): any {
    const offspring: OptimizedShift[] = [];
    const crossoverPoint = Math.random();
    
    for (let i = 0; i < Math.max(parent1.shifts.length, parent2.shifts.length); i++) {
      if (Math.random() < crossoverPoint && i < parent1.shifts.length) {
        offspring.push({ ...parent1.shifts[i] });
      } else if (i < parent2.shifts.length) {
        offspring.push({ ...parent2.shifts[i] });
      }
    }
    
    return { shifts: this.repairSchedule(offspring) };
  }

  /**
   * Mutation operation for genetic algorithm
   */
  private mutate(individual: any, mutationRate: number = 0.1): any {
    const mutatedShifts = [...individual.shifts];
    
    for (let i = 0; i < mutatedShifts.length; i++) {
      if (Math.random() < mutationRate) {
        // Random mutation: change shift time, staff, or remove shift
        const mutationType = Math.random();
        
        if (mutationType < 0.3) {
          // Change shift time
          mutatedShifts[i] = this.mutateShiftTime(mutatedShifts[i]);
        } else if (mutationType < 0.6) {
          // Change assigned staff
          mutatedShifts[i] = this.mutateShiftStaff(mutatedShifts[i]);
        } else {
          // Remove shift (will be repaired if needed)
          mutatedShifts.splice(i, 1);
          i--;
        }
      }
    }
    
    return { shifts: this.repairSchedule(mutatedShifts) };
  }

  /**
   * Evaluate schedule using multiple objectives
   */
  private evaluateSchedule(shifts: OptimizedShift[]): any {
    const coverageScore = this.calculateCoverageScore(shifts);
    const fairnessScore = this.calculateFairnessScore(shifts);
    const costScore = this.calculateCostScore(shifts);
    const constraintPenalty = this.calculateConstraintPenalty(shifts);
    
    const totalScore = 
      (coverageScore * 0.4) + 
      (fairnessScore * this.constraints.fairnessWeight * 0.3) + 
      (costScore * this.constraints.costWeight * 0.2) - 
      (constraintPenalty * 0.1);
    
    return {
      totalScore,
      coverageScore,
      fairnessScore,
      costScore,
      constraintPenalty
    };
  }

  /**
   * Calculate how well the schedule covers required roles and times
   */
  private calculateCoverageScore(shifts: OptimizedShift[]): number {
    let totalCoverage = 0;
    let totalRequired = 0;
    
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(this.weekStartDate, i));
    
    for (const day of weekDays) {
      const dayOfWeek = day.getDay();
      if (!this.constraints.businessHours.days.includes(dayOfWeek)) continue;
      
      for (const role of this.roles) {
        const requiredStaff = this.getRequiredStaffForRole(role.id, dayOfWeek);
        const assignedStaff = shifts.filter(s => 
          s.roleId === role.id && 
          isSameDay(parseISO(s.date), day)
        ).length;
        
        totalRequired += requiredStaff;
        totalCoverage += Math.min(assignedStaff, requiredStaff);
      }
    }
    
    return totalRequired > 0 ? (totalCoverage / totalRequired) * 100 : 100;
  }

  /**
   * Calculate fairness of work distribution among staff
   */
  private calculateFairnessScore(shifts: OptimizedShift[]): number {
    const staffHours: Record<string, number> = {};
    
    // Calculate total hours per staff member
    for (const shift of shifts) {
      if (!staffHours[shift.staffId]) {
        staffHours[shift.staffId] = 0;
      }
      staffHours[shift.staffId] += shift.duration;
    }
    
    const hours = Object.values(staffHours);
    if (hours.length === 0) return 100;
    
    const mean = hours.reduce((a, b) => a + b, 0) / hours.length;
    const variance = hours.reduce((acc, h) => acc + Math.pow(h - mean, 2), 0) / hours.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher fairness score
    return Math.max(0, 100 - (standardDeviation * 10));
  }

  /**
   * Calculate cost efficiency of the schedule
   */
  private calculateCostScore(shifts: OptimizedShift[]): number {
    let totalCost = 0;
    
    for (const shift of shifts) {
      const role = this.roles.find(r => r.id === shift.roleId);
      const hourlyRate = role?.hourlyRate || 15;
      totalCost += shift.duration * hourlyRate;
    }
    
    if (this.constraints.laborCostBudget) {
      const budgetUtilization = totalCost / this.constraints.laborCostBudget;
      return Math.max(0, 100 - (budgetUtilization * 50)); // Penalize over-budget
    }
    
    return 100 - (totalCost / 1000); // Simple cost minimization
  }

  /**
   * Calculate penalty for constraint violations
   */
  private calculateConstraintPenalty(shifts: OptimizedShift[]): number {
    const violations = this.validateSchedule(shifts);
    return violations.length * 10; // 10 points penalty per violation
  }

  /**
   * Validate schedule against constraints
   */
  private validateSchedule(shifts: OptimizedShift[]): string[] {
    const violations: string[] = [];
    
    // Check staff hour limits
    const staffHours: Record<string, { daily: Record<string, number>, weekly: number }> = {};
    
    for (const shift of shifts) {
      if (!staffHours[shift.staffId]) {
        staffHours[shift.staffId] = { daily: {}, weekly: 0 };
      }
      
      if (!staffHours[shift.staffId].daily[shift.date]) {
        staffHours[shift.staffId].daily[shift.date] = 0;
      }
      
      staffHours[shift.staffId].daily[shift.date] += shift.duration;
      staffHours[shift.staffId].weekly += shift.duration;
    }
    
    // Validate constraints
    for (const [staffId, hours] of Object.entries(staffHours)) {
      if (hours.weekly > this.constraints.maxHoursPerWeek) {
        violations.push(`Staff ${staffId} exceeds weekly hour limit`);
      }
      
      for (const [date, dailyHours] of Object.entries(hours.daily)) {
        if (dailyHours > this.constraints.maxHoursPerDay) {
          violations.push(`Staff ${staffId} exceeds daily hour limit on ${date}`);
        }
      }
    }
    
    return violations;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(schedule: any): string[] {
    const recommendations: string[] = [];
    
    if (schedule.coverageScore < 80) {
      recommendations.push("Consider hiring more staff or adjusting role requirements");
    }
    
    if (schedule.fairnessScore < 70) {
      recommendations.push("Work distribution is uneven - consider balancing shifts");
    }
    
    if (schedule.costScore < 60) {
      recommendations.push("Schedule exceeds cost targets - consider optimizing shift lengths");
    }
    
    return recommendations;
  }

  // Helper methods (simplified implementations)
  private getRequiredStaffForRole(roleId: string, dayOfWeek: number): number {
    const role = this.roles.find(r => r.id === roleId);
    const baseRequirement = role?.minStaffRequired || 1;
    
    // Check for peak hours
    const peakMultiplier = this.constraints.peakHours
      .filter(p => p.day === dayOfWeek)
      .reduce((max, p) => Math.max(max, p.multiplier), 1);
    
    return Math.ceil(baseRequirement * peakMultiplier);
  }

  private getAvailableStaff(date: Date, roleId: string): string[] {
    const dayOfWeek = date.getDay();
    const available: string[] = [];
    
    for (const [staffId, availability] of Object.entries(this.staffAvailability)) {
      const dayAvailability = availability.find(a => a.dayOfWeek === dayOfWeek && a.isAvailable);
      if (dayAvailability) {
        // Check if staff has required skills for role
        const requiredSkills = this.constraints.skillRequirements[roleId] || [];
        const staffSkills = this.constraints.staffSkills[staffId] || [];
        
        if (requiredSkills.every(skill => staffSkills.includes(skill))) {
          available.push(staffId);
        }
      }
    }
    
    return available;
  }

  private randomlySelectStaff(available: string[], required: number): string[] {
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(required, available.length));
  }

  private generateShiftForStaff(staffId: string, roleId: string, date: Date): OptimizedShift | null {
    const dayOfWeek = date.getDay();
    const availability = this.staffAvailability[staffId]?.find(a => a.dayOfWeek === dayOfWeek);
    
    if (!availability) return null;
    
    const preferredLength = this.constraints.preferredShiftLengths[
      Math.floor(Math.random() * this.constraints.preferredShiftLengths.length)
    ];
    
    return {
      id: `shift_${Date.now()}_${Math.random()}`,
      staffId,
      roleId,
      date: format(date, 'yyyy-MM-dd'),
      startTime: availability.startTime,
      endTime: this.calculateEndTime(availability.startTime, preferredLength),
      duration: preferredLength,
      score: 0,
      conflicts: []
    };
  }

  private calculateEndTime(startTime: string, duration: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = hours + duration;
    return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private repairSchedule(shifts: OptimizedShift[]): OptimizedShift[] {
    // Remove duplicates and fix conflicts
    const uniqueShifts = shifts.filter((shift, index, self) => 
      index === self.findIndex(s => s.staffId === shift.staffId && s.date === shift.date)
    );
    
    return uniqueShifts;
  }

  private mutateShiftTime(shift: OptimizedShift): OptimizedShift {
    const newDuration = this.constraints.preferredShiftLengths[
      Math.floor(Math.random() * this.constraints.preferredShiftLengths.length)
    ];
    
    return {
      ...shift,
      duration: newDuration,
      endTime: this.calculateEndTime(shift.startTime, newDuration)
    };
  }

  private mutateShiftStaff(shift: OptimizedShift): OptimizedShift {
    const availableStaff = this.getAvailableStaff(parseISO(shift.date), shift.roleId);
    const newStaffId = availableStaff[Math.floor(Math.random() * availableStaff.length)];
    
    return {
      ...shift,
      staffId: newStaffId || shift.staffId
    };
  }
}

/**
 * Main API function for optimized schedule generation
 */
export async function generateOptimizedSchedule(request: {
  businessId: string;
  weekStartDate: Date;
  staffAvailability: Record<string, any[]>;
  roles: any[];
  constraints: AdvancedConstraints;
}): Promise<OptimizationResult> {
  const optimizer = new AdvancedScheduleOptimizer(
    request.businessId,
    request.weekStartDate,
    request.staffAvailability,
    request.roles,
    request.constraints
  );
  
  return await optimizer.optimizeSchedule();
}