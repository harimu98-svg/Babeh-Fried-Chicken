// netlify/functions/qrisly-generate.js
// DENGAN BEBERAPA PILIHAN ENDPOINT

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

        // 🔥 DAFTAR ENDPOINT YANG MUNGKIN BENAR
        const endpoints = [
            'https://api.collaborator.komerce.id/qris/generate',
            'https://api.collaborator.komerce.id/v1/qris/generate',
            'https://api.collaborator.komerce.id/user/qris/generate',
            'https://api.rajaongkir.com/qrisly/generate',
            'https://api.rajaongkir.com/v1/qrisly/generate',
            'https://qrisly.rajaongkir.com/api/v1/generate'
        ];

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

        // 🔥 COBA SETIAP ENDPOINT
        let lastError = null;
        
        for (const endpoint of endpoints) {
            console.log(`🔄 Trying endpoint: ${endpoint}`);
            
            try {
                const response = await fetch(endpoint, {
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
                console.log(`📥 Status: ${response.status} for ${endpoint}`);
                console.log(`📥 Response: ${responseText.substring(0, 200)}...`);

                if (response.ok) {
                    // 🔥 ENDPOINT BERHASIL!
                    console.log(`✅ Found working endpoint: ${endpoint}`);
                    
                    let data;
                    try {
                        data = JSON.parse(responseText);
                    } catch (parseError) {
                        continue;
                    }

                    const qrImage = data?.data?.qr_image || data?.qr_image || data?.data?.qr_string;
                    const historyId = data?.data?.history_id || data?.history_id;
                    const expiredAt = data?.data?.expired_at || data?.expired_at;

                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            history_id: historyId,
                            qr_image: qrImage,
                            expired_at: expiredAt,
                            data: data.data || data,
                            endpoint_used: endpoint
                        })
                    };
                }
            } catch (error) {
                console.error(`❌ Error with ${endpoint}:`, error.message);
                lastError = error;
            }
        }

        // 🔥 SEMUA ENDPOINT GAGAL
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'All QRISLY endpoints failed',
                message: lastError?.message || 'Unknown error',
                tried_endpoints: endpoints
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
