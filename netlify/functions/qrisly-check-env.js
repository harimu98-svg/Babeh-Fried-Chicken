// netlify/functions/qrisly-check-env.js
// Fungsi untuk cek environment variables

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // 🔥 Cek environment variables (tanpa menampilkan nilai sensitif)
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            supabase_url: {
                exists: !!process.env.SUPABASE_URL,
                preview: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) + '...' : null
            },
            service_role_key: {
                exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
                preview: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
                    process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 15) + '...' : null
            },
            qrisly_api_key: {
                exists: !!process.env.QRISLY_API_KEY,
                length: process.env.QRISLY_API_KEY?.length || 0
            },
            rajaongkir_api_key: {
                exists: !!process.env.RAJA_ONGKIR_API_KEY,
                length: process.env.RAJA_ONGKIR_API_KEY?.length || 0
            }
        })
    };
};
