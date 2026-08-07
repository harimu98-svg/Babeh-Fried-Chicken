// netlify/functions/rajaongkir.js - VERSI DENGAN ENDPOINT YANG BENAR

exports.handler = async function(event, context) {
    // CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    const API_KEY = process.env.RAJA_ONGKIR_API_KEY;
    const BASE_URL = 'https://rajaongkir.komerce.id/api/v1';

    // Validasi API Key
    if (!API_KEY) {
        console.error('RAJA_ONGKIR_API_KEY not configured');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'RAJA_ONGKIR_API_KEY not configured in environment variables' 
            })
        };
    }

    try {
        const { path, queryStringParameters, body, httpMethod } = event;
        
        console.log('📌 Request path:', path);
        console.log('📌 Query params:', queryStringParameters);
        console.log('📌 Method:', httpMethod);

        // ============================================
        // 1. SEARCH DOMESTIC DESTINATION
        // ============================================
        // GET /destination/domestic-destination?search=jakarta&limit=10&offset=0
        if (path.includes('/search') && httpMethod === 'GET') {
            const search = queryStringParameters?.q || queryStringParameters?.search || '';
            const limit = queryStringParameters?.limit || 10;
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
            
            console.log(`🔄 Searching domestic destination: ${search}`);
            
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
            console.log(`✅ Search results: ${data.data?.length || 0} results`);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(data)
            };
        }

        // ============================================
        // 2. GET PROVINCES (Untuk Dropdown)
        // ============================================
        // GET /destination/domestic-destination?search=&limit=100
        // Ini sebenarnya bisa pakai search dengan empty query
        if (path.includes('/provinces') && httpMethod === 'GET') {
            console.log('🔄 Fetching all provinces...');
            
            // Ambil semua provinsi dengan limit besar
            const response = await fetch(
                `${BASE_URL}/destination/domestic-destination?limit=100&offset=0`,
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
            
            // Extract unique provinces from results
            const provinces = [];
            const provinceMap = new Map();
            
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach(item => {
                    if (!provinceMap.has(item.province_id)) {
                        provinceMap.set(item.province_id, {
                            province_id: item.province_id,
                            province: item.province
                        });
                        provinces.push({
                            province_id: item.province_id,
                            province: item.province
                        });
                    }
                });
            }
            
            console.log(`✅ ${provinces.length} provinces found`);
            
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
        // 3. GET CITIES BY PROVINCE (Untuk Dropdown)
        // ============================================
        // GET /destination/domestic-destination?search=&province_id=1&limit=100
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
            
            // Filter by province_id
            const response = await fetch(
                `${BASE_URL}/destination/domestic-destination?limit=500&offset=0`,
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
            
            // Filter cities by province_id
            const cities = [];
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach(item => {
                    if (item.province_id == provinceId) {
                        cities.push({
                            city_id: item.city_id,
                            city_name: item.city_name,
                            type: item.type,
                            province_id: item.province_id,
                            province: item.province,
                            subdistrict_id: item.subdistrict_id,
                            subdistrict_name: item.subdistrict_name
                        });
                    }
                });
            }
            
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
        // 4. GET SUBDISTRICTS BY CITY (Untuk Dropdown)
        // ============================================
        // GET /destination/domestic-destination?search=&city_id=1&limit=100
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
            
            // Filter by city_id
            const response = await fetch(
                `${BASE_URL}/destination/domestic-destination?limit=500&offset=0`,
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
        // 5. CALCULATE DOMESTIC SHIPPING COST
        // ============================================
        // POST /calculate/domestic-cost
        if (path.includes('/cost') && httpMethod === 'POST') {
            const data = JSON.parse(body);
            
            console.log(`🔄 Calculating domestic shipping cost...`);
            console.log('📌 Origin:', data.origin);
            console.log('📌 Destination:', data.destination);
            console.log('📌 Weight:', data.weight);
            console.log('📌 Courier:', data.courier);
            
            // Validasi input
            if (!data.origin || !data.destination || !data.weight || !data.courier) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Missing required fields: origin, destination, weight, courier' 
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
                console.error('❌ Error response:', errorText);
                
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
            console.log('✅ Shipping cost calculated successfully');
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        }

        // ============================================
        // 6. TRACKING AWB (Waybill)
        // ============================================
        // POST /track/waybill
        if (path.includes('/waybill') && httpMethod === 'POST') {
            const data = JSON.parse(body);
            
            console.log(`🔄 Tracking AWB: ${data.waybill}`);
            
            if (!data.waybill || !data.courier) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Missing required fields: waybill, courier' 
                    })
                };
            }
            
            const response = await fetch(`${BASE_URL}/track/waybill`, {
                method: 'POST',
                headers: {
                    'key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    waybill: data.waybill,
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
            console.log('✅ Waybill tracked successfully');
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result)
            };
        }

        // ============================================
        // 7. SEARCH INTERNATIONAL DESTINATION
        // ============================================
        // GET /destination/international-destination?search=singapore
        if (path.includes('/international') && httpMethod === 'GET') {
            const search = queryStringParameters?.q || queryStringParameters?.search || '';
            
            console.log(`🔄 Searching international destination: ${search}`);
            
            const response = await fetch(
                `${BASE_URL}/destination/international-destination?search=${encodeURIComponent(search)}`,
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
            console.log(`✅ International search results: ${data.data?.length || 0}`);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(data)
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
        console.error('❌ Error stack:', error.stack);
        
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
