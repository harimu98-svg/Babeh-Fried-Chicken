// netlify/functions/qrisly-upload.js
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

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
        const BASE_URL = 'https://api.collaborator.komerce.id/user';
        
        // Ambil file dari body (multipart/form-data)
        const formData = new FormData();
        const imageBuffer = Buffer.from(event.body, 'base64');
        formData.append('qris_image', imageBuffer, { filename: 'qris.jpg' });
        formData.append('name', 'Babeh Fried Chicken');

        const response = await fetch(`${BASE_URL}/qris`, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY,
                ...formData.getHeaders()
            },
            body: formData
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
