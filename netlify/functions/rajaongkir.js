// netlify/functions/rajaongkir.js
exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const API_KEY = process.env.RAJA_ONGKIR_API_KEY;
    const BASE_URL = 'https://rajaongkir.komerce.id/api/v1';

    if (!API_KEY) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'RAJA_ONGKIR_API_KEY not configured' })
        };
    }

    try {
        const { path, queryStringParameters, httpMethod, body } = event;
        
        console.log('📌 Path:', path);
        console.log('📌 Method:', httpMethod);

        // ============================================
        // SEARCH ENDPOINT
        // ============================================
        if (path.includes('/search') && httpMethod === 'GET') {
            const search = queryStringParameters?.q || queryStringParameters?.search || '';
            const limit = queryStringParameters?.limit || 20;
            const offset = queryStringParameters?.offset || 0;
            
            if (!search || search.length < 3) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Search query minimal 3 karakter' 
                    })
                };
            }
            
            console.log(`🔍 Searching: "${search}"`);
            
            const response = await fetch(
                `${BASE_URL}/destination/domestic-destination?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`,
                { headers: { 'key': API_KEY } }
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                return {
                    statusCode: response.status,
                    headers,
                    body: JSON.stringify({ 
                        error: 'RajaOngkir API error',
                        status: response.status,
                        details: errorText
                    })
                };
            }
            
            const data = await response.json();
            console.log(`✅ Search results: ${data.data?.length || 0} items`);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(data)
            };
        }

        // ============================================
        // COST ENDPOINT
        // ============================================
        if (path.includes('/cost') && httpMethod === 'POST') {
            let data;
            const contentType = event.headers['content-type'] || '';
            
            if (contentType.includes('application/x-www-form-urlencoded')) {
                const params = new URLSearchParams(body);
                data = {
                    origin: params.get('origin'),
                    destination: params.get('destination'),
                    weight: params.get('weight'),
                    courier: params.get('courier'),
                    price: params.get('price') || 'lowest'
                };
            } else {
                data = JSON.parse(body);
            }
            
            console.log('🔄 Calculating cost...');
            console.log('Origin:', data.origin);
            console.log('Destination:', data.destination);
            console.log('Weight:', data.weight);
            console.log('Courier:', data.courier);
            
            if (!data.origin || !data.destination || !data.weight || !data.courier) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Missing required fields',
                        received: data
                    })
                };
            }
            
            const formBody = new URLSearchParams({
                origin: data.origin,
                destination: data.destination,
                weight: data.weight,
                courier: data.courier,
                price: data.price || 'lowest'
            });
            
            console.log('📤 Sending to RajaOngkir:', formBody.toString());
            
            const response = await fetch(`${BASE_URL}/calculate/domestic-cost`, {
                method: 'POST',
                headers: {
                    'key': API_KEY,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formBody.toString()
            });
            
            const responseText = await response.text();
            console.log('📥 Raw Response:', responseText);
            
            if (!response.ok) {
                return {
                    statusCode: response.status,
                    headers,
                    body: JSON.stringify({ 
                        error: 'RajaOngkir API error',
                        status: response.status,
                        details: responseText
                    })
                };
            }
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Invalid JSON response',
                        raw: responseText
                    })
                };
            }
            
            console.log('✅ Cost calculated');
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
                error: 'Endpoint not found',
                path: path 
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
