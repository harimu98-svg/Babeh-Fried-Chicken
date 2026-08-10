// js/qris-dinamis.js
// QRIS Dinamis - VERSI SEDERHANA (TANPA TAG 01, 62)

// 🔥 QRIS STATIS (TANPA AMOUNT)
const STATIC_QRIS = '00020101021126580013ID.NETZME.WWW01189360081401001769850208oOQc4v3U0303UMI51440014ID.CO.QRIS.WWW0215ID10254577823040303UMI5204723053033605802ID5924Babeh Barbershop - Curug6005DEPOK61051651762070703A01630455D8';

/**
 * Parse QRIS string ke object tags
 */
function parseQRIS(qrisString) {
    const tags = {};
    let i = 0;
    while (i < qrisString.length) {
        const tag = qrisString.substring(i, i + 2);
        i += 2;
        const length = parseInt(qrisString.substring(i, i + 2));
        i += 2;
        const value = qrisString.substring(i, i + length);
        i += length;
        tags[tag] = value;
    }
    return tags;
}

/**
 * Build QRIS string dari object tags
 */
function buildQRIS(tags) {
    let result = '';
    const sortedKeys = Object.keys(tags).sort();
    for (const key of sortedKeys) {
        const value = tags[key];
        const length = String(value.length).padStart(2, '0');
        result += key + length + value;
    }
    return result;
}

/**
 * Hitung CRC16-CCITT untuk QRIS
 */
function calculateCRC16(data) {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate QRIS Dinamis - VERSI SEDERHANA
 * Hanya tambah tag 54 (Amount) dan update CRC
 */
function generateDynamicQRIS(staticQRIS, amount, uniqueId) {
    try {
        // Parse QRIS statis
        const tags = parseQRIS(staticQRIS);
        
        // 🔥 TAMBAH TAG 54 (AMOUNT)
        tags['54'] = String(amount);
        
        // 🔥 HAPUS TAG 63 (CRC) - akan dihitung ulang
        delete tags['63'];
        
        // 🔥 HAPUS TAG YANG MUNGKIN MENYEBABKAN MASALAH
        delete tags['01']; // Unique ID (tidak semua app support)
        delete tags['62']; // Additional Data (bisa menyebabkan error)
        
        // Build QRIS sementara untuk hitung CRC
        const tempQRIS = buildQRIS(tags);
        
        // 🔥 HITUNG CRC
        const crc = calculateCRC16(tempQRIS);
        tags['63'] = crc;
        
        // Build final QRIS
        const dynamicQRIS = buildQRIS(tags);
        
        console.log('✅ QRIS Dinamis generated!');
        console.log(`📌 Amount: ${amount}`);
        console.log(`📌 CRC: ${crc}`);
        console.log(`📌 QRIS Length: ${dynamicQRIS.length}`);
        
        return {
            success: true,
            qrisString: dynamicQRIS,
            amount: amount,
            uniqueId: uniqueId,
            historyId: uniqueId,
            tags: tags
        };
        
    } catch (error) {
        console.error('❌ Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Test QRIS di Console
 */
function testQRIS() {
    const amount = 10000;
    const uniqueId = 1234;
    const result = generateDynamicQRIS(STATIC_QRIS, amount, uniqueId);
    
    console.log('📦 QRIS Result:');
    console.log('📌 QRIS String:', result.qrisString);
    console.log('📌 Amount:', result.amount);
    console.log('📌 Length:', result.qrisString.length);
    
    return result;
}

// ============================================
// EKSPOR
// ============================================
if (typeof window !== 'undefined') {
    window.QRISDinamis = {
        STATIC_QRIS,
        parseQRIS,
        buildQRIS,
        calculateCRC16,
        generateDynamicQRIS,
        testQRIS
    };
    console.log('✅ QRIS Dinamis library loaded!');
}
