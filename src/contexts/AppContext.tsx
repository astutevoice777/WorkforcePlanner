import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Business, Staff, Schedule, TimeOffRequest } from '@/types/scheduling';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { generateSampleData } from '@/lib/scheduling';

interface AppState {
  business: Business | null;
  staff: Staff[];
  schedules: Schedule[];
  timeOffRequests: TimeOffRequest[];
  currentUser: { id: string; role: 'OWNER' | 'STAFF'; staffId?: string } | null;
  isLoading: boolean;
}

type AppAction = 
  | { type: 'SET_BUSINESS'; payload: Business }
  | { type: 'SET_STAFF'; payload: Staff[] }
  | { type: 'ADD_STAFF'; payload: Staff }
  | { type: 'UPDATE_STAFF'; payload: Staff }
  | { type: 'DELETE_STAFF'; payload: string }
  | { type: 'SET_SCHEDULES'; payload: Schedule[] }
  | { type: 'ADD_SCHEDULE'; payload: Schedule }
  | { type: 'UPDATE_SCHEDULE'; payload: Schedule }
  | { type: 'DELETE_SCHEDULE'; payload: string }
  | { type: 'SET_TIME_OFF_REQUESTS'; payload: TimeOffRequest[] }
  | { type: 'ADD_TIME_OFF_REQUEST'; payload: TimeOffRequest }
  | { type: 'UPDATE_TIME_OFF_REQUEST'; payload: TimeOffRequest }
  | { type: 'SET_CURRENT_USER'; payload: AppState['currentUser'] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'INIT_SAMPLE_DATA' };

const initialState: AppState = {
  business: null,
  staff: [],
  schedules: [],
  timeOffRequests: [],
  currentUser: null,
  isLoading: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_BUSINESS':
      return { ...state, business: action.payload };
    
    case 'SET_STAFF':
      return { ...state, staff: action.payload };
    
    case 'ADD_STAFF':
      return { ...state, staff: [...state.staff, action.payload] };
    
    case 'UPDATE_STAFF':
      return {
        ...state,
        staff: state.staff.map(s => s.id === action.payload.id ? action.payload : s)
      };
    
    case 'DELETE_STAFF':
      return {
        ...state,
        staff: state.staff.filter(s => s.id !== action.payload)
      };
    
    case 'SET_SCHEDULES':
      return { ...state, schedules: action.payload };
    
    case 'ADD_SCHEDULE':
      return { ...state, schedules: [...state.schedules, action.payload] };
    
    case 'UPDATE_SCHEDULE':
      return {
        ...state,
        schedules: state.schedules.map(s => s.id === action.payload.id ? action.payload : s)
      };
    
    case 'DELETE_SCHEDULE':
      return {
        ...state,
        schedules: state.schedules.filter(s => s.id !== action.payload)
      };
    
    case 'SET_TIME_OFF_REQUESTS':
      return { ...state, timeOffRequests: action.payload };
    
    case 'ADD_TIME_OFF_REQUEST':
      return { ...state, timeOffRequests: [...state.timeOffRequests, action.payload] };
    
    case 'UPDATE_TIME_OFF_REQUEST':
      return {
        ...state,
        timeOffRequests: state.timeOffRequests.map(r => r.id === action.payload.id ? action.payload : r)
      };
    
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'INIT_SAMPLE_DATA':
      const { business, staff } = generateSampleData();
      return {
        ...state,
        business,
        staff,
        currentUser: { id: 'owner-1', role: 'OWNER' }
      };
    
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Persistent storage hooks
  const [businessData, setBusinessData] = useLocalStorage<Business | null>('business-data', null);
  const [staffData, setStaffData] = useLocalStorage<Staff[]>('staff-data', []);
  const [schedulesData, setSchedulesData] = useLocalStorage<Schedule[]>('schedules-data', []);
  const [timeOffData, setTimeOffData] = useLocalStorage<TimeOffRequest[]>('timeoff-requests', []);
  const [currentUserData, setCurrentUserData] = useLocalStorage<AppState['currentUser']>('current-user', null);

  // Load data from localStorage on init
  useEffect(() => {
    if (businessData) {
      dispatch({ type: 'SET_BUSINESS', payload: businessData });
    }
    if (staffData.length > 0) {
      dispatch({ type: 'SET_STAFF', payload: staffData });
    }
    if (schedulesData.length > 0) {
      dispatch({ type: 'SET_SCHEDULES', payload: schedulesData });
    }
    if (timeOffData.length > 0) {
      dispatch({ type: 'SET_TIME_OFF_REQUESTS', payload: timeOffData });
    }
    if (currentUserData) {
      dispatch({ type: 'SET_CURRENT_USER', payload: currentUserData });
    }
    
    // If no data exists, initialize with sample data
    if (!businessData && staffData.length === 0 && !currentUserData) {
      dispatch({ type: 'INIT_SAMPLE_DATA' });
    }
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    if (state.business) {
      setBusinessData(state.business);
    }
  }, [state.business, setBusinessData]);

  useEffect(() => {
    setStaffData(state.staff);
  }, [state.staff, setStaffData]);

  useEffect(() => {
    setSchedulesData(state.schedules);
  }, [state.schedules, setSchedulesData]);

  useEffect(() => {
    setTimeOffData(state.timeOffRequests);
  }, [state.timeOffRequests, setTimeOffData]);

  useEffect(() => {
    if (state.currentUser) {
      setCurrentUserData(state.currentUser);
    }
  }, [state.currentUser, setCurrentUserData]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Helper hooks for specific data
export function useBusiness() {
  const { state, dispatch } = useApp();
  
  const updateBusiness = (business: Business) => {
    dispatch({ type: 'SET_BUSINESS', payload: business });
  };

  return {
    business: state.business,
    updateBusiness,
  };
}

export function useStaff() {
  const { state, dispatch } = useApp();
  
  const addStaff = (staff: Staff) => {
    dispatch({ type: 'ADD_STAFF', payload: staff });
  };

  const updateStaff = (staff: Staff) => {
    dispatch({ type: 'UPDATE_STAFF', payload: staff });
  };

  const deleteStaff = (staffId: string) => {
    dispatch({ type: 'DELETE_STAFF', payload: staffId });
  };

  return {
    staff: state.staff,
    addStaff,
    updateStaff,
    deleteStaff,
  };
}

export function useSchedules() {
  const { state, dispatch } = useApp();
  
  const addSchedule = (schedule: Schedule) => {
    dispatch({ type: 'ADD_SCHEDULE', payload: schedule });
  };

  const updateSchedule = (schedule: Schedule) => {
    dispatch({ type: 'UPDATE_SCHEDULE', payload: schedule });
  };

  const deleteSchedule = (scheduleId: string) => {
    dispatch({ type: 'DELETE_SCHEDULE', payload: scheduleId });
  };

  return {
    schedules: state.schedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
  };
}

export function useTimeOffRequests() {
  const { state, dispatch } = useApp();
  
  const addTimeOffRequest = (request: TimeOffRequest) => {
    dispatch({ type: 'ADD_TIME_OFF_REQUEST', payload: request });
  };

  const updateTimeOffRequest = (request: TimeOffRequest) => {
    dispatch({ type: 'UPDATE_TIME_OFF_REQUEST', payload: request });
  };

  return {
    timeOffRequests: state.timeOffRequests,
    addTimeOffRequest,
    updateTimeOffRequest,
  };
}