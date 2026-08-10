// js/qrisly-config.js
const QRISLY_CONFIG = {
    apiBaseUrl: '/.netlify/functions/qrisly',
    qrisId: 761,
    environment: 'production',
    outputType: 'image',
    uniqueAmount: true,
    webhookUrl: 'https://babehfriedchicken.netlify.app/.netlify/functions/qrisly-webhook'
};

window.QRISLY_CONFIG = QRISLY_CONFIG;
console.log('✅ QRISLY Config loaded, qrisId:', QRISLY_CONFIG.qrisId);
