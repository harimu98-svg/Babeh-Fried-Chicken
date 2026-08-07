// js/supabase-config.js - VERSI FINAL

// ============================================
// 1. SUPABASE CONFIG (Hardcode - AMAN)
// ============================================
// Anon key aman di frontend karena dilindungi RLS
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6In...'; // Hardcode

// ============================================
// 3. INITIALIZE SUPABASE
// ============================================
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// 4. EXPORT TO GLOBAL
// ============================================
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.supabaseClient = supabaseClient;

console.log('✅ Supabase initialized successfully');
