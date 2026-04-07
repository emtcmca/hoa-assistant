import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function createClient() {
  if (client) return client
  client = createSupabaseClient(
    'https://erufxxxmabwllqqndbkc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydWZ4eHhtYWJ3bGxxcW5kYmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTQ4NTEsImV4cCI6MjA5MDc5MDg1MX0.1uYMEn_odt4MNgdG9yevtnmJHI_OuTXYS3xejUU8OYw'
  )
  return client
}

export function createServiceClient() {
  return createSupabaseClient(
    'https://erufxxxmabwllqqndbkc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydWZ4eHhtYWJ3bGxxcW5kYmtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDE1NDM3OSwiZXhwIjoyMDU5NzMwMzc5fQ.ybdBRoGTDIBbWFsHE3qJCPmPTGjHvLdNwVYMxlgYBQU'
  )
}