// netlify/functions/qrisly-webhook.js
// PERBAIKI: Ambil qris_history_id dari payload

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
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('❌ Supabase credentials not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Supabase credentials not configured'
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

        // 🔥 AMBIL HISTORY_ID DARI PAYLOAD
        // Field yang benar: qris_history_id (BUKAN history_id)
        const historyId = data.qris_history_id || data.history_id || data.transaction_id || data.id;

        if (!historyId) {
            console.error('❌ No history_id found in payload');
            console.log('📌 Available fields:', Object.keys(data));
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'No history_id found',
                    available_fields: Object.keys(data)
                })
            };
        }

        console.log(`📌 history_id: ${historyId}`);
        console.log(`📌 Payment status: ${data.status || data.payment_status}`);

        // 🔥 UPDATE ORDER
        if (eventType === 'payment.success' || 
            eventType === 'paid' || 
            data.status === 'success' ||
            data.payment_status === 'paid') {

            console.log(`🔄 Updating order with qrisly_history_id: ${historyId}`);

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
                console.log(`✅ Order with history_id ${historyId} updated successfully!`);
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
        } else if (eventType === 'payment.expired' || data.status === 'expired') {
            console.log(`🔄 Updating order to EXPIRED for history_id: ${historyId}`);

            await fetch(
                `${supabaseUrl}/rest/v1/order_fried_chicken?qrisly_history_id=eq.${historyId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        payment_status: 'Pembayaran Kadaluarsa',
                        qrisly_status: 'expired',
                        updated_at: new Date().toISOString()
                    })
                }
            );
            console.log(`✅ Order expired: ${historyId}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                status: 'success',
                history_id: historyId,
                event: eventType
            })
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
