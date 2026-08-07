// netlify/functions/rajaongkir.js
// VERSI FINAL - Dengan parameter search yang valid

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
            body: JSON.stringify({ 
                error: 'RAJA_ONGKIR_API_KEY not configured in environment variables' 
            })
        };
    }

    try {
        const { path, queryStringParameters, httpMethod } = event;
        
        console.log('📌 Request path:', path);
        console.log('📌 Query params:', queryStringParameters);

        // ============================================
        // 1. GET PROVINCES (dari data ter-cache)
        // ============================================
        if (path.includes('/provinces') && httpMethod === 'GET') {
            try {
                const data = await getLocationData(API_KEY, BASE_URL);
                
                // Ekstrak provinsi unik
                const provinceMap = new Map();
                if (data.data && Array.isArray(data.data)) {
                    data.data.forEach(item => {
                        if (item.province_id && !provinceMap.has(item.province_id)) {
                            provinceMap.set(item.province_id, {
                                province_id: item.province_id,
                                province: item.province || 'Provinsi'
                            });
                        }
                    });
                }
                
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
            } catch (error) {
                console.error('❌ Error fetching provinces:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Failed to fetch provinces',
                        message: error.message 
                    })
                };
            }
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
            
            try {
                const data = await getLocationData(API_KEY, BASE_URL);
                
                // Filter dan ekstrak kota unik
                const cityMap = new Map();
                if (data.data && Array.isArray(data.data)) {
                    data.data.forEach(item => {
                        if (item.province_id == provinceId && item.city_id && !cityMap.has(item.city_id)) {
                            cityMap.set(item.city_id, {
                                city_id: item.city_id,
                                city_name: item.city_name || 'Kota',
                                type: item.type || 'Kota',
                                province_id: item.province_id
                            });
                        }
                    });
                }
                
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
            } catch (error) {
                console.error('❌ Error fetching cities:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Failed to fetch cities',
                        message: error.message 
                    })
                };
            }
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
            
            try {
                const data = await getLocationData(API_KEY, BASE_URL);
                
                // Filter subdistricts
                const subdistricts = [];
                if (data.data && Array.isArray(data.data)) {
                    data.data.forEach(item => {
                        if (item.city_id == cityId && item.subdistrict_id) {
                            subdistricts.push({
                                subdistrict_id: item.subdistrict_id,
                                subdistrict_name: item.subdistrict_name || 'Kecamatan',
                                city_id: item.city_id,
                                city_name: item.city_name || 'Kota',
                                province_id: item.province_id,
                                province: item.province || 'Provinsi'
                            });
                        }
                    });
                }
                
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
            } catch (error) {
                console.error('❌ Error fetching subdistricts:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Failed to fetch subdistricts',
                        message: error.message 
                    })
                };
            }
        }

        // ============================================
        // 4. DIRECT SEARCH
        // ============================================
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
            
            try {
                const response = await fetch(
                    `${BASE_URL}/destination/domestic-destination?search=${encodeURIComponent(search)}&limit=20`,
                    { headers: { 'key': API_KEY } }
                );
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
                }
                
                const data = await response.json();
                console.log(`✅ Search results: ${data.data?.length || 0} items`);
                
                // Format response agar konsisten
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
            } catch (error) {
                console.error('❌ Search error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Failed to search',
                        message: error.message 
                    })
                };
            }
        }

        // ============================================
        // 5. CALCULATE DOMESTIC COST
        // ============================================
        if (path.includes('/cost') && httpMethod === 'POST') {
            const data = JSON.parse(event.body);
            
            console.log(`🔄 Calculating domestic cost...`);
            console.log('📌 Origin:', data.origin);
            console.log('📌 Destination:', data.destination);
            console.log('📌 Weight:', data.weight);
            console.log('📌 Courier:', data.courier);
            
            // Validasi
            if (!data.origin || !data.destination || !data.weight || !data.courier) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Missing required fields: origin, destination, weight, courier' 
                    })
                };
            }
            
            try {
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
                    throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
                }
                
                const result = await response.json();
                console.log('✅ Cost calculated successfully');
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(result)
                };
            } catch (error) {
                console.error('❌ Cost calculation error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Failed to calculate shipping cost',
                        message: error.message 
                    })
                };
            }
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

// ============================================
// FUNGSI UNTUK MENDAPATKAN DATA LOKASI
// ============================================
async function getLocationData(API_KEY, BASE_URL) {
    // Cek cache
    if (cachedLocationData && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
        console.log('✅ Using cached location data');
        return cachedLocationData;
    }
    
    console.log('🔄 Fetching fresh location data from RajaOngkir...');
    
    try {
        // Gunakan search parameter yang valid (huruf 'a' sebagai minimal search)
        // Atau gunakan 'indonesia' untuk mendapatkan semua data
        const searchTerms = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
                            'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        
        let allData = [];
        const limit = 100;
        
        // Search dengan 'a' (ini biasanya menghasilkan banyak data)
        console.log('🔄 Searching with "a"...');
        const response = await fetch(
            `${BASE_URL}/destination/domestic-destination?search=a&limit=${limit}`,
            { headers: { 'key': API_KEY } }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.meta && data.meta.code === 200 && data.data) {
            allData = data.data;
            console.log(`✅ Retrieved ${allData.length} locations from search "a"`);
            
            // Jika data masih sedikit, tambahkan search dengan huruf lain
            if (allData.length < 100) {
                for (const char of searchTerms.slice(1)) {
                    console.log(`🔄 Searching with "${char}"...`);
                    const response2 = await fetch(
                        `${BASE_URL}/destination/domestic-destination?search=${char}&limit=${limit}`,
                        { headers: { 'key': API_KEY } }
                    );
                    
                    if (response2.ok) {
                        const data2 = await response2.json();
                        if (data2.data && Array.isArray(data2.data)) {
                            allData = allData.concat(data2.data);
                            console.log(`   Added ${data2.data.length} locations from "${char}"`);
                        }
                    }
                }
                
                // Remove duplicates based on subdistrict_id
                const uniqueMap = new Map();
                allData.forEach(item => {
                    if (item.subdistrict_id && !uniqueMap.has(item.subdistrict_id)) {
                        uniqueMap.set(item.subdistrict_id, item);
                    }
                });
                allData = Array.from(uniqueMap.values());
                console.log(`✅ Total unique locations: ${allData.length}`);
            }
        } else {
            throw new Error('Invalid response format from RajaOngkir');
        }
        
        // Cache data
        cachedLocationData = { data: allData };
        cacheTimestamp = Date.now();
        console.log(`✅ Location data cached: ${allData.length} items`);
        
        return cachedLocationData;
        
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
