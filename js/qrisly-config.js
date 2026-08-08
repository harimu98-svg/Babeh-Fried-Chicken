// js/qrisly-config.js
// ⚠️ API Key TIDAK ADA DI SINI! Disimpan di Netlify Environment Variables.

const QRISLY_CONFIG = {
    // 🔥 JANGAN taruh API Key di sini!
    // apiKey: 'YOUR_QRISLY_API_KEY', ← HAPUS!
    
    // Base URL untuk Netlify Functions (bukan API QRISLY langsung)
    apiBaseUrl: '/.netlify/functions/qrisly',
    
    // QRIS ID dari upload (boleh di frontend karena bukan rahasia)
    qrisId: 761, // Ganti setelah upload QRIS berhasil
    
    // Konfigurasi lainnya
    outputType: 'image',
    uniqueAmount: true,
    
    // Webhook URL (untuk referensi, bukan untuk dipanggil dari frontend)
    webhookUrl: 'https://babehfriedchicken.netlify.app/.netlify/functions/qrisly-webhook'
};

// Simpan ke global
window.QRISLY_CONFIG = QRISLY_CONFIG;

console.log('✅ QRISLY Config loaded (without API Key)');
