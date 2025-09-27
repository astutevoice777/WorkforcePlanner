import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Download,
  Upload,
  Settings,
  Zap,
  Copy,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  badge?: string;
  disabled?: boolean;
}

interface QuickActionsProps {
  onGenerateSchedule?: () => void;
  onOptimizeSchedule?: () => void;
  onExportSchedule?: () => void;
  onImportSchedule?: () => void;
  onViewAnalytics?: () => void;
  onManageTemplates?: () => void;
  onResolveConflicts?: () => void;
  onDuplicateSchedule?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onGenerateSchedule,
  onOptimizeSchedule,
  onExportSchedule,
  onImportSchedule,
  onViewAnalytics,
  onManageTemplates,
  onResolveConflicts,
  onDuplicateSchedule
}) => {
  const navigate = useNavigate();

  const quickActions: QuickAction[] = [
    {
      id: 'generate',
      title: 'Generate New Schedule',
      description: 'Create an optimized schedule using n8n and OpenAI',
      icon: <Calendar className="h-5 w-5" />,
      action: onGenerateSchedule || (() => {}),
      variant: 'default',
      badge: 'n8n'
    },
    {
      id: 'optimize',
      title: 'Optimize Existing',
      description: 'Improve current schedule efficiency and coverage',
      icon: <Zap className="h-5 w-5" />,
      action: onOptimizeSchedule || (() => {}),
      variant: 'outline',
      badge: 'Smart'
    },
    {
      id: 'enhanced-view',
      title: 'Enhanced Calendar View',
      description: 'Switch to Google Calendar-style interface',
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => navigate('/schedule/enhanced'),
      variant: 'outline',
      badge: 'New'
    },
    {
      id: 'templates',
      title: 'Manage Templates',
      description: 'Create and customize scheduling templates',
      icon: <Settings className="h-5 w-5" />,
      action: onManageTemplates || (() => {}),
      variant: 'outline'
    },
    {
      id: 'conflicts',
      title: 'Resolve Conflicts',
      description: 'Identify and fix scheduling conflicts',
      icon: <AlertTriangle className="h-5 w-5" />,
      action: onResolveConflicts || (() => {}),
      variant: 'outline',
      badge: '3' // Example conflict count
    },
    {
      id: 'analytics',
      title: 'View Analytics',
      description: 'Analyze schedule performance and metrics',
      icon: <TrendingUp className="h-5 w-5" />,
      action: onViewAnalytics || (() => {}),
      variant: 'outline'
    },
    {
      id: 'export',
      title: 'Export Schedule',
      description: 'Download schedule as PDF or Excel',
      icon: <Download className="h-5 w-5" />,
      action: onExportSchedule || (() => {}),
      variant: 'outline'
    },
    {
      id: 'import',
      title: 'Import Schedule',
      description: 'Upload schedule from external file',
      icon: <Upload className="h-5 w-5" />,
      action: onImportSchedule || (() => {}),
      variant: 'outline'
    },
    {
      id: 'duplicate',
      title: 'Duplicate Schedule',
      description: 'Copy current schedule to another week',
      icon: <Copy className="h-5 w-5" />,
      action: onDuplicateSchedule || (() => {}),
      variant: 'outline'
    }
  ];

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              className="h-auto p-4 flex flex-col items-start space-y-2 text-left"
              onClick={action.action}
              disabled={action.disabled}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  {action.icon}
                  <span className="font-medium">{action.title}</span>
                </div>
                {action.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {action.badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-left">
                {action.description}
              </p>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Specialized Quick Actions for different contexts
export const ScheduleQuickActions: React.FC<{
  hasSchedules: boolean;
  onGenerateSchedule: () => void;
}> = ({ hasSchedules, onGenerateSchedule }) => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Generate Schedule',
      description: 'Create optimized schedule with n8n + OpenAI',
      icon: <Calendar className="h-4 w-4" />,
      action: onGenerateSchedule,
      primary: true
    },
    {
      title: 'Enhanced View',
      description: 'Google Calendar interface',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => navigate('/schedule/enhanced'),
      primary: false
    }
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.primary ? 'gradient' : 'outline'}
          onClick={action.action}
          className="flex items-center space-x-2"
        >
          {action.icon}
          <span>{action.title}</span>
        </Button>
      ))}
    </div>
  );
};

// Time-based Quick Actions
export const TimeBasedActions: React.FC<{
  currentHour: number;
  onMorningSetup?: () => void;
  onLunchCoverage?: () => void;
  onEveningClose?: () => void;
}> = ({ currentHour, onMorningSetup, onLunchCoverage, onEveningClose }) => {
  const getTimeBasedAction = () => {
    if (currentHour >= 6 && currentHour < 10) {
      return {
        title: 'Morning Setup',
        description: 'Prepare opening shift coverage',
        icon: <Clock className="h-4 w-4" />,
        action: onMorningSetup || (() => {})
      };
    } else if (currentHour >= 11 && currentHour < 14) {
      return {
        title: 'Lunch Coverage',
        description: 'Ensure adequate lunch break coverage',
        icon: <Users className="h-4 w-4" />,
        action: onLunchCoverage || (() => {})
      };
    } else if (currentHour >= 17 && currentHour < 20) {
      return {
        title: 'Evening Close',
        description: 'Schedule closing procedures',
        icon: <Clock className="h-4 w-4" />,
        action: onEveningClose || (() => {})
      };
    }
    return null;
  };

  const timeAction = getTimeBasedAction();

  if (!timeAction) return null;

  return (
    <Card className="shadow-card border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {timeAction.icon}
            <div>
              <h4 className="font-medium">{timeAction.title}</h4>
              <p className="text-sm text-muted-foreground">{timeAction.description}</p>
            </div>
          </div>
          <Button size="sm" onClick={timeAction.action}>
            Action
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
