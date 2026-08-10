// netlify/functions/qrisly-generate.js
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
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'QRISLY_API_KEY not configured' })
            };
        }

        const BASE_URL = 'https://api.collaborator.komerce.id/user';
        const GENERATE_ENDPOINT = `${BASE_URL}/api/v1/qrisly/generate-qris`;

        const { amount, qris_id, order_number } = JSON.parse(event.body);

        console.log(`🔄 Generating QRIS for order: ${order_number}`);
        console.log(`📌 Amount: ${amount}`);
        console.log(`📌 QRIS ID: ${qris_id || 129}`);

        const response = await fetch(GENERATE_ENDPOINT, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                qris_id: qris_id || 129,
                amount: amount,
                output_type: 'image',
                unique_amount: true
            })
        });

        const responseText = await response.text();
        console.log(`📥 Response (${response.status}):`, responseText.substring(0, 200));

        if (!response.ok) {
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: 'QRISLY API error',
                    status: response.status,
                    details: responseText
                })
            };
        }

        const data = JSON.parse(responseText);
        const qrImage = data?.data?.qris_string || data?.data?.qr_image;
        const historyId = data?.data?.history_id;
        const expiredAt = data?.data?.expiry_time;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                history_id: historyId,
                qr_image: qrImage,
                expired_at: expiredAt,
                environment: 'production',
                data: data.data || data
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
