document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chat-form');
    const chatMessages = document.getElementById('chat-messages');
    
    if (chatForm) {
        chatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const messageInput = document.getElementById('chat-message');
            const message = messageInput.value.trim();
            
            if (message) {
                sendMessageToAdmin(message);
                messageInput.value = '';
            }
        });
    }

    function sendMessageToAdmin(message) {
        const waUrl = `https://wa.me/${window.WA_ADMIN}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    }

    // Quick message templates
    document.querySelectorAll('.quick-message').forEach(btn => {
        btn.addEventListener('click', function() {
            const message = this.dataset.message;
            document.getElementById('chat-message').value = message;
        });
    });
});

// Payment verification function
window.verifyPayment = async function(orderId) {
    const fileInput = document.getElementById('payment-proof');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Silakan upload bukti transfer terlebih dahulu!', 'error');
        return;
    }

    try {
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `payment_${orderId}_${Date.now()}.${fileExt}`;
        const filePath = `payment-proofs/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await window.supabaseClient
            .storage
            .from('order-files')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = window.supabaseClient
            .storage
            .from('order-files')
            .getPublicUrl(filePath);

        // Update order with payment proof
        const { error: updateError } = await window.supabaseClient
            .from('order_fried_chicken')
            .update({
                payment_proof_url: urlData.publicUrl,
                payment_status: 'Pembayaran Berhasil',
                payment_verified_at: new Date().toISOString()
            })
            .eq('order_number', orderId);

        if (updateError) throw updateError;

        // Send WA notification
        sendPaymentVerifiedWA(orderId);

        showNotification('Pembayaran berhasil diverifikasi!', 'success');
        document.getElementById('payment-modal').style.display = 'none';
    } catch (error) {
        console.error('Error verifying payment:', error);
        showNotification('Gagal mengupload bukti pembayaran. Silakan coba lagi!', 'error');
    }
};

function sendPaymentVerifiedWA(orderId) {
    const message = `*Konfirmasi Pembayaran Berhasil!*%0A%0A` +
        `Pesanan dengan nomor: ${orderId}%0A` +
        `Status: *Pembayaran Berhasil*%0A%0A` +
        `Pesanan akan segera diproses. Terima kasih!`;

    const waUrl = `https://wa.me/${window.WA_ADMIN}?text=${message}`;
    window.open(waUrl, '_blank');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}
