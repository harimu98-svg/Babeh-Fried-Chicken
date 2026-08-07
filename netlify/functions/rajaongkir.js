// netlify/functions/rajaongkir.js - VERSI DENGAN SEARCH-BASED APPROACH

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
        const { path, queryStringParameters, body, httpMethod } = event;
        
        console.log('📌 Request path:', path);
        console.log('📌 Query params:', queryStringParameters);

        // ============================================
        // 1. SEARCH DOMESTIC DESTINATION (UNIVERSAL)
        // ============================================
        // GET /search?q=jakarta&limit=100
        if (path.includes('/search') && httpMethod === 'GET') {
            const search = queryStringParameters?.q || queryStringParameters?.search || '';
            const limit = queryStringParameters?.limit || 100;
            const offset = queryStringParameters?.offset || 0;
            
            // Jika search kosong, ambil semua data dengan limit besar
            const searchQuery = search || 'a'; // 'a' sebagai minimal search
            
            console.log(`🔄 Searching: "${searchQuery}" with limit ${limit}`);
            
            const response = await fetch(
                `${BASE_URL}/destination/domestic-destination?search=${encodeURIComponent(searchQuery)}&limit=${limit}&offset=${offset}`,
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
        // 2. GET PROVINCES (DARI SEARCH RESULTS)
        // ============================================
        if (path.includes('/provinces') && httpMethod === 'GET') {
            console.log('🔄 Fetching provinces from search...');
            
            // Ambil semua data dengan search 'a'
            const response = await fetch(
                `${BASE_URL}/destination/domestic-destination?search=a&limit=500&offset=0`,
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
            
            // Extract unique provinces
            const provinceMap = new Map();
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach(item => {
                    if (!provinceMap.has(item.province_id)) {
                        provinceMap.set(item.province_id, {
                            province_id: item.province_id,
                            province: item.province
                        });
                    }
                });
            }
            
            const provinces = Array.from(provinceMap.values());
            console.log(`✅ ${provinces.length} unique provinces found`);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    rajaongkir: {
                        status: { code: 200, description: 'OK' },
                        results: provinces
                    }
                })
            };
        }

        // ============================================
        // 3. GET CITIES BY PROVINCE
        // ============================================
        if (path.includes('/cities') && httpMethod === 'GET') {
            const provinceId = queryStringParameters?.province_id || queryStringParameters?.province;
            
            if (!provinceId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Province ID is required' 
                    })
                };
            }
            
            console.log(`🔄 Fetching cities for province: ${provinceId}`);
            
            // Ambil semua data lalu filter
            const response = await fetch(
                `${BASE_URL}/destination/domestic-destination?search=a&limit=500&offset=0`,
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
            
            // Filter dan extract unique cities
            const cityMap = new Map();
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach(item => {
                    if (item.province_id == provinceId && !cityMap.has(item.city_id)) {
                        cityMap.set(item.city_id, {
                            city_id: item.city_id,
                            city_name: item.city_name,
                            type: item.type,
                            province_id: item.province_id,
                            province: item.province
                        });
                    }
                });
            }
            
            const cities = Array.from(cityMap.values());
            console.log(`✅ ${cities.length} cities found for province ${provinceId}`);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    rajaongkir: {
                        status: { code: 200, description: 'OK' },
                        results: cities
                    }
                })
            };
        }

        // ============================================
        // 4. GET SUBDISTRICTS BY CITY
        // ============================================
        if (path.includes('/subdistricts') && httpMethod === 'GET') {
            const cityId = queryStringParameters?.city_id || queryStringParameters?.city;
            
            if (!cityId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'City ID is required' 
                    })
                };
            }
            
            console.log(`🔄 Fetching subdistricts for city: ${cityId}`);
            
            // Ambil semua data lalu filter
            const response = await fetch(
                `${BASE_URL}/destination/domestic-destination?search=a&limit=500&offset=0`,
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
            
            // Filter subdistricts by city_id
            const subdistricts = [];
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach(item => {
                    if (item.city_id == cityId) {
                        subdistricts.push({
                            subdistrict_id: item.subdistrict_id,
                            subdistrict_name: item.subdistrict_name,
                            city_id: item.city_id,
                            city_name: item.city_name,
                            province_id: item.province_id,
                            province: item.province
                        });
                    }
                });
            }
            
            console.log(`✅ ${subdistricts.length} subdistricts found for city ${cityId}`);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    rajaongkir: {
                        status: { code: 200, description: 'OK' },
                        results: subdistricts
                    }
                })
            };
        }

        // ============================================
        // 5. CALCULATE DOMESTIC COST
        // ============================================
        if (path.includes('/cost') && httpMethod === 'POST') {
            const data = JSON.parse(body);
            
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
