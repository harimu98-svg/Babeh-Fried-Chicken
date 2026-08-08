// netlify/functions/qrisly-generate.js
// VERSI DENGAN ERROR HANDLING LEBIH BAIK

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

        // 🔥 DEBUG: Log raw body
        console.log('📦 Raw body:', event.body);
        console.log('📦 Content-Type:', event.headers['content-type']);

        // 🔥 Parse JSON dengan try-catch
        let requestData;
        try {
            requestData = JSON.parse(event.body);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            console.error('❌ Raw body:', event.body);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid JSON body',
                    details: parseError.message,
                    received: event.body?.substring(0, 100)
                })
            };
        }

        const { amount, qris_id, order_number } = requestData;

        console.log('🔄 Generating QRIS for order:', order_number || 'unknown');
        console.log('📌 Amount:', amount);
        console.log('📌 QRIS ID:', qris_id || 761);

        const BASE_URL = 'https://api.collaborator.komerce.id/user';
        
        const response = await fetch(`${BASE_URL}/qris/generate`, {
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
        console.log('📥 Raw QRISLY Response:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ QRISLY Response Parse Error:', parseError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid response from QRISLY',
                    raw: responseText
                })
            };
        }

        if (!response.ok) {
            console.error('❌ QRISLY API Error:', response.status, data);
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

        // 🔥 Ambil qr_image dari response
        const qrImage = data?.data?.qr_image || data?.qr_image || data?.data?.qr_string;
        const historyId = data?.data?.history_id || data?.history_id;
        const expiredAt = data?.data?.expired_at || data?.expired_at;

        console.log('✅ QRIS generated successfully');
        console.log('📌 history_id:', historyId);
        console.log('📌 qr_image ada?', !!qrImage);

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
        console.error('❌ Stack:', error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
