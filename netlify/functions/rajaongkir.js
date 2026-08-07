// netlify/functions/rajaongkir.js
const axios = require('axios');

exports.handler = async function(event, context) {
    // CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight (OPTIONS)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Ambil API Key dari environment variable
    const API_KEY = process.env.RAJA_ONGKIR_API_KEY;
    const BASE_URL = 'https://rajaongkir.komerce.id/api/v1';

    try {
        const { path, queryStringParameters, body } = event;

        // ===== GET PROVINCES =====
        if (path.includes('/province') && event.httpMethod === 'GET') {
            const response = await axios.get(`${BASE_URL}/destination/province`, {
                headers: { 'key': API_KEY }
            });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        // ===== GET CITIES =====
        if (path.includes('/city') && event.httpMethod === 'GET') {
            const province = queryStringParameters?.province || '';
            const response = await axios.get(`${BASE_URL}/destination/city?province=${province}`, {
                headers: { 'key': API_KEY }
            });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        // ===== GET DISTRICTS =====
        if (path.includes('/district') && event.httpMethod === 'GET') {
            const city = queryStringParameters?.city || '';
            const response = await axios.get(`${BASE_URL}/destination/district?city=${city}`, {
                headers: { 'key': API_KEY }
            });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        // ===== CALCULATE SHIPPING COST =====
        if (path.includes('/cost') && event.httpMethod === 'POST') {
            const data = JSON.parse(body);
            const response = await axios.post(`${BASE_URL}/cost`, {
                origin: data.origin,
                destination: data.destination,
                weight: data.weight,
                courier: data.courier
            }, {
                headers: {
                    'key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
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
