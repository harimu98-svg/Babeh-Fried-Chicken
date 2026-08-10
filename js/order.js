// js/order.js - FULL CODE (TANPA DUPLIKASI)

// ============================================
// KONFIGURASI API
// ============================================
const API_BASE_URL = '/.netlify/functions/rajaongkir';
const ORIGIN_SUBDISTRICT_ID = '26017';
const ORIGIN_NAME = 'Curug, Depok, Jawa Barat';

// ============================================
// QRIS DINAMIS - SELF HOSTED
// ============================================
// 🔥 GUNAKAN DARI QRISDINAMIS jika tersedia
// Jika tidak, definisikan di sini

// Hanya definisikan jika belum ada
if (typeof QRISDinamis === 'undefined') {
    console.warn('⚠️ QRISDinamis not found, using fallback');
    
    const STATIC_QRIS = '00020101021126580013ID.NETZME.WWW01189360081401001769850208oOQc4v3U0303UMI51440014ID.CO.QRIS.WWW0215ID10254577823040303UMI5204723053033605802ID5924Babeh Barbershop - Curug6005DEPOK61051651762070703A01630455D8';
    
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
    
    function generateDynamicQRIS(staticQRIS, amount, uniqueId) {
        try {
            const tags = parseQRIS(staticQRIS);
            tags['54'] = String(amount);
            delete tags['63'];
            delete tags['01'];
            delete tags['62'];
            const tempQRIS = buildQRIS(tags);
            const crc = calculateCRC16(tempQRIS);
            tags['63'] = crc;
            return {
                success: true,
                qrisString: buildQRIS(tags),
                amount: amount,
                uniqueId: uniqueId,
                historyId: uniqueId
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    window.QRISDinamis = {
        STATIC_QRIS,
        generateDynamicQRIS
    };
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
        container.innerHTML = `
            <div class="empty-order">
                <i class="fas fa-shopping-cart fa-2x"></i>
                <p>Belum ada pesanan</p>
                <a href="#produk">Lihat Menu</a>
            </div>
        `;
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

function updateTotal() {
    const subtotal = parseInt(document.getElementById('subtotal')?.value) || 0;
    const shipping = parseInt(document.getElementById('shipping-cost')?.value) || 0;
    const total = subtotal + shipping;
    const totalContainer = document.getElementById('order-total');
    const paymentTotal = document.getElementById('payment-total');
    if (totalContainer) totalContainer.textContent = `Rp ${formatRupiah(total)}`;
    if (paymentTotal) paymentTotal.textContent = `Rp ${formatRupiah(total)}`;
}

// ============================================
// ADD TO ORDER
// ============================================
window.addToOrder = function(productId, productName, price, weight) {
    console.log('➕ Adding:', { productId, productName, price, weight });
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
// FORMAT & HELPERS
// ============================================
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
// GENERATE QRIS PAYMENT
// ============================================
async function generateQRISPayment(orderData) {
    try {
        console.log('🔄 Generating QRIS Dinamis...');
        
        // 🔥 Gunakan QRISDinamis jika tersedia
        let generateFunc = null;
        let staticQRIS = null;
        
        if (typeof window.QRISDinamis !== 'undefined' && window.QRISDinamis.generateDynamicQRIS) {
            generateFunc = window.QRISDinamis.generateDynamicQRIS;
            staticQRIS = window.QRISDinamis.STATIC_QRIS;
        } else {
            throw new Error('QRIS library not loaded');
        }
        
        const uniqueId = Date.now() % 10000;
        const result = generateFunc(staticQRIS, orderData.total, uniqueId);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        console.log('✅ QRIS Dinamis generated!');
        console.log('📌 Final Amount:', result.amount);
        console.log('📌 History ID:', result.historyId);
        
        return {
            historyId: result.historyId,
            qrImage: result.qrisString,
            expiredAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            environment: 'self-hosted'
        };
    } catch (error) {
        console.error('❌ QRIS generate error:', error);
        throw error;
    }
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
        qrisly_status: 'unpaid',
        notes: notes || '',
        status: 'pending'
    };

    try {
        // Generate QRIS
        console.log('🔄 Generating QRIS...');
        const qrisResult = await generateQRISPayment(orderData);
        orderData.qrisly_history_id = qrisResult.historyId;
        orderData.qrisly_qr_image = qrisResult.qrImage;
        orderData.qrisly_expired_at = qrisResult.expiredAt;
        orderData.environment = qrisResult.environment || 'self-hosted';
        console.log('✅ QRIS generated:', qrisResult.historyId);

        // Submit ke Supabase
        const { data, error } = await window.supabaseClient
            .from('order_fried_chicken')
            .insert([orderData])
            .select();

        if (error) throw error;

        const savedOrder = data[0];
        console.log('✅ Order saved:', savedOrder);

        // Kirim WA
        await sendCustomerNotification(savedOrder);
        await sendAdminNotification(savedOrder);

        localStorage.removeItem('currentOrder');
        window.updateOrderBadge();

        // Tampilkan QRIS
        if (savedOrder.qrisly_qr_image) {
            showQRISPaymentModal(savedOrder);
        } else {
            showSuccessPage(orderNumber);
        }

    } catch (error) {
        console.error('Submit error:', error);
        showNotification('Gagal membuat pesanan: ' + error.message, 'error');
    }
}

// ============================================
// GENERATE ORDER NUMBER
// ============================================
function generateOrderNumber() {
    const date = new Date();
    const ts = date.getFullYear() + String(date.getMonth()+1).padStart(2,'0') + 
               String(date.getDate()).padStart(2,'0') + String(date.getHours()).padStart(2,'0') + 
               String(date.getMinutes()).padStart(2,'0') + String(date.getSeconds()).padStart(2,'0');
    return `BFC${ts}${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
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
    if (window.paymentPollingInterval) {
        clearInterval(window.paymentPollingInterval);
        window.paymentPollingInterval = null;
    }
}

function showQRISPaymentModal(orderData) {
    const modal = createQRISModal();
    const content = document.getElementById('qris-modal-content');
    if (!content) return;

    const qrData = orderData.qrisly_qr_image;
    const isQrisString = qrData && typeof qrData === 'string' && qrData.length > 50;
    const isSelfHosted = orderData.environment === 'self-hosted';

    content.innerHTML = `
        <div style="position:relative; text-align:center; padding:10px 0;">
            ${isSelfHosted ? `<div style="position:absolute; top:-10px; right:-10px; background:#28a745; color:white; padding:4px 12px; border-radius:20px; font-size:0.6rem; font-weight:bold;">SELF HOSTED</div>` : ''}
            <h3 style="color:#dc3545; margin-bottom:15px;"><i class="fas fa-qrcode"></i> Scan QRIS untuk Membayar</h3>
            <p>No. Pesanan: <strong>${orderData.order_number}</strong></p>
            <p style="font-size:1.2rem; margin:10px 0;">Total: <strong style="color:#dc3545;">Rp ${formatRupiah(orderData.total)}</strong></p>
            <div id="qris-container" style="margin:20px auto; padding:15px; background:#f8f9fa; border-radius:10px; max-width:300px; min-height:250px; display:flex; align-items:center; justify-content:center;">
                ${isQrisString ? `<div id="qrcode" style="width:250px; height:250px; margin:0 auto;"></div>` : `<p>QRIS tidak tersedia</p>`}
            </div>
            <p style="font-size:0.85rem; color:#6c757d;">⏰ Kadaluarsa: ${orderData.qrisly_expired_at ? new Date(orderData.qrisly_expired_at).toLocaleString('id-ID') : '15 menit'}</p>
            <div id="qris-status" style="margin:15px 0; padding:10px; background:#fff3cd; border-radius:8px; color:#856404;">⏳ Menunggu pembayaran...</div>
            <button onclick="closeQRISModal()" style="padding:8px 20px; background:#6c757d; color:white; border:none; border-radius:6px; cursor:pointer;">Tutup</button>
            <button onclick="manualCheckPayment('${orderData.order_number}')" style="padding:8px 20px; background:#dc3545; color:white; border:none; border-radius:6px; cursor:pointer;">Cek Status</button>
            ${isSelfHosted ? `<p style="font-size:0.7rem; color:#28a745; margin-top:10px;">⚡ Self-Hosted QRIS</p>` : ''}
        </div>
    `;

    modal.style.display = 'flex';

    if (isQrisString) {
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
                } catch (error) {
                    console.error('❌ QRCode error:', error);
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

    if (orderData.qrisly_history_id) {
        startPaymentPolling(orderData.qrisly_history_id, orderData.order_number);
    }
}

function startPaymentPolling(historyId, orderNumber) {
    if (window.paymentPollingInterval) {
        clearInterval(window.paymentPollingInterval);
        window.paymentPollingInterval = null;
    }
    let attempts = 0;
    const maxAttempts = 30;
    window.paymentPollingInterval = setInterval(async () => {
        attempts++;
        try {
            const { data, error } = await window.supabaseClient
                .from('order_fried_chicken')
                .select('qrisly_status, payment_status')
                .eq('order_number', orderNumber)
                .single();
            if (error) throw error;
            const statusElement = document.getElementById('qris-status');
            if (data && (data.qrisly_status === 'paid' || data.payment_status === 'Pembayaran Berhasil')) {
                clearInterval(window.paymentPollingInterval);
                window.paymentPollingInterval = null;
                if (statusElement) {
                    statusElement.innerHTML = '✅ Pembayaran Berhasil!';
                    statusElement.style.background = '#d4edda';
                    statusElement.style.color = '#155724';
                }
                showNotification('✅ Pembayaran berhasil!', 'success');
                setTimeout(() => { closeQRISModal(); showSuccessPage(orderNumber); }, 1500);
            } else if (data && data.qrisly_status === 'expired') {
                clearInterval(window.paymentPollingInterval);
                window.paymentPollingInterval = null;
                if (statusElement) {
                    statusElement.innerHTML = '❌ QRIS Kadaluarsa';
                    statusElement.style.background = '#f8d7da';
                    statusElement.style.color = '#721c24';
                }
            }
            if (attempts >= maxAttempts) {
                clearInterval(window.paymentPollingInterval);
                window.paymentPollingInterval = null;
                if (statusElement) {
                    statusElement.innerHTML = '⏰ Waktu habis. Cek manual.';
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 10000);
}

window.manualCheckPayment = async function(orderNumber) {
    showNotification('🔄 Mengecek status...', 'info');
    try {
        const { data, error } = await window.supabaseClient
            .from('order_fried_chicken')
            .select('qrisly_status, payment_status')
            .eq('order_number', orderNumber)
            .single();
        if (error) throw error;
        if (data && (data.qrisly_status === 'paid' || data.payment_status === 'Pembayaran Berhasil')) {
            showNotification('✅ Pembayaran berhasil!', 'success');
            closeQRISModal();
            showSuccessPage(orderNumber);
        } else if (data && data.qrisly_status === 'expired') {
            showNotification('❌ QRIS kadaluarsa', 'error');
        } else {
            showNotification('⏳ Masih menunggu pembayaran', 'info');
        }
    } catch (error) {
        console.error('Manual check error:', error);
        showNotification('Gagal cek status: ' + error.message, 'error');
    }
};

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

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    setOrigin();
    loadOrderItems();
    
    const searchInput = document.getElementById('search-destination');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            if (query.length >= 3) {
                // searchDestination(query);
            }
        });
    }
    
    document.getElementById('order-form')?.addEventListener('submit', submitOrder);
});

// ============================================
// EKSPOR GLOBAL FUNCTIONS
// ============================================
window.loadOrderItems = loadOrderItems;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.submitOrder = submitOrder;
window.updateOrderBadge = updateOrderBadge;
window.addToOrder = addToOrder;
window.manualCheckPayment = manualCheckPayment;
