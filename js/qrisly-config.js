// js/qrisly-config.js
const QRISLY_CONFIG = {
    // Base URL untuk Netlify Functions
    apiBaseUrl: '/.netlify/functions/qrisly',
    
    // 🔥 QRIS ID dari dashboard
    qrisId: 761,
    
    // 🔥 Environment: 'sandbox' atau 'production'
    environment: 'sandbox',
    
    // Konfigurasi
    outputType: 'image',
    uniqueAmount: true,
    
    // Webhook URL
    webhookUrl: 'https://babehfriedchicken.netlify.app/.netlify/functions/qrisly-webhook'
};

window.QRISLY_CONFIG = QRISLY_CONFIG;
console.log('✅ QRISLY Config loaded');
console.log(`📌 Environment: ${QRISLY_CONFIG.environment}`);
console.log(`📌 QRIS ID: ${QRISLY_CONFIG.qrisId}`);
