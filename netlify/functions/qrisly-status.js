// netlify/functions/qrisly-status.js
exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
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

        const BASE_URL = 'https://api.collaborator.komerce.id/user';
        const historyId = event.queryStringParameters?.history_id;

        if (!historyId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'history_id required' })
            };
        }

        const response = await fetch(`${BASE_URL}/qris/status/${historyId}`, {
            method: 'GET',
            headers: { 'X-API-Key': API_KEY }
        });

        const data = await response.json();
        
        return {
            statusCode: response.status,
            headers,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
