// netlify/functions/rajaongkir.js
// Menggunakan Step-by-Step Method dengan caching data

let cachedLocationData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 jam

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
        const { path, queryStringParameters, httpMethod } = event;
        
        // ============================================
        // 1. GET PROVINCES (dari data ter-cache)
        // ============================================
        if (path.includes('/provinces') && httpMethod === 'GET') {
            const data = await getLocationData(API_KEY, BASE_URL);
            
            // Ekstrak provinsi unik
            const provinceMap = new Map();
            data.data.forEach(item => {
                if (!provinceMap.has(item.province_id)) {
                    provinceMap.set(item.province_id, {
                        province_id: item.province_id,
                        province: item.province
                    });
                }
            });
            
            const provinces = Array.from(provinceMap.values());
            console.log(`✅ ${provinces.length} provinces loaded`);
            
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
        // 2. GET CITIES (dari data ter-cache)
        // ============================================
        if (path.includes('/cities') && httpMethod === 'GET') {
            const provinceId = queryStringParameters?.province_id;
            
            if (!provinceId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Province ID is required' })
                };
            }
            
            const data = await getLocationData(API_KEY, BASE_URL);
            
            // Filter dan ekstrak kota unik
            const cityMap = new Map();
            data.data.forEach(item => {
                if (item.province_id == provinceId && !cityMap.has(item.city_id)) {
                    cityMap.set(item.city_id, {
                        city_id: item.city_id,
                        city_name: item.city_name,
                        type: item.type,
                        province_id: item.province_id
                    });
                }
            });
            
            const cities = Array.from(cityMap.values());
            console.log(`✅ ${cities.length} cities loaded for province ${provinceId}`);
            
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
        // 3. GET SUBDISTRICTS (dari data ter-cache)
        // ============================================
        if (path.includes('/subdistricts') && httpMethod === 'GET') {
            const cityId = queryStringParameters?.city_id;
            
            if (!cityId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'City ID is required' })
                };
            }
            
            const data = await getLocationData(API_KEY, BASE_URL);
            
            // Filter subdistricts
            const subdistricts = [];
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
            
            console.log(`✅ ${subdistricts.length} subdistricts loaded for city ${cityId}`);
            
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
        // 4. CALCULATE DOMESTIC COST
        // ============================================
        if (path.includes('/cost') && httpMethod === 'POST') {
            const data = JSON.parse(event.body);
            
            console.log(`🔄 Calculating domestic cost...`);
            console.log('📌 Origin:', data.origin);
            console.log('📌 Destination:', data.destination);
            console.log('📌 Weight:', data.weight);
            console.log('📌 Courier:', data.courier);
            
            // Validasi: pastikan origin dan destination adalah subdistrict_id
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
            body: JSON.stringify({ error: 'Endpoint not found', path })
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

// ============================================
// FUNGSI UNTUK MENDAPATKAN DATA LOKASI
// ============================================
async function getLocationData(API_KEY, BASE_URL) {
    // Cek cache
    if (cachedLocationData && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
        console.log('✅ Using cached location data');
        return cachedLocationData;
    }
    
    console.log('🔄 Fetching fresh location data...');
    
    try {
        // Ambil semua data dengan search parameter kosong
        const response = await fetch(
            `${BASE_URL}/destination/domestic-destination?search=&limit=999&offset=0`,
            { headers: { 'key': API_KEY } }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.meta && data.meta.code === 200 && data.data) {
            cachedLocationData = data;
            cacheTimestamp = Date.now();
            console.log(`✅ Location data cached: ${data.data.length} items`);
            return data;
        } else {
            throw new Error('Invalid response format from RajaOngkir');
        }
    } catch (error) {
        console.error('❌ Error fetching location data:', error);
        
        // Jika cache ada, gunakan meskipun expired
        if (cachedLocationData) {
            console.log('⚠️ Using expired cache as fallback');
            return cachedLocationData;
        }
        
        throw error;
    }
}
