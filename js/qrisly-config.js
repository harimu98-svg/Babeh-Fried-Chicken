// js/qrisly-config.js
const QRISLY_CONFIG = {
    // Base URL untuk Netlify Functions
    apiBaseUrl: '/.netlify/functions/qrisly',
    
    // 🔥 QRIS ID dari dashboard
    qrisId: 761,
    
    // Konfigurasi
    outputType: 'image',
    uniqueAmount: true,
    
    // Webhook URL
    webhookUrl: 'https://babehfriedchicken.netlify.app/.netlify/functions/qrisly-webhook'
};

window.QRISLY_CONFIG = QRISLY_CONFIG;
console.log('✅ QRISLY Config loaded with qrisId:', QRISLY_CONFIG.qrisId);
