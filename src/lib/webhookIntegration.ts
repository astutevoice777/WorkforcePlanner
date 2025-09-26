import { createClient } from "@supabase/supabase-js";

// Configuration - these should ideally be moved to environment variables
const SUPABASE_URL = "https://audgiuzivnrvlegfrsxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZGdpdXppdm5ydmxlZ2Zyc3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTU3NDcsImV4cCI6MjA3NDQ3MTc0N30.jThYxLIOaKfvRuyHc_eShkYuMeZceF3Y658UM8OBmEI";
const TABLE_NAME = "staff";
const N8N_WEBHOOK_URL = "https://codedestroyerprashu.app.n8n.cloud/webhook-test/cc606036-1458-423d-bd98-7114a12a4212";

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface WebhookIntegrationResult {
  success: boolean;
  message: string;
  data?: {
    recordCount?: number;
    webhookStatus?: number;
    webhookResponse?: unknown;
  };
  error?: string;
}

/**
 * Fetches staff data from Supabase and sends it to the n8n webhook
 * This function replicates the functionality from the original script.js
 */
export async function fetchStaffAndSendToWebhook(businessId: string): Promise<WebhookIntegrationResult> {
  try {
    console.log('🔄 Starting webhook integration...');
    
    // Fetch rows for the specified business only
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq('business_id', businessId);

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      return {
        success: false,
        message: "Failed to fetch staff data from database",
        error: error.message
      };
    }

    console.log(`✅ Fetched ${data.length} staff records for business_id=${businessId}.`);

    // Send data to n8n webhook using fetch API
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("📤 Successfully sent to n8n webhook:", response.status);
    
    return {
      success: true,
      message: `Successfully sent ${data.length} staff records to webhook for business_id=${businessId}`,
      data: {
        recordCount: data.length,
        webhookStatus: response.status,
        webhookResponse: responseData
      }
    };

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    console.error("🔥 Webhook integration error:", errorMessage);
    
    return {
      success: false,
      message: "Failed to complete webhook integration",
      error: errorMessage
    };
  }
}

/**
 * Alternative function that allows sending custom data to the webhook
 * This can be used if you want to send schedule data instead of staff data
 */
export async function sendDataToWebhook(data: unknown, customUrl?: string): Promise<WebhookIntegrationResult> {
  try {
    const webhookUrl = customUrl || N8N_WEBHOOK_URL;
    
    console.log('🔄 Sending custom data to webhook...');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("📤 Successfully sent custom data to webhook:", response.status);
    
    return {
      success: true,
      message: "Successfully sent custom data to webhook",
      data: {
        webhookStatus: response.status,
        webhookResponse: responseData
      }
    };

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    console.error("🔥 Custom webhook error:", errorMessage);
    
    return {
      success: false,
      message: "Failed to send custom data to webhook",
      error: errorMessage
    };
  }
}
