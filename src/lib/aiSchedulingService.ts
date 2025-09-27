// DEPRECATED: This file is replaced by the new OpenAI integration
// All AI scheduling now uses src/services/openaiSchedulingService.ts

import { openaiSchedulingService } from '@/services/openaiSchedulingService';
import { schedulingDataService } from '@/services/schedulingDataService';

export interface AISchedulingResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Redirect to new OpenAI-based scheduling
export async function triggerAIScheduling(businessId?: string): Promise<AISchedulingResponse> {
  try {
    console.log('🔄 Redirecting to new OpenAI scheduling system...');
    
    if (!businessId) {
      return {
        success: false,
        message: 'Business ID is required for AI scheduling'
      };
    }

    // Use the new OpenAI integration
    const weekStart = new Date();
    const schedulingData = await schedulingDataService.exportSchedulingData(businessId, weekStart);
    
    if (!schedulingData) {
      return {
        success: false,
        message: 'Failed to export scheduling data'
      };
    }

    const response = await openaiSchedulingService.generateOptimizedSchedule(schedulingData);
    
    return {
      success: response.success,
      message: response.success 
        ? `AI scheduling completed with ${response.optimization_score}% optimization score`
        : 'AI scheduling failed',
      data: response
    };

  } catch (error: any) {
    console.error("🔥 AI Scheduling Error:", error.message);
    
    return {
      success: false,
      message: `AI scheduling failed: ${error.message}`
    };
  }
}

export async function checkAISchedulingStatus(jobId?: string): Promise<AISchedulingResponse> {
  try {
    const connectionOk = await openaiSchedulingService.testConnection();
    
    return {
      success: connectionOk,
      message: connectionOk ? "OpenAI AI scheduling service is available" : "OpenAI connection failed"
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Status check failed: ${error.message}`
    };
  }
}
