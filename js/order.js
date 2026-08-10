// js/order.js
// ============================================
// KONFIGURASI API
// ============================================
const API_BASE_URL = '/.netlify/functions/rajaongkir';
const ORIGIN_SUBDISTRICT_ID = '26017';
const ORIGIN_NAME = 'Curug, Depok, Jawa Barat';

// ============================================
// QRIS TEMPLATE - DARI QRISLY YANG SUDAH TERBUKTI
// ============================================
// 🔥 QRIS ini adalah hasil generate dari QRISLY (sudah valid)
// Gunakan ini sebagai template, hanya ubah amount-nya
const QRIS_TEMPLATE = '00020101021126580013ID.NETZME.WWW01189360081401001769850208oOQc4v3U0303UMI51440014ID.CO.QRIS.WWW0215ID10254577823040303UMI5204723053033605802ID5924Babeh Barbershop - Curug6005DEPOK61051651762070703A01';

// ============================================
// QRIS PARSER & GENERATOR
// ============================================

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
 * 🔥 GENERATE QRIS DINAMIS
 * Hanya ubah tag 54 (Amount) dan hitung ulang CRC
 */
function generateDynamicQRIS(amount) {
    try {
        // Parse template
        const tags = parseQRIS(QRIS_TEMPLATE);
        
        // 🔥 1. Tambah/update tag 54 (Amount)
        // Format: 6 digit (contoh: 10000 → '010000')
        const amountStr = String(amount).padStart(6, '0');
        tags['54'] = amountStr;
        
        // 🔥 2. Hapus CRC lama (tag 63)
        delete tags['63'];
        
        // 🔥 3. Build sementara untuk hitung CRC
        const tempQRIS = buildQRIS(tags);
        const crc = calculateCRC16(tempQRIS);
        tags['63'] = crc;
        
        // 🔥 4. Build final QRIS
        const dynamicQRIS = buildQRIS(tags);
        
        console.log('✅ QRIS Dinamis generated!');
        console.log(`📌 Amount: ${amount}`);
        console.log(`📌 CRC: ${crc}`);
        console.log(`📌 QRIS Length: ${dynamicQRIS.length}`);
        console.log(`📌 QRIS String: ${dynamicQRIS.substring(0, 50)}...`);
        
        return {
            success: true,
            qrisString: dynamicQRIS,
            amount: amount,
            crc: crc
        };
        
    } catch (error) {
        console.error('❌ QRIS generate error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// TAMPILKAN QRIS DI MODAL
// ============================================
function showQRISPaymentModal(orderData) {
    const modal = createQRISModal();
    const content = document.getElementById('qris-modal-content');
    if (!content) return;

    // 🔥 GENERATE QRIS DINAMIS
    const result = generateDynamicQRIS(orderData.total);
    
    if (!result.success) {
        content.innerHTML = `
            <div style="text-align:center; padding:20px; color:#dc3545;">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <p>Gagal generate QRIS: ${result.error}</p>
                <button onclick="closeQRISModal()" class="btn btn-secondary">Tutup</button>
            </div>
        `;
        modal.style.display = 'flex';
        return;
    }
    
    const qrData = result.qrisString;

    content.innerHTML = `
        <div style="position:relative; text-align:center; padding:10px 0;">
            <h3 style="color:#dc3545; margin-bottom:15px;">
                <i class="fas fa-qrcode"></i> Scan QRIS untuk Membayar
            </h3>
            <p>No. Pesanan: <strong>${orderData.order_number}</strong></p>
            <p style="font-size:1.2rem; margin:10px 0;">
                Total: <strong style="color:#dc3545;">Rp ${formatRupiah(orderData.total)}</strong>
            </p>
            <div id="qris-container" style="margin:20px auto; padding:15px; background:#f8f9fa; border-radius:10px; max-width:300px; min-height:250px; display:flex; align-items:center; justify-content:center;">
                <div id="qrcode" style="width:250px; height:250px; margin:0 auto;"></div>
            </div>
            <p style="font-size:0.85rem; color:#6c757d;">
                ⏰ QRIS berlaku 15 menit
            </p>
            <div style="margin:15px 0; padding:10px; background:#e8f5e9; border-radius:8px; color:#2e7d32; font-size:0.9rem;">
                <i class="fas fa-check-circle"></i> Transfer sesuai total pesanan
                <br>
                <strong>BSI: 1234567890</strong> a.n. Babeh Fried Chicken
            </div>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button onclick="closeQRISModal()" style="padding:8px 20px; background:#6c757d; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.9rem;">
                    <i class="fas fa-times"></i> Tutup
                </button>
                <button onclick="copyQRISString()" style="padding:8px 20px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.9rem;">
                    <i class="fas fa-copy"></i> Copy QRIS
                </button>
            </div>
            <p style="font-size:0.7rem; color:#6c757d; margin-top:10px;">
                Kirim bukti transfer ke WhatsApp admin: <strong>082121266056</strong>
            </p>
        </div>
    `;

    modal.style.display = 'flex';

    // 🔥 Render QR Code
    setTimeout(() => {
        const container = document.getElementById('qrcode');
        if (container) {
            try {
                container.innerHTML = '';
                new QRCode(container, {
                    text: qrData,
                    width: 250,
                    height: 250,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.L
                });
                console.log('✅ QR Code generated!');
                console.log('📌 QRIS String:', qrData.substring(0, 50) + '...');
            } catch (error) {
                console.error('❌ QRCode error:', error);
                // Fallback ke Google Chart
                const img = document.createElement('img');
                img.src = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(qrData)}&chs=300x300&choe=UTF-8`;
                img.style.cssText = 'max-width:100%; border-radius:8px;';
                const containerDiv = document.getElementById('qris-container');
                if (containerDiv) {
                    containerDiv.innerHTML = '';
                    containerDiv.appendChild(img);
                }
            }
        }
    }, 300);
}

// ============================================
// QRIS MODAL FUNCTIONS
// ============================================
function createQRISModal() {
    let modal = document.getElementById('qris-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'qris-modal';
    modal.className = 'modal';
    modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center;';
    modal.innerHTML = `<div class="modal-content" id="qris-modal-content" style="background:white; padding:25px; border-radius:12px; max-width:400px; width:90%; text-align:center; max-height:90vh; overflow-y:auto;"></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) { if (e.target === this) closeQRISModal(); });
    return modal;
}

function closeQRISModal() {
    const modal = document.getElementById('qris-modal');
    if (modal) modal.style.display = 'none';
}

function copyQRISString() {
    const container = document.getElementById('qris-container');
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (canvas) {
        // Ambil text dari QRCode.js
        const qrData = canvas.getAttribute('data-text');
        if (qrData) {
            navigator.clipboard.writeText(qrData).then(() => {
                showNotification('✅ QRIS string copied!', 'success');
            }).catch(() => {
                // Fallback
                const textarea = document.createElement('textarea');
                textarea.value = qrData;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
                showNotification('✅ QRIS string copied!', 'success');
            });
        }
    }
}

// ============================================
// WHATSAPP NOTIFICATIONS (WAHA)
// ============================================
const WAHA_API_URL = 'https://waha-yetv8qi4e3zk.anakit.sumopod.my.id/api/sendText';
const WAHA_API_KEY = 'sfcoGbpdLDkGZhKw2rx8sbb14vf4d8V6';
const WAHA_ADMIN_GROUP = '6282121266056@c.us';

async function sendWhatsAppWAHA(phoneNumber, message) {
    try {
        if (!phoneNumber) return false;
        let formattedPhone = phoneNumber.trim();
        if (!formattedPhone.includes('@c.us') && !formattedPhone.includes('@g.us')) {
            formattedPhone = formattedPhone.replace(/^0/, '62').replace(/^\+62/, '62').replace(/[^0-9]/g, '');
            formattedPhone += '@c.us';
        }
        const response = await fetch(WAHA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
            body: JSON.stringify({ session: 'Session1', chatId: formattedPhone, text: message })
        });
        if (!response.ok) throw new Error(`WAHA API error: ${response.status}`);
        return true;
    } catch (error) {
        console.error('❌ WA error:', error);
        return false;
    }
}

async function sendCustomerNotification(orderData) {
    const message = `*🍗 Babeh Fried Chicken - Pesanan Berhasil!*

Halo *${orderData.customer_name}*,

Pesanan Anda telah kami terima:

📋 *No. Pesanan:* ${orderData.order_number}
📅 *Tanggal:* ${new Date().toLocaleDateString('id-ID')}
💰 *Total: Rp ${formatRupiah(orderData.total)}*

📌 *Status:* Menunggu Pembayaran QRIS

*📱 Cara Bayar:*
Scan QRIS dan transfer sesuai total ke:
BSI: 1234567890
a.n. Babeh Fried Chicken

Kirim bukti transfer ke WhatsApp admin.

Terima kasih! 🍗`;

    await sendWhatsAppWAHA(orderData.customer_phone, message);
}

async function sendAdminNotification(orderData) {
    const message = `*📢 PESANAN BARU!*

No: ${orderData.order_number}
Customer: ${orderData.customer_name}
WA: ${orderData.customer_phone}
Total: Rp ${formatRupiah(orderData.total)}
Alamat: ${orderData.customer_address}`;

    await sendWhatsAppWAHA(WAHA_ADMIN_GROUP, message);
}

// ============================================
// SUBMIT ORDER
// ============================================
async function submitOrder(event) {
    event.preventDefault();
    console.log('📝 Starting order submission...');
    
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": [], "total": 0, "total_berat": 0}');
    if (order.items.length === 0) {
        showNotification('Silakan tambahkan pesanan terlebih dahulu!', 'error');
        return;
    }

    const customerName = document.getElementById('customer-name')?.value?.trim();
    const customerPhone = document.getElementById('customer-phone')?.value?.trim();
    const customerAddress = document.getElementById('customer-address')?.value?.trim();
    const notes = document.getElementById('order-notes')?.value?.trim() || '';
    const subdistrictId = document.getElementById('selected-subdistrict')?.value;
    const shippingCost = parseInt(document.getElementById('shipping-cost')?.value) || 0;

    if (!customerName || !customerPhone || !customerAddress) {
        showNotification('Mohon lengkapi data pemesan!', 'error');
        return;
    }
    if (!subdistrictId) {
        showNotification('Silakan cari dan pilih lokasi tujuan!', 'error');
        return;
    }

    const orderNumber = generateOrderNumber();
    const orderData = {
        order_number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        items: order.items,
        subtotal: order.total,
        shipping_cost: shippingCost,
        total: order.total + shippingCost,
        total_berat: order.total_berat || 0,
        shipping_subdistrict: subdistrictId,
        payment_method: 'QRIS',
        payment_status: 'Menunggu Pembayaran',
        notes: notes || '',
        status: 'pending'
    };

    try {
        console.log('📤 Submitting order...');
        const { data, error } = await window.supabaseClient
            .from('order_fried_chicken')
            .insert([orderData])
            .select();

        if (error) throw error;

        const savedOrder = data[0];
        console.log('✅ Order saved:', savedOrder);

        await sendCustomerNotification(savedOrder);
        await sendAdminNotification(savedOrder);

        localStorage.removeItem('currentOrder');
        window.updateOrderBadge();

        showQRISPaymentModal(savedOrder);

    } catch (error) {
        console.error('Submit error:', error);
        showNotification('Gagal membuat pesanan: ' + error.message, 'error');
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateOrderNumber() {
    const date = new Date();
    const ts = date.getFullYear() + String(date.getMonth()+1).padStart(2,'0') + 
               String(date.getDate()).padStart(2,'0') + String(date.getHours()).padStart(2,'0') + 
               String(date.getMinutes()).padStart(2,'0') + String(date.getSeconds()).padStart(2,'0');
    return `BFC${ts}${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
}

function showSuccessPage(orderNumber) {
    const container = document.getElementById('order-form-container');
    if (!container) return;
    container.innerHTML = `
        <div class="order-success">
            <i class="fas fa-check-circle fa-3x" style="color:#28a745;"></i>
            <h2>Pesanan Berhasil!</h2>
            <p>Nomor Pesanan: <strong>${orderNumber}</strong></p>
            <p>Silakan lakukan pembayaran melalui QRIS.</p>
            <button onclick="window.location.reload()" class="btn btn-primary">Pesan Lagi</button>
        </div>
    `;
}

function formatRupiah(amount) { return new Intl.NumberFormat('id-ID').format(amount); }

function showNotification(message, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = message;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
}

window.updateOrderBadge = function() {
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const badge = document.getElementById('order-badge');
    if (badge) {
        const total = order.items.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = total;
        badge.style.display = total > 0 ? 'inline-block' : 'none';
    }
};

// ============================================
// LOAD ORDER ITEMS
// ============================================
function loadOrderItems() {
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": [], "total": 0, "total_berat": 0}');
    const container = document.getElementById('order-items');
    const totalContainer = document.getElementById('order-total');
    const beratContainer = document.getElementById('order-berat');
    const subtotalContainer = document.getElementById('order-subtotal');
    const shippingContainer = document.getElementById('order-shipping');
    const paymentTotal = document.getElementById('payment-total');

    if (!container) return;

    order.total_berat = order.items.reduce((sum, item) => sum + ((item.weight || 250) * item.quantity), 0);
    order.total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = parseInt(document.getElementById('shipping-cost')?.value) || 0;

    if (order.items.length === 0) {
        container.innerHTML = `<div class="empty-order"><i class="fas fa-shopping-cart fa-2x"></i><p>Belum ada pesanan</p><a href="#produk">Lihat Menu</a></div>`;
        if (subtotalContainer) subtotalContainer.textContent = 'Rp 0';
        if (shippingContainer) shippingContainer.textContent = 'Rp 0';
        if (totalContainer) totalContainer.textContent = 'Rp 0';
        if (beratContainer) beratContainer.textContent = '0 g';
        if (paymentTotal) paymentTotal.textContent = 'Rp 0';
        updateHiddenFields(order);
        return;
    }

    let html = '';
    order.items.forEach(item => {
        const weight = item.weight || 250;
        html += `
            <div class="order-item">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">Rp ${formatRupiah(item.price)} x ${item.quantity}</span>
                    <span class="item-weight"><i class="fas fa-weight"></i> ${weight}g</span>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                    <span class="item-qty">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button class="remove-btn" onclick="removeItem(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    const totalWithShipping = order.total + shipping;
    if (subtotalContainer) subtotalContainer.textContent = `Rp ${formatRupiah(order.total)}`;
    if (shippingContainer) shippingContainer.textContent = `Rp ${formatRupiah(shipping)}`;
    if (totalContainer) totalContainer.textContent = `Rp ${formatRupiah(totalWithShipping)}`;
    if (beratContainer) beratContainer.textContent = `${order.total_berat} g`;
    if (paymentTotal) paymentTotal.textContent = `Rp ${formatRupiah(totalWithShipping)}`;

    updateHiddenFields(order);
}

function updateHiddenFields(order) {
    const itemsJson = document.getElementById('order-items-json');
    const subtotal = document.getElementById('subtotal');
    const totalBerat = document.getElementById('total-berat');
    if (itemsJson) itemsJson.value = JSON.stringify(order.items);
    if (subtotal) subtotal.value = order.total;
    if (totalBerat) totalBerat.value = order.total_berat;
}

// ============================================
// ADD TO ORDER & QUANTITY
// ============================================
window.addToOrder = function(productId, productName, price, weight) {
    const itemWeight = weight || 250;
    let order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": [], "total": 0, "total_berat": 0}');
    const existingItem = order.items.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        order.items.push({ id: productId, name: productName, price: price, weight: itemWeight, quantity: 1 });
    }
    order.total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    order.total_berat = order.items.reduce((sum, item) => sum + ((item.weight || 250) * item.quantity), 0);
    localStorage.setItem('currentOrder', JSON.stringify(order));
    window.updateOrderBadge();
    loadOrderItems();
    showNotification(`✅ ${productName} ditambahkan!`, 'success');
};

function updateQuantity(productId, change) {
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const item = order.items.find(i => i.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) order.items = order.items.filter(i => i.id !== productId);
        order.total = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        order.total_berat = order.items.reduce((sum, i) => sum + ((i.weight || 250) * i.quantity), 0);
        localStorage.setItem('currentOrder', JSON.stringify(order));
        loadOrderItems();
        window.updateOrderBadge();
    }
}

function removeItem(productId) {
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    order.items = order.items.filter(i => i.id !== productId);
    order.total = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    order.total_berat = order.items.reduce((sum, i) => sum + ((i.weight || 250) * i.quantity), 0);
    localStorage.setItem('currentOrder', JSON.stringify(order));
    loadOrderItems();
    window.updateOrderBadge();
}

// ============================================
// SEARCH & SHIPPING
// ============================================
let searchTimeout;

async function searchDestination(query) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    if (!query || query.length < 3) {
        resultsContainer.classList.remove('show');
        resultsContainer.innerHTML = '';
        return;
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            resultsContainer.innerHTML = '<div style="padding:10px;">🔍 Mencari...</div>';
            resultsContainer.classList.add('show');
            const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=20`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            let results = [];
            if (data.data) results = data.data;
            else if (data.rajaongkir?.results) results = data.rajaongkir.results;
            if (results.length > 0) {
                resultsContainer.innerHTML = results.map(item => {
                    const id = item.id || item.subdistrict_id;
                    const name = item.subdistrict_name || item.name || 'Kecamatan';
                    const city = item.city_name || item.city || 'Kota';
                    const province = item.province || 'Provinsi';
                    return `
                        <div class="search-result-item" onclick="selectSearchResult('${id}', '${name}', '${city}', '${province}')">
                            <span class="result-name">${name}</span>
                            <span class="result-location">${city}, ${province}</span>
                            ${id ? `<span class="result-badge">ID: ${id}</span>` : ''}
                        </div>
                    `;
                }).join('');
                resultsContainer.classList.add('show');
            } else {
                resultsContainer.innerHTML = '<div style="padding:10px; text-align:center; color:#6c757d;">❌ Tidak ditemukan</div>';
                resultsContainer.classList.add('show');
            }
        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = `<div style="padding:10px; color:#dc3545;">❌ Gagal mencari</div>`;
            resultsContainer.classList.add('show');
        }
    }, 500);
}

function selectSearchResult(id, name, city, province) {
    if (!id) { showNotification('❌ ID lokasi tidak ditemukan!', 'error'); return; }
    document.getElementById('search-results').classList.remove('show');
    document.getElementById('search-destination').value = name;
    const selectedLocation = document.getElementById('selected-location');
    document.getElementById('selected-location-text').textContent = `${name}, ${city}, ${province}`;
    document.getElementById('selected-subdistrict').value = id;
    selectedLocation.classList.add('show');
    calculateShippingWithSubdistrict(id);
}

async function calculateShippingWithSubdistrict(subdistrictId) {
    if (!subdistrictId) { resetShippingDisplay(); return; }
    const courier = document.getElementById('courier-select')?.value || 'jne';
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": [], "total_berat": 0}');
    const totalWeight = order.total_berat || 1000;

    const costDisplay = document.getElementById('shipping-cost-display');
    const serviceDisplay = document.getElementById('shipping-service');
    const loader = document.getElementById('shipping-loader');
    const optionsContainer = document.getElementById('shipping-options');

    try {
        if (costDisplay) costDisplay.textContent = 'Menghitung...';
        if (serviceDisplay) serviceDisplay.textContent = '';
        if (loader) loader.style.display = 'block';
        if (optionsContainer) optionsContainer.innerHTML = '<div style="color:#6c757d;">⏳ Menghitung ongkir...</div>';
        
        const formData = new URLSearchParams();
        formData.append('origin', ORIGIN_SUBDISTRICT_ID);
        formData.append('destination', subdistrictId);
        formData.append('weight', totalWeight.toString());
        formData.append('courier', courier);
        formData.append('price', 'lowest');
        
        const response = await fetch(`${API_BASE_URL}/cost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        let costs = [];
        if (data.data && Array.isArray(data.data)) {
            data.data.forEach(item => {
                costs.push({
                    courier: item.code || 'unknown',
                    courier_name: item.name || item.code || 'Kurir',
                    service: item.service || 'Layanan',
                    description: item.description || '',
                    price: item.cost || 0,
                    etd: item.etd || '1-2'
                });
            });
        }
        
        if (costs.length > 0) {
            displayShippingOptions(costs);
            const cheapest = costs.reduce((min, cost) => cost.price < min.price ? cost : min);
            document.getElementById('shipping-cost').value = cheapest.price;
            if (costDisplay) costDisplay.textContent = `Rp ${formatRupiah(cheapest.price)}`;
            if (serviceDisplay) {
                serviceDisplay.textContent = `${cheapest.courier_name} - ${cheapest.service} (${cheapest.etd})`;
                serviceDisplay.style.color = '#28a745';
            }
            if (loader) loader.style.display = 'none';
            loadOrderItems();
        } else {
            throw new Error('Tidak ada pilihan ongkir');
        }
    } catch (error) {
        console.error('Cost error:', error);
        if (costDisplay) costDisplay.textContent = 'Rp 0';
        if (serviceDisplay) { serviceDisplay.textContent = `⚠️ ${error.message}`; serviceDisplay.style.color = '#dc3545'; }
        if (loader) loader.style.display = 'none';
        if (optionsContainer) optionsContainer.innerHTML = `<div style="color:#dc3545;">❌ ${error.message}</div>`;
    }
}

function resetShippingDisplay() {
    document.getElementById('shipping-cost').value = 0;
    document.getElementById('shipping-cost-display').textContent = 'Rp 0';
    document.getElementById('shipping-service').textContent = '';
    document.getElementById('shipping-loader').style.display = 'none';
    document.getElementById('shipping-options').innerHTML = '';
}

function displayShippingOptions(costs) {
    const container = document.getElementById('shipping-options');
    if (!container) return;
    const sorted = [...costs].sort((a, b) => a.price - b.price);
    container.innerHTML = `
        <div style="font-size:0.8rem; color:#6c757d; margin-bottom:4px; font-weight:bold;">Pilihan Ongkir:</div>
        ${sorted.map((cost, index) => {
            const isCheapest = index === 0;
            return `
                <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #f0f0f0; ${isCheapest ? 'background:#f8f9fa; border-radius:4px;' : ''}">
                    <span>${isCheapest ? '🏆 ' : ''}<strong>${cost.courier_name}</strong> ${cost.service}</span>
                    <span style="font-weight:bold; color:${isCheapest ? '#28a745' : '#333'};">Rp ${formatRupiah(cost.price)} (${cost.etd})</span>
                </div>
            `;
        }).join('')}
    `;
}

// ============================================
// SET ORIGIN
// ============================================
function setOrigin() {
    const originInfo = document.getElementById('origin-info');
    if (originInfo) originInfo.textContent = `📍 Lokasi toko: ${ORIGIN_NAME}`;
    localStorage.setItem('origin_subdistrict_id', ORIGIN_SUBDISTRICT_ID);
    localStorage.setItem('origin_name', ORIGIN_NAME);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setOrigin();
    loadOrderItems();
    
    const searchInput = document.getElementById('search-destination');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) { searchDestination(e.target.value.trim()); });
    }
    document.addEventListener('click', function(e) {
        const results = document.getElementById('search-results');
        const input = document.getElementById('search-destination');
        if (results && input && !e.target.closest('#search-destination') && !e.target.closest('#search-results')) {
            results.classList.remove('show');
        }
    });
    document.getElementById('courier-select')?.addEventListener('change', function() {
        const subdistrictId = document.getElementById('selected-subdistrict')?.value;
        if (subdistrictId) calculateShippingWithSubdistrict(subdistrictId);
    });
    document.getElementById('order-form').addEventListener('submit', submitOrder);
});

// ============================================
// GLOBAL EXPORTS
// ============================================
window.loadOrderItems = loadOrderItems;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.selectSearchResult = selectSearchResult;
window.calculateShippingWithSubdistrict = calculateShippingWithSubdistrict;
window.submitOrder = submitOrder;
window.updateOrderBadge = updateOrderBadge;
window.addToOrder = addToOrder;
window.copyQRISString = copyQRISString;
