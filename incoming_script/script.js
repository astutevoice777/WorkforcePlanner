// install dependencies: npm install express cors body-parser @supabase/supabase-js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

// ---------- CONFIG ----------
const SUPABASE_URL = "https://audgiuzivnrvlegfrsxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZGdpdXppdm5ydmxlZ2Zyc3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTU3NDcsImV4cCI6MjA3NDQ3MTc0N30.jThYxLIOaKfvRuyHc_eShkYuMeZceF3Y658UM8OBmEI";
const TABLE_NAME = "schedules";
const PORT = 5000;

// ---------- SUPABASE CLIENT ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- EXPRESS SERVER ----------
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Webhook endpoint to receive data from n8n
// Helpers to normalize payloads to schedules table schema
const ALLOWED_STATUS = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const ALLOWED_GENERATED_BY = new Set(["AI", "MANUAL"]);

function toDateOnly(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    // format YYYY-MM-DD
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}

function normalizeSchedule(input) {
  // Accept common casing variants
  const business_id = input.business_id || input.businessId || input.businessID || input.business || null;
  let weekStart = input.week_start_date || input.weekStartDate || input.start_date || input.startDate || null;
  let status = (input.status || "DRAFT").toString().toUpperCase();
  let generated_by = (input.generated_by || input.generatedBy || "MANUAL").toString().toUpperCase();

  const week_start_date = toDateOnly(weekStart) || toDateOnly(new Date());
  if (!ALLOWED_STATUS.has(status)) status = "DRAFT";
  if (!ALLOWED_GENERATED_BY.has(generated_by)) generated_by = "MANUAL";

  return {
    business_id, // REQUIRED
    week_start_date, // REQUIRED (YYYY-MM-DD)
    status, // enum
    generated_by, // enum
  };
}

function validateSchedule(row) {
  const errors = [];
  if (!row.business_id) errors.push("business_id is required");
  if (!row.week_start_date) errors.push("week_start_date is required (YYYY-MM-DD)");
  if (!ALLOWED_STATUS.has(row.status)) errors.push(`status must be one of ${Array.from(ALLOWED_STATUS).join(", ")}`);
  if (!ALLOWED_GENERATED_BY.has(row.generated_by)) errors.push(`generated_by must be one of ${Array.from(ALLOWED_GENERATED_BY).join(", ")}`);
  return errors;
}

app.post("/webhook", async (req, res) => {
  const payload = req.body;

  try {
    const items = Array.isArray(payload) ? payload : [payload];
    const normalized = items.map(normalizeSchedule);

    // validate and collect errors with indexes for clarity
    const errors = normalized.map(validateSchedule);
    const hasErrors = errors.some(arr => arr.length > 0);
    if (hasErrors) {
      return res.status(400).json({
        message: "Invalid payload for schedules",
        errors: errors.map((errs, i) => ({ index: i, errors: errs })),
        example: {
          business_id: "<uuid>",
          week_start_date: "2025-09-29",
          status: "DRAFT|PUBLISHED|ARCHIVED",
          generated_by: "AI|MANUAL",
        },
      });
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(normalized)
      .select();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Inserted into schedules:", data?.length ?? 0);
    return res.status(200).json({
      message: "Data inserted successfully",
      inserted: data?.length ?? 0,
      rows: data,
    });
  } catch (err) {
    console.error("🔥 Error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Unknown server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Webhook receiver running at http://localhost:${PORT}/webhook`);
});
