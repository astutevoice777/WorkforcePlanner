import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
  createdAt?: string;
}

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const dayOrder: Array<DayKey> = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const dayLabels: Record<DayKey, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const SimpleScheduleList: React.FC = () => {
  const [data, setData] = useState<WebhookScheduleDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Try to normalize time strings like "9:00", "09:00", "09:00:00", "9:00 AM" to HH:mm
  const normalizeTime = (raw?: unknown): string | null => {
    if (!raw) return null;
    const str = String(raw).trim();
    // If it's already HH:mm
    const hhmm = str.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (hhmm) {
      const [, h, m] = hhmm;
      const hh = h.length === 1 ? `0${h}` : h;
      return `${hh}:${m}`;
    }
    // HH:mm:ss -> HH:mm
    const hhmmss = str.match(/^([01]?\d|2[0-3]):([0-5]\d):([0-5]\d)$/);
    if (hhmmss) {
      const [, h, m] = hhmmss;
      const hh = h.length === 1 ? `0${h}` : h;
      return `${hh}:${m}`;
    }
    // h:mm AM/PM -> convert to 24h HH:mm
    const ampm = str.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const m = ampm[2];
      const ampmFlag = ampm[3].toUpperCase();
      if (ampmFlag === 'PM' && h !== 12) h += 12;
      if (ampmFlag === 'AM' && h === 12) h = 0;
      const hh = h < 10 ? `0${h}` : String(h);
      return `${hh}:${m}`;
    }
    // Fallback: return raw
    return str;
  };

  // Extract start/end time from various possible API shapes
  type ExtendedShift = Partial<WebhookShift> & {
    start_time?: unknown;
    end_time?: unknown;
    // additional possible API variants
    start?: unknown;
    end?: unknown;
    from?: unknown;
    to?: unknown;
    time_start?: unknown;
    time_end?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    shift?: {
      start?: unknown;
      end?: unknown;
      start_time?: unknown;
      end_time?: unknown;
      time?: unknown;
    }
    time?: unknown;
    shift_time?: unknown;
    timing?: unknown;
    hours?: unknown;
  };

  // Parse a combined string like "09:00-17:00" or "9:00 AM - 5:00 PM" into [start,end]
  const parseCombinedTimes = (raw?: unknown): [string | null, string | null] => {
    const str = typeof raw === 'string' ? raw : raw != null ? String(raw) : '';
    if (!str) return [null, null];
    // Try to find two time-like tokens separated by a dash
    // Capture tokens like 09:00, 9:00, 09:00:00, 9:00 AM
    const tokenRe = /(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)/gi;
    const tokens = [...str.matchAll(tokenRe)].map(m => m[1].trim());
    if (tokens.length >= 2) {
      const [a, b] = tokens as [string, string];
      return [normalizeTime(a), normalizeTime(b)];
    }
    return [null, null];
  };
  const getShiftTimes = (s: ExtendedShift): { start?: string | null; end?: string | null } => {
    // Support various key names
    let start = normalizeTime(
      s?.shift_start ?? s?.start_time ?? s?.start ?? s?.from ?? s?.time_start ?? s?.startTime ?? s?.shift?.start ?? s?.shift?.start_time
    );
    let end = normalizeTime(
      s?.shift_end ?? s?.end_time ?? s?.end ?? s?.to ?? s?.time_end ?? s?.endTime ?? s?.shift?.end ?? s?.shift?.end_time
    );
    if (!start && !end) {
      const [cStart, cEnd] = parseCombinedTimes(s?.time ?? s?.timing ?? s?.hours ?? s?.shift_time ?? s?.shift?.time);
      start = cStart;
      end = cEnd;
    }
    return { start, end };
  };

  useEffect(() => {
    let mounted = true;
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('http://localhost:5050/api/schedules');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr: WebhookScheduleDoc[] = await res.json();
        // Debug log first/last items to inspect shape (non-blocking)
        console.debug('[SimpleScheduleList] fetched', Array.isArray(arr) ? arr.length : 0, 'docs');
        if (!Array.isArray(arr) || arr.length === 0) {
          if (mounted) {
            setData(null);
          }
          return;
        }
        const latest = arr[arr.length - 1];
        console.debug('[SimpleScheduleList] latest doc keys:', Object.keys(latest || {}));
        // Log first entry keys for the first non-empty day to inspect field names
        const latestTyped = latest as WebhookScheduleDoc;
        for (const day of dayOrder) {
          const entries = latestTyped[day];
          if (Array.isArray(entries) && entries.length > 0) {
            console.debug('[SimpleScheduleList] first entry keys for', day, Object.keys(entries[0] || {}));
            break;
          }
        }
        if (mounted) {
          setData(latest);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load schedules';
        if (mounted) setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSchedules();
    const id = setInterval(fetchSchedules, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const hasAny = useMemo(() => {
    if (!data) return false;
    return dayOrder.some((d) => (data[d] || []).length > 0);
  }, [data]);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && (
          <div className="text-muted-foreground">Loading schedules from MongoDB...</div>
        )}
        {error && (
          <div className="text-destructive">{error}</div>
        )}
        {!loading && !error && !data && (
          <div className="text-muted-foreground">No schedules available.</div>
        )}
        {!loading && !error && data && !hasAny && (
          <div className="text-muted-foreground">No shifts found in the latest schedule.</div>
        )}

        {!loading && !error && data && hasAny && (
          <div className="space-y-6">
            {data.createdAt && (
              <div className="text-xs text-muted-foreground">Latest doc created at: {new Date(data.createdAt).toLocaleString()}</div>
            )}
            {dayOrder.map((dayKey) => {
              const entries = (data[dayKey] || []) as WebhookShift[];
              return (
                <div key={dayKey} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">{dayLabels[dayKey]}</h3>
                    <Badge variant="outline">{entries.length} shifts</Badge>
                  </div>
                  {entries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No shifts</div>
                  ) : (
                    <div className="rounded-md border border-border divide-y">
                      {entries.map((s, idx) => {
                        const { start, end } = getShiftTimes(s as unknown as ExtendedShift);
                        return (
                          <div key={idx} className="p-3 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-foreground">{s.name || s.employee_id}</div>
                              <div className="text-sm text-muted-foreground">{s.employee_id}</div>
                              {!start && !end && (
                                <div className="text-xs text-muted-foreground mt-1">No time fields found on this entry</div>
                              )}
                            </div>
                            <div className="text-sm font-medium min-w-[120px] text-right">
                              {start || '-'}{' '}
                              {start || end ? ' - ' : ''}
                              {end || '-'}
                              {!start && !end && (
                                <div className="text-xs text-muted-foreground mt-1">Hint: check the API response for missing time fields</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <Separator />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleScheduleList;
