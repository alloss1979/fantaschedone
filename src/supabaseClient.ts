import { createClient } from '@supabase/supabase-js'

// SOSTITUISCI QUI SOTTO CON I TUOI DATI REALI
const supabaseUrl = 'https://crlaoqgjhqxohjdtgofe.supabase.co' 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNybGFvcWdqaHF4b2hqZHRnb2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDI1NzcsImV4cCI6MjA4NTI3ODU3N30.b6Knn4c0VoJhSavVvtPcYatGuQUjgNQFO7UrVOyeFRw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)