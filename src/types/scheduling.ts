export interface Business {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours: BusinessHours;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime: string; // "09:00"
  closeTime: string; // "17:00"
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  hourlyRate?: number;
  minStaffRequired: number;
  maxStaffAllowed: number;
  color: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: string[]; // Role IDs
  availability: StaffAvailability;
  constraints: StaffConstraints;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string; // "17:00"
}

export interface StaffConstraints {
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  minHoursBetweenShifts: number;
  preferredDaysOff?: string[]; // ["saturday", "sunday"]
}

export interface Schedule {
  id: string;
  businessId: string;
  weekStartDate: Date;
  shifts: Shift[];
  status: ScheduleStatus;
  generatedBy: 'AI' | 'MANUAL';
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface Shift {
  id: string;
  staffId: string;
  roleId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // hours
  status: ShiftStatus;
  notes?: string;
  payRate?: number;
}

export interface TimeOffRequest {
  id: string;
  staffId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: RequestStatus;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface AIScheduleRequest {
  businessId: string;
  weekStartDate: Date;
  staffAvailability: Record<string, StaffAvailability>;
  businessHours: BusinessHours;
  roles: Role[];
  constraints: {
    maxHoursPerDay: number;
    maxHoursPerWeek: number;
    minStaffPerRole: Record<string, number>;
    maxStaffPerRole: Record<string, number>;
  };
  timeOffRequests: TimeOffRequest[];
}

export interface AIScheduleResponse {
  success: boolean;
  schedule: Shift[];
  recommendations?: string[];
  warnings?: string[];
  efficiency: number; // 0-100 percentage
}

export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ShiftStatus = 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PayrollSummary {
  staffId: string;
  staffName: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  totalPay: number;
  shifts: Shift[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}