// netlify/functions/qrisly-status.js
// DENGAN ENDPOINT YANG BENAR

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
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

        const historyId = event.queryStringParameters?.history_id;
        if (!historyId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'history_id parameter is required' })
            };
        }

        console.log(`🔄 Checking payment status for history_id: ${historyId}`);

        // 🔥 ENDPOINT YANG BENAR: /api/v1/qrisly/payment-status/{history_id}
        const BASE_URL = 'https://api-sandbox.collaborator.komerce.id/user';
        const statusEndpoint = `${BASE_URL}/api/v1/qrisly/payment-status/${historyId}`;

        console.log(`📌 Endpoint: ${statusEndpoint}`);

        const response = await fetch(statusEndpoint, {
            method: 'GET',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const responseText = await response.text();
        console.log(`📥 Response (${response.status}):`, responseText.substring(0, 300));

        if (!response.ok) {
            // 🔥 Jika sandbox gagal, coba production
            console.log('🔄 Sandbox failed, trying production...');
            const prodEndpoint = `https://api.collaborator.komerce.id/user/api/v1/qrisly/payment-status/${historyId}`;
            
            const prodResponse = await fetch(prodEndpoint, {
                method: 'GET',
                headers: {
                    'X-API-Key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            const prodText = await prodResponse.text();
            console.log(`📥 Production response (${prodResponse.status}):`, prodText.substring(0, 300));

            if (prodResponse.ok) {
                let data;
                try {
                    data = JSON.parse(prodText);
                } catch (e) {
                    data = { raw: prodText };
                }
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        environment: 'production',
                        data: data.data || data,
                        meta: data.meta || null
                    })
                };
            }

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

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ JSON Parse Error:', e);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid JSON response',
                    raw: responseText
                })
            };
        }

        console.log('✅ Status check successful');
        console.log(`📌 Payment status: ${data.data?.payment_status || 'unknown'}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                environment: 'sandbox',
                meta: data.meta || null,
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
