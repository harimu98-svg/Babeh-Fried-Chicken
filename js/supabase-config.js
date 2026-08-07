// Supabase Configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

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
