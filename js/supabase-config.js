// Supabase Configuration
const SUPABASE_URL = 'https://intzwjmlypmopzauxeqt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludHp3am1seXBtb3B6YXV4ZXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MTc5MTIsImV4cCI6MjA3MDI5MzkxMn0.VwwVEDdHtYP5gui4epTcNfLXhPkmfFbRVb5y8mrXJiM';

// Initialize Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Raja Ongkir API Key (free version)
const RAJA_ONGKIR_API_KEY = 'YOUR_RAJA_ONGKIR_API_KEY';
const RAJA_ONGKIR_BASE_URL = 'https://api.rajaongkir.com/starter';

// WA Admin
const WA_ADMIN = '6282121266056';

// Export configurations
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.supabaseClient = supabaseClient;
window.RAJA_ONGKIR_API_KEY = RAJA_ONGKIR_API_KEY;
window.RAJA_ONGKIR_BASE_URL = RAJA_ONGKIR_BASE_URL;
window.WA_ADMIN = WA_ADMIN;
