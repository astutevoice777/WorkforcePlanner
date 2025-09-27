// install first: npm install @supabase/supabase-js axios

import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// ---------- CONFIG ----------
const SUPABASE_URL = "https://audgiuzivnrvlegfrsxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZGdpdXppdm5ydmxlZ2Zyc3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTU3NDcsImV4cCI6MjA3NDQ3MTc0N30.jThYxLIOaKfvRuyHc_eShkYuMeZceF3Y658UM8OBmEI"; 
const TABLE_NAME = "staff";
const N8N_WEBHOOK_URL = "https://codedestroyerprashu.app.n8n.cloud/webhook-test/cc606036-1458-423d-bd98-7114a12a4212";

// ---------- SUPABASE CLIENT ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAndSend() {
  try {
    // fetch all rows from schedules
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*");

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      return;
    }

    console.log(`✅ Fetched ${data.length} rows.`);

    // send to n8n webhook
    const response = await axios.post(N8N_WEBHOOK_URL, data, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("📤 Sent to n8n webhook:", response.status);
  } catch (err) {
    console.error("🔥 Error:", err.message);
  }
}

fetchAndSend();