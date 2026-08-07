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
            body: JSON.stringify({ 
                error: 'RAJA_ONGKIR_API_KEY not configured' 
            })
        };
    }

    try {
        const { path, queryStringParameters, body } = event;

        // ===== GET PROVINCES =====
        if (path.includes('/province') && event.httpMethod === 'GET') {
            const response = await fetch(`${BASE_URL}/destination/province`, {
                headers: { 'key': API_KEY }
            });
            const result = await response.json();
            
            // ✅ KONSISTEN: kirim dengan format yang sama
            // Jika response dari RajaOngkir sudah punya format sendiri
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        }

        // ===== GET CITIES =====
        if (path.includes('/city') && event.httpMethod === 'GET') {
            const province = queryStringParameters?.province || '';
            const response = await fetch(`${BASE_URL}/destination/city?province=${province}`, {
                headers: { 'key': API_KEY }
            });
            const result = await response.json();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        }

        // ===== GET DISTRICTS =====
        if (path.includes('/district') && event.httpMethod === 'GET') {
            const city = queryStringParameters?.city || '';
            const response = await fetch(`${BASE_URL}/destination/district?city=${city}`, {
                headers: { 'key': API_KEY }
            });
            const result = await response.json();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        }

        // ===== CALCULATE SHIPPING COST =====
        if (path.includes('/cost') && event.httpMethod === 'POST') {
            const data = JSON.parse(body);
            const response = await fetch(`${BASE_URL}/cost`, {
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
            const result = await response.json();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint not found' })
        };

    } catch (error) {
        console.error('Error:', error);
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
