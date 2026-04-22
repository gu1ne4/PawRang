-- Remove unused prescription quantity column from EMR prescriptions.
-- Run this in the Supabase SQL editor after confirming the app no longer uses it.

alter table if exists public.medical_record_prescriptions
drop column if exists quantity_dispense;
