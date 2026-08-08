// netlify/functions/qrisly-webhook.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Gunakan Service Role Key
);

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
        const payload = JSON.parse(event.body);
        console.log('📦 Webhook received:', payload);

        const { event: eventType, data } = payload;
        
        // 🔥 Update order berdasarkan event
        if (eventType === 'payment.success') {
            const { transaction_id, amount, customer } = data;
            
            // Cari order berdasarkan history_id atau transaction_id
            const { data: orderData, error: findError } = await supabase
                .from('order_fried_chicken')
                .update({
                    payment_status: 'Pembayaran Berhasil',
                    qrisly_status: 'paid',
                    payment_verified_at: new Date().toISOString()
                })
                .eq('qrisly_history_id', transaction_id)
                .select();

            if (findError) throw findError;

            if (orderData && orderData.length > 0) {
                const order = orderData[0];
                
                // Kirim WA notifikasi ke admin
                await sendWANotification(order);
                
                // Kirim email ke customer (opsional)
                // await sendEmailNotification(order);
            }
        } else if (eventType === 'payment.expired') {
            // Update status expired
            await supabase
                .from('order_fried_chicken')
                .update({
                    payment_status: 'Pembayaran Kadaluarsa',
                    qrisly_status: 'expired'
                })
                .eq('qrisly_history_id', data.transaction_id);
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
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function sendWANotification(order) {
    // Kirim WA ke admin
    const message = `*Pembayaran Berhasil!*%0A%0A` +
        `Pesanan: ${order.order_number}%0A` +
        `Customer: ${order.customer_name}%0A` +
        `Total: Rp ${order.total}%0A%0A` +
        `Status: ✅ Pembayaran Berhasil`;
    
    const waUrl = `https://wa.me/6282121266056?text=${encodeURIComponent(message)}`;
    // Bisa pakai fetch atau redirect
    console.log('📤 WA URL:', waUrl);
}
