# Database Setup Instructions

Your Supabase instance needs the database schema to be set up. Since you have Supabase access on another device, follow these steps:

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://audgiuzivnrvlegfrsxd.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query and copy-paste the contents of each migration file in order:

### Step 1: Run the main schema migration
Copy and paste the entire contents of:
`supabase/migrations/20250926121231_85436aa5-8d77-4322-a00d-259ed6a8230c.sql`

### Step 2: Run the payroll tables migration
Copy and paste the entire contents of:
`supabase/migrations/20250926220000_add_payroll_tables.sql`

## Option 2: Using Supabase CLI (if available on your other device)

1. Install Supabase CLI on the device with access
2. Clone this project or copy the migration files
3. Run:
   ```bash
   supabase login
   supabase link --project-ref audgiuzivnrvlegfrsxd
   supabase db push
   ```

## What these migrations create:

### Main Schema (20250926121231_85436aa5-8d77-4322-a00d-259ed6a8230c.sql):
- `businesses` table - stores business information
- `roles` table - job roles within businesses
- `staff` table - employee information
- `staff_roles` table - links staff to their roles
- `schedules` table - schedule periods
- `shifts` table - individual work shifts
- `time_off_requests` table - time off management
- Row Level Security (RLS) policies for all tables
- Necessary indexes and triggers

### Payroll Schema (20250926220000_add_payroll_tables.sql):
- `payroll_periods` table - payroll processing periods
- `payroll_entries` table - individual employee payroll records
- `payroll_deductions` table - deductions from payroll
- `payroll_reports` table - payroll summary reports
- `calculate_payroll_from_shifts` function - automated payroll calculation
- RLS policies for payroll tables

## After running migrations:

1. Restart your development server: `npm run dev`
2. The "Failed to load business data" error should be resolved
3. You should be able to create business profiles successfully

## Verification:

After running the migrations, you can verify they worked by:
1. Going to **Database** > **Tables** in your Supabase dashboard
2. You should see all the tables listed above
3. Try creating a business profile in your app - it should work without errors
