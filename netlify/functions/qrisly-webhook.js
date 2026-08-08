// netlify/functions/qrisly-webhook.js
// PAKAI SERVICE ROLE KEY

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
        // 🔥 AMBIL DARI ENVIRONMENT VARIABLES
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // 🔥 CEK APAKAH SERVICE ROLE KEY ADA
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('❌ Supabase credentials not configured');
            console.error('📌 SUPABASE_URL exists:', !!supabaseUrl);
            console.error('📌 SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey);
            
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Supabase credentials not configured. Please add SUPABASE_SERVICE_ROLE_KEY.',
                    solution: 'Add SUPABASE_SERVICE_ROLE_KEY to Netlify Environment Variables'
                })
            };
        }

        console.log('📦 Webhook received!');
        console.log('📌 Body:', event.body);

        let payload;
        try {
            payload = JSON.parse(event.body);
        } catch (e) {
            console.error('❌ Invalid JSON:', event.body);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid JSON' })
            };
        }

        const eventType = payload.event || payload.event_type || payload.status;
        const data = payload.data || payload;

        console.log('📌 Event type:', eventType);

        // 🔥 UPDATE ORDER PAKAI SERVICE ROLE KEY
        if (eventType === 'payment.success' || 
            eventType === 'paid' || 
            data.payment_status === 'paid') {

            const historyId = data.history_id || data.transaction_id || data.id;

            if (!historyId) {
                console.error('❌ No history_id found');
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'No history_id found' })
                };
            }

            console.log(`🔄 Updating order with history_id: ${historyId}`);

            // 🔥 UPDATE DENGAN SERVICE ROLE KEY (BYPASS RLS)
            const response = await fetch(
                `${supabaseUrl}/rest/v1/order_fried_chicken?qrisly_history_id=eq.${historyId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        payment_status: 'Pembayaran Berhasil',
                        qrisly_status: 'paid',
                        payment_verified_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                }
            );

            if (response.ok) {
                console.log(`✅ Order updated successfully!`);
            } else {
                const errorText = await response.text();
                console.error('❌ Update failed:', errorText);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Failed to update order',
                        details: errorText
                    })
                };
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: 'success' })
        };
    } catch (error) {
        console.error('❌ Webhook error:', error);
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
