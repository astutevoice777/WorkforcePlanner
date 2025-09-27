import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for demo - in production, use backend
});

export interface SchedulingData {
  business: {
    id: string;
    name: string;
    business_hours: any;
  };
  staff: Array<{
    id: string;
    name: string;
    email: string;
    availability: any;
    constraints: any;
    hourly_rate: number;
    roles: string[];
  }>;
  roles: Array<{
    id: string;
    name: string;
    hourly_rate: number;
    min_staff_required: number;
    max_staff_allowed: number;
    color: string;
  }>;
  leave_requests: Array<{
    staff_id: string;
    start_date: string;
    end_date: string;
    status: string;
    is_partial_day: boolean;
    start_time?: string;
    end_time?: string;
  }>;
  week_start_date: string;
  constraints: {
    maxHoursPerDay: number;
    maxHoursPerWeek: number;
    minBreakBetweenShifts: number;
  };
}

export interface OptimizedShift {
  staff_id: string;
  staff_name: string;
  role_id: string;
  role_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  pay_rate: number;
  confidence_score: number;
  reasoning: string;
}

export interface SchedulingResponse {
  success: boolean;
  shifts: OptimizedShift[];
  optimization_score: number;
  total_cost: number;
  coverage_analysis: {
    fully_covered_hours: number;
    under_staffed_periods: Array<{
      date: string;
      time_range: string;
      role: string;
      shortage: number;
    }>;
    over_staffed_periods: Array<{
      date: string;
      time_range: string;
      role: string;
      excess: number;
    }>;
  };
  recommendations: string[];
  warnings: string[];
  ai_insights: string;
}

export class OpenAISchedulingService {
  private createSchedulingPrompt(data: SchedulingData): string {
    return `
You are an expert workforce scheduling AI. Generate an optimized weekly schedule based on the following data:

BUSINESS INFO:
- Name: ${data.business.name}
- Business Hours: ${JSON.stringify(data.business.business_hours, null, 2)}
- Week Starting: ${data.week_start_date}

STAFF AVAILABILITY:
${data.staff.map(staff => `
- ${staff.name} (ID: ${staff.id})
  - Hourly Rate: $${staff.hourly_rate}
  - Roles: ${staff.roles.join(', ')}
  - Availability: ${JSON.stringify(staff.availability, null, 2)}
  - Constraints: Max ${staff.constraints?.maxHoursPerDay || 8}h/day, ${staff.constraints?.maxHoursPerWeek || 40}h/week
`).join('')}

ROLES REQUIRED:
${data.roles.map(role => `
- ${role.name} (ID: ${role.id})
  - Rate: $${role.hourly_rate}/hr
  - Min Staff: ${role.min_staff_required}
  - Max Staff: ${role.max_staff_allowed}
`).join('')}

APPROVED LEAVE REQUESTS:
${data.leave_requests.filter(req => req.status === 'APPROVED').map(req => `
- Staff ${req.staff_id}: ${req.start_date} to ${req.end_date}${req.is_partial_day ? ` (Partial: ${req.start_time}-${req.end_time})` : ' (Full day)'}
`).join('')}

SCHEDULING CONSTRAINTS:
- Max ${data.constraints.maxHoursPerDay} hours per day per staff
- Max ${data.constraints.maxHoursPerWeek} hours per week per staff  
- Min ${data.constraints.minBreakBetweenShifts} hours between shifts

OPTIMIZATION GOALS:
1. Meet minimum staffing requirements for each role
2. Minimize labor costs while ensuring coverage
3. Respect staff availability and constraints
4. Balance workload fairly among staff
5. Avoid scheduling conflicts with approved leave
6. Maximize staff satisfaction and work-life balance

Please respond with a JSON object in this exact format:
{
  "success": true,
  "shifts": [
    {
      "staff_id": "staff_id_here",
      "staff_name": "Staff Name",
      "role_id": "role_id_here", 
      "role_name": "Role Name",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "duration": 8.0,
      "pay_rate": 15.00,
      "confidence_score": 0.95,
      "reasoning": "Brief explanation for this assignment"
    }
  ],
  "optimization_score": 85,
  "total_cost": 2400.00,
  "coverage_analysis": {
    "fully_covered_hours": 168,
    "under_staffed_periods": [],
    "over_staffed_periods": []
  },
  "recommendations": [
    "Consider hiring additional part-time staff for weekend coverage",
    "Staff member X could take on additional hours if needed"
  ],
  "warnings": [
    "Minimum coverage not met for Sunday evening"
  ],
  "ai_insights": "Overall analysis and strategic recommendations for the schedule"
}

Generate the most optimal schedule possible while strictly adhering to all constraints.
`;
  }

  async generateOptimizedSchedule(data: SchedulingData): Promise<SchedulingResponse> {
    try {
      console.log('Sending scheduling data to OpenAI:', data);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert workforce scheduling AI that generates optimal schedules. Always respond with valid JSON only, no additional text."
          },
          {
            role: "user", 
            content: this.createSchedulingPrompt(data)
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      console.log('OpenAI Response:', responseText);
      
      const schedulingResponse: SchedulingResponse = JSON.parse(responseText);
      
      // Validate the response structure
      if (!schedulingResponse.shifts || !Array.isArray(schedulingResponse.shifts)) {
        throw new Error('Invalid response format from OpenAI');
      }

      return schedulingResponse;

    } catch (error: any) {
      console.error('OpenAI Scheduling Error:', error);
      
      // Return fallback response on error
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
        recommendations: ['Failed to generate AI schedule. Please try again or create manually.'],
        warnings: [`API Error: ${error.message}`],
        ai_insights: 'Unable to generate AI insights due to API error.'
      };
    }
  }

  // Test the API connection
  async testConnection(): Promise<boolean> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello, are you working?" }],
        max_tokens: 10
      });
      
      return !!completion.choices[0]?.message?.content;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

export const openaiSchedulingService = new OpenAISchedulingService();
