// netlify/functions/qrisly-generate.js
// PERBAIKI BASE URL DAN ENDPOINT

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
        const API_KEY = process.env.QRISLY_API_KEY;
        
        if (!API_KEY) {
            console.error('❌ QRISLY_API_KEY not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'QRISLY_API_KEY not configured' })
            };
        }

        // 🔥 PASTIKAN URL BENAR
        // ENDPOINT: https://api.collaborator.komerce.id/user/qris/generate
        const BASE_URL = 'https://api.collaborator.komerce.id/user';
        const GENERATE_ENDPOINT = `${BASE_URL}/qris/generate`;
        
        console.log('📌 Endpoint:', GENERATE_ENDPOINT);

        let requestData;
        try {
            requestData = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid JSON body',
                    details: parseError.message
                })
            };
        }

        const { amount, qris_id, order_number } = requestData;

        console.log('🔄 Generating QRIS for order:', order_number || 'unknown');
        console.log('📌 Amount:', amount);
        console.log('📌 QRIS ID:', qris_id || 761);

        // 🔥 REQUEST KE QRISLY
        const response = await fetch(GENERATE_ENDPOINT, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                qris_id: qris_id || 761,
                amount: amount,
                output_type: 'image',
                unique_amount: true
            })
        });

        const responseText = await response.text();
        console.log('📥 Response status:', response.status);
        console.log('📥 Raw response:', responseText);

        // Coba parse response
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid response from QRISLY',
                    raw: responseText,
                    status: response.status
                })
            };
        }

        if (!response.ok) {
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: 'QRISLY API error',
                    status: response.status,
                    details: data 
                })
            };
        }

        // 🔥 Ambil data dari response
        const qrImage = data?.data?.qr_image || data?.qr_image || data?.data?.qr_string;
        const historyId = data?.data?.history_id || data?.history_id;
        const expiredAt = data?.data?.expired_at || data?.expired_at;

        console.log('✅ QRIS generated successfully');
        console.log('📌 history_id:', historyId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                history_id: historyId,
                qr_image: qrImage,
                expired_at: expiredAt,
                data: data.data || data
            })
        };
    } catch (error) {
        console.error('❌ Function Error:', error);
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
