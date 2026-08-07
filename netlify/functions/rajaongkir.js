// netlify/functions/rajaongkir.js
// VERSI: Direct Search Method (sesuai dokumentasi)

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
            body: JSON.stringify({ 
                error: 'RAJA_ONGKIR_API_KEY not configured' 
            })
        };
    }

    try {
        const { path, queryStringParameters, httpMethod } = event;
        
        console.log('📌 Request path:', path);
        console.log('📌 Query params:', queryStringParameters);

        // ============================================
        // 1. SEARCH DOMESTIC DESTINATION
        // ============================================
        // GET /search?q=jakarta
        if (path.includes('/search') && httpMethod === 'GET') {
            const search = queryStringParameters?.q || queryStringParameters?.search || '';
            
            if (!search || search.length < 3) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Search query minimal 3 karakter' 
                    })
                };
            }
            
            console.log(`🔄 Searching: "${search}"`);
            
            const response = await fetch(
                `${BASE_URL}/destination/domestic-destination?search=${encodeURIComponent(search)}&limit=20`,
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
            
            // Format response
            const results = data.data || [];
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    rajaongkir: {
                        status: { code: 200, description: 'OK' },
                        results: results
                    }
                })
            };
        }

        // ============================================
        // 2. CALCULATE DOMESTIC COST
        // ============================================
        if (path.includes('/cost') && httpMethod === 'POST') {
            const data = JSON.parse(event.body);
            
            console.log(`🔄 Calculating domestic cost...`);
            console.log('📌 Origin:', data.origin);
            console.log('📌 Destination:', data.destination);
            console.log('📌 Weight:', data.weight);
            console.log('📌 Courier:', data.courier);
            
            if (!data.origin || !data.destination || !data.weight || !data.courier) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Missing required fields' 
                    })
                };
            }
            
            const response = await fetch(`${BASE_URL}/calculate/domestic-cost`, {
                method: 'POST',
                headers: {
                    'key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    origin: data.origin,
                    destination: data.destination,
                    weight: data.weight,
                    courier: data.courier
                })
            });
            
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
            
            const result = await response.json();
            console.log('✅ Cost calculated successfully');
            
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
        console.error('❌ Function error:', error);
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
