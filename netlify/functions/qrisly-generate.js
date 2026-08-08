// netlify/functions/qrisly-generate.js
// MENGGUNAKAN SANDBOX ENVIRONMENT

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

        // 🔥 PAKAI SANDBOX ENVIRONMENT
        const IS_SANDBOX = true; // Set ke true untuk sandbox, false untuk production
        const BASE_URL = IS_SANDBOX 
            ? 'https://api-sandbox.collaborator.komerce.id/user'
            : 'https://api.collaborator.komerce.id/user';
        
        const GENERATE_ENDPOINT = `${BASE_URL}/api/v1/qrisly/generate-qris`;
        
        console.log(`📌 Environment: ${IS_SANDBOX ? 'SANDBOX' : 'PRODUCTION'}`);
        console.log('📌 Endpoint:', GENERATE_ENDPOINT);

        let requestData;
        try {
            requestData = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid JSON body' })
            };
        }

        const { amount, qris_id, order_number } = requestData;

        console.log('🔄 Generating QRIS...');
        console.log('📌 Amount:', amount);
        console.log('📌 QRIS ID:', qris_id || 761);

        const requestBody = {
            qris_id: qris_id || 761,
            amount: amount,
            output_type: 'image',
            unique_amount: true
        };

        const response = await fetch(GENERATE_ENDPOINT, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        console.log('📥 Response status:', response.status);
        console.log('📥 Raw response:', responseText);

        if (response.status === 403 || response.status === 401) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch (e) {
                errorData = { raw: responseText };
            }
            
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: 'QRISLY API Access Denied',
                    message: errorData?.meta?.message || 'Please check your API key and permissions',
                    solution: 'Make sure you are using the correct environment (Sandbox/Production)',
                    details: errorData,
                    environment: IS_SANDBOX ? 'sandbox' : 'production'
                })
            };
        }

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

        // 🔥 AMBIL QRIS STRING (untuk sandbox, biasanya berupa string)
        const qrImage = data?.data?.qris_string || data?.data?.qr_image;
        const historyId = data?.data?.history_id;
        const expiredAt = data?.data?.expiry_time;

        console.log('✅ QRIS generated successfully!');
        console.log('📌 history_id:', historyId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                history_id: historyId,
                qr_image: qrImage,
                expired_at: expiredAt,
                environment: IS_SANDBOX ? 'sandbox' : 'production',
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
