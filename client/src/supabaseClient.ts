import { createClient } from '@supabase/supabase-js'

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://bbmfdbpspetatechhuta.supabase.co"

export const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibWZkYnBzcGV0YXRlY2hodXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzE2OTEsImV4cCI6MjA4ODgwNzY5MX0.1wd8CrPOUZGMCq2DehSG7vk29Bqqv5V0DRVPgiBG-vc"

export const supabase = createClient(supabaseUrl, supabaseKey)
