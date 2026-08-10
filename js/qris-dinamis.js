// js/qris-dinamis.js
// QRIS Dinamis - Tambah Amount & Unique Value ke QRIS Statis

/**
 * Parse QRIS string ke object
 * Format: tag(2 digit) + length(2 digit) + value
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
 * Generate QRIS Dinamis dengan Amount & Unique Value
 * @param {string} staticQRIS - QRIS statis string (format 000201...)
 * @param {number} amount - Total pembayaran
 * @param {number} uniqueId - Unique ID (misal: order ID)
 * @param {string} merchantName - Nama merchant (opsional)
 * @returns {object} { qrisString, tags, finalAmount, historyId }
 */
function generateDynamicQRIS(staticQRIS, amount, uniqueId, merchantName = '') {
    try {
        // 1. Parse QRIS statis
        const tags = parseQRIS(staticQRIS);
        
        console.log('📌 QRIS Tags:', tags);
        
        // 2. Hitung unique amount
        const uniqueAmount = amount + (uniqueId % 100); // Unique ID 0-99
        const finalAmount = Math.round(uniqueAmount);
        
        // 3. Tambah atau update tag 54 (Amount)
        // Tag 54 = Amount (format: 2 digit + 2 digit length + value)
        const amountStr = String(finalAmount).padStart(2, '0');
        tags['54'] = amountStr;
        
        // 4. Tambah tag 01 (Unique Identifier) untuk tracking
        // Tag 01 = Unique Identifier (custom)
        tags['01'] = String(uniqueId);
        
        // 5. Update tag 59 (Merchant Name) jika disediakan
        if (merchantName) {
            tags['59'] = merchantName.substring(0, 25); // Max 25 chars
        }
        
        // 6. Update tag 60 (Merchant City) - optional
        if (!tags['60']) {
            tags['60'] = 'DEPOK';
        }
        
        // 7. Build QRIS baru
        const dynamicQRIS = buildQRIS(tags);
        
        // 8. Tambahkan CRC (Tag 63) jika diperlukan
        // Untuk QRIS standar, CRC ada di akhir
        // Kita rebuild dengan CRC yang benar (opsional)
        
        console.log('✅ QRIS Dinamis generated!');
        console.log(`📌 Final Amount: ${finalAmount}`);
        console.log(`📌 Unique ID: ${uniqueId}`);
        
        return {
            success: true,
            qrisString: dynamicQRIS,
            tags: tags,
            finalAmount: finalAmount,
            uniqueId: uniqueId,
            historyId: uniqueId,
            originalAmount: amount,
            merchantName: merchantName || tags['59'] || 'Merchant'
        };
        
    } catch (error) {
        console.error('❌ Error generating dynamic QRIS:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate QRIS dengan menggunakan library QRCode.js
 * @param {string} qrisString - QRIS string
 * @param {number} width - Lebar QR Code
 * @param {number} height - Tinggi QR Code
 * @returns {string} - HTML untuk QR Code
 */
function generateQRCodeHTML(qrisString, width = 250, height = 250) {
    return `
        <div id="qrcode-container" style="display:flex; justify-content:center;">
            <canvas id="qrcode-canvas" width="${width}" height="${height}"></canvas>
        </div>
    `;
}

/**
 * Render QR Code ke canvas menggunakan QRCode.js
 * @param {string} qrisString - QRIS string
 * @param {string} containerId - ID container
 * @param {number} width - Lebar QR Code
 * @param {number} height - Tinggi QR Code
 */
function renderQRCode(qrisString, containerId = 'qrcode-container', width = 250, height = 250) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('❌ Container not found:', containerId);
        return;
    }
    
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'qrcode-canvas';
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);
    
    try {
        // Gunakan library QRCode.js
        if (typeof QRCode !== 'undefined') {
            new QRCode(canvas, {
                text: qrisString,
                width: width,
                height: height,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.L // L = kapasitas paling besar
            });
            console.log('✅ QR Code rendered!');
            return true;
        } else {
            console.warn('⚠️ QRCode.js not loaded, using fallback');
            // Fallback: Google Chart API
            const img = document.createElement('img');
            img.src = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(qrisString)}&chs=${width}x${height}&choe=UTF-8`;
            img.style.width = '100%';
            img.style.height = '100%';
            container.appendChild(img);
            return true;
        }
    } catch (error) {
        console.error('❌ QRCode error:', error);
        // Fallback ke Google Chart API
        const img = document.createElement('img');
        img.src = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(qrisString)}&chs=${width}x${height}&choe=UTF-8`;
        img.style.width = '100%';
        img.style.height = '100%';
        container.innerHTML = '';
        container.appendChild(img);
        return true;
    }
}

// ============================================
// QRIS STATIS (Contoh - Ganti dengan QRIS Anda)
// ============================================
const STATIC_QRIS_EXAMPLE = '00020101021126580013ID.NETZME.WWW01189360081401001769850208oOQc4v3U0303UMI51440014ID.CO.QRIS.WWW0215ID10254577823040303UMI5204723053033605802ID5924Babeh%20Barbershop%20-%20Curug6005DEPOK6105165176299INVALID_DATA';

// ============================================
// EKSPOR UNTUK DIGUNAKAN DI FILE LAIN
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseQRIS,
        buildQRIS,
        generateDynamicQRIS,
        generateQRCodeHTML,
        renderQRCode,
        STATIC_QRIS_EXAMPLE
    };
}

// ============================================
// INIT - AUTO TEST (Jika dijalankan di browser)
// ============================================
if (typeof window !== 'undefined') {
    window.QRISDinamis = {
        parseQRIS,
        buildQRIS,
        generateDynamicQRIS,
        generateQRCodeHTML,
        renderQRCode,
        STATIC_QRIS_EXAMPLE
    };
    
    console.log('✅ QRIS Dinamis library loaded!');
    console.log('📌 Gunakan: QRISDinamis.generateDynamicQRIS(staticQRIS, amount, uniqueId)');
}
