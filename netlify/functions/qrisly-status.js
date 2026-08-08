// netlify/functions/qrisly-status.js
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

        console.log(`🔄 Checking status for history_id: ${historyId}`);

        // 🔥 Coba sandbox dulu
        const BASE_URL = 'https://api-sandbox.collaborator.komerce.id/user';
        const statusEndpoint = `${BASE_URL}/api/v1/qrisly/status/${historyId}`;

        const response = await fetch(statusEndpoint, {
            method: 'GET',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const responseText = await response.text();
        console.log(`📥 Response (${response.status}):`, responseText.substring(0, 200));

        if (!response.ok) {
            // 🔥 Jika sandbox gagal, coba production
            console.log('🔄 Sandbox failed, trying production...');
            const prodEndpoint = `https://api.collaborator.komerce.id/user/api/v1/qrisly/status/${historyId}`;
            
            const prodResponse = await fetch(prodEndpoint, {
                method: 'GET',
                headers: {
                    'X-API-Key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            const prodText = await prodResponse.text();

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
                        data: data.data || data
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
            data = { raw: responseText };
        }

        console.log('✅ Status check successful');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                environment: 'sandbox',
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
