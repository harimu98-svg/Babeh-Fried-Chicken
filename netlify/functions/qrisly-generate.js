// netlify/functions/qrisly-generate.js
// ✅ API Key dari Environment Variable

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // 🔥 Ambil API Key dari ENV VAR (AMAN!)
        const API_KEY = process.env.QRISLY_API_KEY;
        
        if (!API_KEY) {
            console.error('❌ QRISLY_API_KEY not configured in environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'QRISLY_API_KEY not configured. Please set it in Netlify Environment Variables.' 
                })
            };
        }

        const BASE_URL = 'https://api.collaborator.komerce.id/user';
        const { amount, qris_id, order_number } = JSON.parse(event.body);

        console.log('🔄 Generating QRIS for order:', order_number);
        console.log('📌 Amount:', amount);
        console.log('📌 QRIS ID:', qris_id);

        const response = await fetch(`${BASE_URL}/qris/generate`, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                qris_id: qris_id || 1,
                amount: amount,
                output_type: 'image',
                unique_amount: true
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ QRISLY API Error:', response.status, data);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: 'QRISLY API error',
                    details: data 
                })
            };
        }

        console.log('✅ QRIS generated successfully, history_id:', data.data?.history_id);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                history_id: data.data?.history_id,
                qr_image: data.data?.qr_image || data.data?.qr_string,
                expired_at: data.data?.expired_at,
                ...data
            })
        };
    } catch (error) {
        console.error('❌ Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
