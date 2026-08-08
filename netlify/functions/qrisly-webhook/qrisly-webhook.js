// netlify/functions/qrisly-webhook/qrisly-webhook.js
const { createClient } = require('@supabase/supabase-js');

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
        // 🔥 Ambil dari Environment Variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('❌ Supabase credentials not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Supabase credentials not configured',
                    supabaseUrl: !!supabaseUrl,
                    supabaseServiceKey: !!supabaseServiceKey
                })
            };
        }

        // 🔥 Inisialisasi Supabase dengan Service Role Key
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

        console.log('📦 Parsed payload:', JSON.stringify(payload, null, 2));

        // 🔥 CEK EVENT TYPE
        const eventType = payload.event || payload.event_type || payload.status;
        const data = payload.data || payload;

        console.log('📌 Event type:', eventType);

        // 🔥 UPDATE ORDER
        if (eventType === 'payment.success' || 
            eventType === 'paid' || 
            eventType === 'success' ||
            data.payment_status === 'paid' ||
            data.status === 'paid') {

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

            // 🔥 UPDATE SUPABASE
            const { data: orderData, error: updateError } = await supabase
                .from('order_fried_chicken')
                .update({
                    payment_status: 'Pembayaran Berhasil',
                    qrisly_status: 'paid',
                    payment_verified_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('qrisly_history_id', historyId)
                .select();

            if (updateError) {
                console.error('❌ Supabase update error:', updateError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Failed to update order',
                        details: updateError.message
                    })
                };
            }

            if (orderData && orderData.length > 0) {
                console.log('✅ Order updated successfully:', orderData[0]);
            } else {
                console.warn(`⚠️ No order found with history_id: ${historyId}`);
            }
        } else if (eventType === 'payment.expired' || eventType === 'expired') {
            const historyId = data.history_id || data.transaction_id || data.id;

            if (historyId) {
                await supabase
                    .from('order_fried_chicken')
                    .update({
                        payment_status: 'Pembayaran Kadaluarsa',
                        qrisly_status: 'expired',
                        updated_at: new Date().toISOString()
                    })
                    .eq('qrisly_history_id', historyId);

                console.log(`✅ Order expired: ${historyId}`);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                status: 'success', 
                received: true 
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
