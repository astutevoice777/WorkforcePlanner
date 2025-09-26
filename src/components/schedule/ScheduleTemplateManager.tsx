import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, Copy, Star, Clock, Users, Calendar } from 'lucide-react';
import { OptimizationConstraints } from '@/lib/scheduleOptimizer';
import { useToast } from '@/hooks/use-toast';

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  constraints: OptimizationConstraints;
  isDefault: boolean;
  category: 'business' | 'retail' | 'healthcare' | 'hospitality' | 'custom';
  createdAt: Date;
  lastUsed?: Date;
}

interface ScheduleTemplateManagerProps {
  templates: ScheduleTemplate[];
  onTemplateCreate: (template: Omit<ScheduleTemplate, 'id' | 'createdAt'>) => void;
  onTemplateUpdate: (id: string, template: Partial<ScheduleTemplate>) => void;
  onTemplateDelete: (id: string) => void;
  onTemplateSelect: (template: ScheduleTemplate) => void;
  selectedTemplate?: ScheduleTemplate;
}

export const ScheduleTemplateManager: React.FC<ScheduleTemplateManagerProps> = ({
  templates,
  onTemplateCreate,
  onTemplateUpdate,
  onTemplateDelete,
  onTemplateSelect,
  selectedTemplate
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);
  const { toast } = useToast();

  const categoryColors = {
    business: 'bg-blue-100 text-blue-800',
    retail: 'bg-green-100 text-green-800',
    healthcare: 'bg-red-100 text-red-800',
    hospitality: 'bg-purple-100 text-purple-800',
    custom: 'bg-gray-100 text-gray-800'
  };

  const handleCreateTemplate = (templateData: Omit<ScheduleTemplate, 'id' | 'createdAt'>) => {
    onTemplateCreate(templateData);
    setIsCreateDialogOpen(false);
    toast({
      title: 'Template created',
      description: `${templateData.name} has been added to your templates.`,
    });
  };

  const handleDuplicateTemplate = (template: ScheduleTemplate) => {
    const duplicatedTemplate = {
      ...template,
      name: `${template.name} (Copy)`,
      isDefault: false,
      category: 'custom' as const
    };
    delete (duplicatedTemplate as any).id;
    delete (duplicatedTemplate as any).createdAt;
    
    onTemplateCreate(duplicatedTemplate);
    toast({
      title: 'Template duplicated',
      description: `Created a copy of ${template.name}.`,
    });
  };

  const handleDeleteTemplate = (template: ScheduleTemplate) => {
    if (template.isDefault) {
      toast({
        title: 'Cannot delete',
        description: 'Default templates cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }

    onTemplateDelete(template.id);
    toast({
      title: 'Template deleted',
      description: `${template.name} has been removed.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Schedule Templates</h2>
          <p className="text-muted-foreground">Manage and customize your scheduling templates</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Schedule Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              onSubmit={handleCreateTemplate}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className={`shadow-card cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onTemplateSelect(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <Badge className={categoryColors[template.category]} variant="secondary">
                    {template.category}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTemplate(template);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {!template.isDefault && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplate(template);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <CardDescription className="mb-4">
                {template.description}
              </CardDescription>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Max Hours/Day</span>
                  </div>
                  <span className="font-medium">{template.constraints.maxHoursPerDay}h</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Max Hours/Week</span>
                  </div>
                  <span className="font-medium">{template.constraints.maxHoursPerWeek}h</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Business Hours</span>
                  </div>
                  <span className="font-medium">
                    {template.constraints.businessHours.start} - {template.constraints.businessHours.end}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Operating Days</span>
                  <span className="font-medium">
                    {template.constraints.businessHours.days.length} days
                  </span>
                </div>
              </div>
              
              {template.lastUsed && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Last used: {template.lastUsed.toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <TemplateForm
              initialTemplate={editingTemplate}
              onSubmit={(templateData) => {
                onTemplateUpdate(editingTemplate.id, templateData);
                setEditingTemplate(null);
                toast({
                  title: 'Template updated',
                  description: `${templateData.name} has been updated.`,
                });
              }}
              onCancel={() => setEditingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Template Form Component
interface TemplateFormProps {
  initialTemplate?: ScheduleTemplate;
  onSubmit: (template: Omit<ScheduleTemplate, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ initialTemplate, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: initialTemplate?.name || '',
    description: initialTemplate?.description || '',
    category: initialTemplate?.category || 'custom' as const,
    isDefault: initialTemplate?.isDefault || false,
    constraints: initialTemplate?.constraints || {
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      minStaffPerRole: {},
      maxStaffPerRole: {},
      minBreakBetweenShifts: 12,
      maxConsecutiveDays: 5,
      preferredShiftLengths: [8],
      businessHours: {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5]
      }
    }
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleDay = (dayIndex: number) => {
    const currentDays = formData.constraints.businessHours.days;
    const updatedDays = currentDays.includes(dayIndex)
      ? currentDays.filter(d => d !== dayIndex)
      : [...currentDays, dayIndex].sort();
    
    setFormData(prev => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        businessHours: {
          ...prev.constraints.businessHours,
          days: updatedDays
        }
      }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter template name"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="category">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="hospitality">Hospitality</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe this template..."
          rows={3}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Working Hours Constraints</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="maxHoursPerDay">Max Hours per Day</Label>
            <Input
              id="maxHoursPerDay"
              type="number"
              min="1"
              max="24"
              value={formData.constraints.maxHoursPerDay}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  maxHoursPerDay: parseInt(e.target.value)
                }
              }))}
            />
          </div>
          
          <div>
            <Label htmlFor="maxHoursPerWeek">Max Hours per Week</Label>
            <Input
              id="maxHoursPerWeek"
              type="number"
              min="1"
              max="168"
              value={formData.constraints.maxHoursPerWeek}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  maxHoursPerWeek: parseInt(e.target.value)
                }
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTime">Business Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={formData.constraints.businessHours.start}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  businessHours: {
                    ...prev.constraints.businessHours,
                    start: e.target.value
                  }
                }
              }))}
            />
          </div>
          
          <div>
            <Label htmlFor="endTime">Business End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={formData.constraints.businessHours.end}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  businessHours: {
                    ...prev.constraints.businessHours,
                    end: e.target.value
                  }
                }
              }))}
            />
          </div>
        </div>

        <div>
          <Label>Operating Days</Label>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mt-2">
            {dayNames.map((day, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Switch
                  id={`day-${index}`}
                  checked={formData.constraints.businessHours.days.includes(index)}
                  onCheckedChange={() => toggleDay(index)}
                />
                <Label htmlFor={`day-${index}`} className="text-sm">
                  {day.slice(0, 3)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minBreak">Min Break Between Shifts (hours)</Label>
            <Input
              id="minBreak"
              type="number"
              min="0"
              max="24"
              value={formData.constraints.minBreakBetweenShifts}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  minBreakBetweenShifts: parseInt(e.target.value)
                }
              }))}
            />
          </div>
          
          <div>
            <Label htmlFor="maxConsecutive">Max Consecutive Days</Label>
            <Input
              id="maxConsecutive"
              type="number"
              min="1"
              max="7"
              value={formData.constraints.maxConsecutiveDays}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  maxConsecutiveDays: parseInt(e.target.value)
                }
              }))}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isDefault"
          checked={formData.isDefault}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
        />
        <Label htmlFor="isDefault">Set as default template</Label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialTemplate ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
};
