import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Staff } from '@/hooks/useStaff';

interface Role {
  id: string;
  name: string;
  color: string;
  hourly_rate: number;
}

interface Shift {
  id?: string;
  staff_id: string;
  role_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  pay_rate: number;
}

// Webhook JSON types coming from incoming_script/script.js
interface WebhookShift {
  employee_id: string;
  name: string;
  shift_start: string;
  shift_end: string;
}

interface WebhookScheduleDoc {
  monday: WebhookShift[];
  tuesday: WebhookShift[];
  wednesday: WebhookShift[];
  thursday: WebhookShift[];
  friday: WebhookShift[];
  saturday: WebhookShift[];
  sunday: WebhookShift[];
}

interface GoogleCalendarViewProps {
  staff: Staff[];
  roles: Role[];
  shifts: Shift[];
  onShiftCreate: (shift: Omit<Shift, 'id'>) => void;
  onShiftUpdate: (id: string, shift: Partial<Shift>) => void;
  onShiftDelete: (id: string) => void;
}

export const GoogleCalendarView: React.FC<GoogleCalendarViewProps> = ({
  staff,
  roles,
  shifts,
  onShiftCreate,
  onShiftUpdate,
  onShiftDelete
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const { toast } = useToast();

  // Webhook schedules state and fetch
  const [webhookSchedules, setWebhookSchedules] = useState<WebhookScheduleDoc[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchWebhook = async () => {
      try {
        const res = await fetch('http://localhost:5050/api/schedules');
        if (res.ok) {
          const data = await res.json();
          if (mounted) setWebhookSchedules(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        // ignore fetch errors to avoid UI noise
      }
    };
    fetchWebhook();
    const id = setInterval(fetchWebhook, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // Generate week days
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Time slots (24-hour format)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  // Transform webhook schedules for the current week into Shift[]
  const webhookShiftsForWeek: Shift[] = useMemo(() => {
    if (!webhookSchedules || webhookSchedules.length === 0) return [];

    const latest = webhookSchedules[webhookSchedules.length - 1];
    const days: Array<keyof WebhookScheduleDoc> = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    ];

    const result: Shift[] = [];
    days.forEach((dayKey, idx) => {
      const dayDate = weekDays[idx];
      const entries = (latest[dayKey] || []) as WebhookShift[];
      entries.forEach((entry, j) => {
        const staffMatch =
          staff.find(s => s.id === entry.employee_id) ||
          staff.find(s => s.name?.toLowerCase() === entry.name?.toLowerCase()) ||
          staff[0];

        const roleMatch = staffMatch?.roles?.length
          ? roles.find(r => r.id === staffMatch.roles![0])
          : roles[0];

        const startTime = new Date(`2000-01-01T${entry.shift_start}`);
        const endTime = new Date(`2000-01-01T${entry.shift_end}`);
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        result.push({
          id: `wh-${idx}-${j}-${format(dayDate, 'yyyyMMdd')}-${entry.employee_id || entry.name}`,
          staff_id: staffMatch?.id || '',
          role_id: roleMatch?.id || '',
          date: format(dayDate, 'yyyy-MM-dd'),
          start_time: entry.shift_start,
          end_time: entry.shift_end,
          duration: isFinite(duration) ? duration : 0,
          status: 'SCHEDULED',
          notes: 'Imported from webhook',
          pay_rate: roleMatch?.hourly_rate || 0,
        });
      });
    });

    return result;
  }, [webhookSchedules, weekDays, roles, staff]);

  // Merge existing shifts with webhook shifts
  const mergedShifts = useMemo(() => {
    if (!webhookShiftsForWeek.length) return shifts;
    return [...shifts, ...webhookShiftsForWeek];
  }, [shifts, webhookShiftsForWeek]);

  // Get shifts for current week
  const weekShifts = useMemo(() => {
    return mergedShifts.filter(shift => {
      const shiftDate = parseISO(shift.date);
      return shiftDate >= weekStart && shiftDate <= endOfWeek(weekStart, { weekStartsOn: 1 });
    });
  }, [mergedShifts, weekStart]);

  // Get shifts for a specific day and time
  const getShiftsForDateTime = useCallback((date: Date, time: string) => {
    return weekShifts.filter(shift => {
      const shiftDate = parseISO(shift.date);
      return isSameDay(shiftDate, date) && shift.start_time <= time && shift.end_time > time;
    });
  }, [weekShifts]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, shift: Shift) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, date: Date, time: string) => {
    e.preventDefault();
    if (!draggedShift) return;

    const newDate = format(date, 'yyyy-MM-dd');
    const startTime = time;
    const endTime = format(new Date(`2000-01-01T${draggedShift.start_time}`).getTime() + 
      (new Date(`2000-01-01T${draggedShift.end_time}`).getTime() - new Date(`2000-01-01T${draggedShift.start_time}`).getTime()), 'HH:mm');

    onShiftUpdate(draggedShift.id!, {
      date: newDate,
      start_time: startTime,
      end_time: endTime
    });

    setDraggedShift(null);
    toast({
      title: 'Shift moved',
      description: `Shift moved to ${format(date, 'EEE, MMM d')} at ${time}`,
    });
  };

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  // Create new shift
  const handleCreateShift = (shiftData: Omit<Shift, 'id'>) => {
    onShiftCreate(shiftData);
    setIsCreateDialogOpen(false);
    toast({
      title: 'Shift created',
      description: 'New shift has been added to the schedule',
    });
  };

  // Get role by ID
  const getRoleById = (roleId: string) => roles.find(r => r.id === roleId);

  // Get staff by ID
  const getStaffById = (staffId: string) => staff.find(s => s.id === staffId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">
            {format(weekStart, 'MMM d')} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient">
              <Plus className="h-4 w-4 mr-2" />
              Add Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Shift</DialogTitle>
            </DialogHeader>
            <ShiftForm
              staff={staff}
              roles={roles}
              onSubmit={handleCreateShift}
              initialDate={selectedDate}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Grid */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="grid grid-cols-8 border-b border-border">
            {/* Time column header */}
            <div className="p-4 border-r border-border bg-muted/50">
              <span className="text-sm font-medium text-muted-foreground">Time</span>
            </div>
            
            {/* Day headers */}
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-4 text-center border-r border-border bg-muted/50">
                <div className="text-sm font-medium text-foreground">
                  {format(day, 'EEE')}
                </div>
                <div className="text-lg font-bold text-foreground">
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="max-h-[600px] overflow-y-auto">
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-8 border-b border-border min-h-[60px]">
                {/* Time label */}
                <div className="p-2 border-r border-border bg-muted/30 flex items-center">
                  <span className="text-xs text-muted-foreground">{time}</span>
                </div>

                {/* Day cells */}
                {weekDays.map((day) => {
                  const dayShifts = getShiftsForDateTime(day, time);
                  return (
                    <div
                      key={`${day.toISOString()}-${time}`}
                      className="border-r border-border p-1 relative min-h-[60px] hover:bg-muted/30 transition-colors"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day, time)}
                      onClick={() => {
                        setSelectedDate(day);
                        setIsCreateDialogOpen(true);
                      }}
                    >
                      {dayShifts.map((shift) => {
                        const role = getRoleById(shift.role_id);
                        const staffMember = getStaffById(shift.staff_id);
                        return (
                          <div
                            key={shift.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, shift)}
                            className="absolute inset-x-1 bg-primary/10 border border-primary/20 rounded p-1 cursor-move hover:bg-primary/20 transition-colors"
                            style={{
                              backgroundColor: role?.color ? `${role.color}20` : undefined,
                              borderColor: role?.color ? `${role.color}60` : undefined,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedShift(shift);
                            }}
                          >
                            <div className="text-xs font-medium truncate">
                              {staffMember?.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {role?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {shift.start_time} - {shift.end_time}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shift Details Dialog */}
      <Dialog open={!!selectedShift} onOpenChange={() => setSelectedShift(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <ShiftDetailsDialog
              shift={selectedShift}
              staff={staff}
              roles={roles}
              onUpdate={(updates) => {
                onShiftUpdate(selectedShift.id!, updates);
                setSelectedShift(null);
              }}
              onDelete={() => {
                onShiftDelete(selectedShift.id!);
                setSelectedShift(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Shift Form Component
interface ShiftFormProps {
  staff: Staff[];
  roles: Role[];
  onSubmit: (shift: Omit<Shift, 'id'>) => void;
  initialDate?: Date | null;
  initialShift?: Shift;
}

const ShiftForm: React.FC<ShiftFormProps> = ({ staff, roles, onSubmit, initialDate, initialShift }) => {
  const [formData, setFormData] = useState({
    staff_id: initialShift?.staff_id || '',
    role_id: initialShift?.role_id || '',
    date: initialShift?.date || (initialDate ? format(initialDate, 'yyyy-MM-dd') : ''),
    start_time: initialShift?.start_time || '09:00',
    end_time: initialShift?.end_time || '17:00',
    notes: initialShift?.notes || '',
    status: initialShift?.status || 'SCHEDULED' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startTime = new Date(`2000-01-01T${formData.start_time}`);
    const endTime = new Date(`2000-01-01T${formData.end_time}`);
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    const selectedRole = roles.find(r => r.id === formData.role_id);
    
    onSubmit({
      ...formData,
      duration,
      pay_rate: selectedRole?.hourly_rate || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="staff_id">Staff Member</Label>
        <Select value={formData.staff_id} onValueChange={(value) => setFormData(prev => ({ ...prev, staff_id: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select staff member" />
          </SelectTrigger>
          <SelectContent>
            {staff.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="role_id">Role</Label>
        <Select value={formData.role_id} onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roles.filter(role => {
              const selectedStaff = staff.find(s => s.id === formData.staff_id);
              return selectedStaff?.roles?.includes(role.id) || false;
            }).map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="end_time">End Time</Label>
          <Input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Add any notes for this shift..."
        />
      </div>

      <Button type="submit" className="w-full">
        {initialShift ? 'Update Shift' : 'Create Shift'}
      </Button>
    </form>
  );
};

// Shift Details Dialog Component
interface ShiftDetailsDialogProps {
  shift: Shift;
  staff: Staff[];
  roles: Role[];
  onUpdate: (updates: Partial<Shift>) => void;
  onDelete: () => void;
}

const ShiftDetailsDialog: React.FC<ShiftDetailsDialogProps> = ({
  shift,
  staff,
  roles,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const staffMember = staff.find(s => s.id === shift.staff_id);
  const role = roles.find(r => r.id === shift.role_id);

  if (isEditing) {
    return (
      <ShiftForm
        staff={staff}
        roles={roles}
        initialShift={shift}
        onSubmit={(updatedShift) => {
          onUpdate(updatedShift);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline" style={{ backgroundColor: role?.color + '20', borderColor: role?.color }}>
          {role?.name}
        </Badge>
        <Badge variant={shift.status === 'CONFIRMED' ? 'default' : 'secondary'}>
          {shift.status}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{staffMember?.name}</span>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{format(parseISO(shift.date), 'EEEE, MMMM d, yyyy')}</span>
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{shift.start_time} - {shift.end_time} ({shift.duration}h)</span>
        </div>

        {shift.notes && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">{shift.notes}</p>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Pay Rate: ${shift.pay_rate}/hour • Total: ${(shift.pay_rate * shift.duration).toFixed(2)}
        </div>
      </div>

      <div className="flex space-x-2">
        <Button variant="outline" onClick={() => setIsEditing(true)} className="flex-1">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button variant="destructive" onClick={onDelete} className="flex-1">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
};
