import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://bbmfdbpspetatechhuta.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibWZkYnBzcGV0YXRlY2hodXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzE2OTEsImV4cCI6MjA4ODgwNzY5MX0.1wd8CrPOUZGMCq2DehSG7vk29Bqqv5V0DRVPgiBG-vc"

export const supabase = createClient(supabaseUrl, supabaseKey)