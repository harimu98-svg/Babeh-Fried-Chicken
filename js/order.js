// js/order.js
// ============================================
// KONFIGURASI API
// ============================================
const API_BASE_URL = '/.netlify/functions/rajaongkir';
const ORIGIN_SUBDISTRICT_ID = '26017'; // CURUG, DEPOK
const ORIGIN_NAME = 'Curug, Depok, Jawa Barat';

// ============================================
// KONFIGURASI WAHA WHATSAPP API
// ============================================
const WAHA_API_URL = 'https://waha-yetv8qi4e3zk.anakit.sumopod.my.id/api/sendText';
const WAHA_API_KEY = 'sfcoGbpdLDkGZhKw2rx8sbb14vf4d8V6';
const WAHA_ADMIN_GROUP = '6282121266056@c.us';

let searchTimeout;
let paymentPollingInterval = null;
let timerInterval = null;
let timerRemaining = 600; // 10 menit dalam detik

// ============================================
// FUNGSI SEND WHATSAPP VIA WAHA
// ============================================
async function sendWhatsAppWAHA(phoneNumber, message) {
    try {
        if (!phoneNumber) return false;
        
        let formattedPhone = phoneNumber.trim();
        if (!formattedPhone.includes('@c.us') && !formattedPhone.includes('@g.us')) {
            formattedPhone = formattedPhone.replace(/^0/, '62').replace(/^\+62/, '62').replace(/[^0-9]/g, '');
            formattedPhone += '@c.us';
        }
        
        console.log(`📱 Sending WA to: ${formattedPhone}`);
        
        const response = await fetch(WAHA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': WAHA_API_KEY
            },
            body: JSON.stringify({
                session: 'Session1',
                chatId: formattedPhone,
                text: message
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WAHA API error: ${response.status} - ${errorText}`);
        }
        
        console.log(`✅ WhatsApp notification sent to: ${phoneNumber}`);
        return true;
        
    } catch (error) {
        console.error('❌ WhatsApp notification error:', error);
        return false;
    }
}

// ============================================
// SEND NOTIFICATIONS
// ============================================
async function sendCustomerNotification(orderData) {
    const message = `*🍗 Babeh Fried Chicken - Pesanan Berhasil!*

Halo *${orderData.customer_name}*,

Pesanan Anda telah kami terima dengan detail:

📋 *No. Pesanan:* ${orderData.order_number}
📅 *Tanggal:* ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
🕐 *Jam:* ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}

*📦 Detail Pesanan:*
${orderData.items.map(item => 
    `- ${item.name} x${item.quantity} = Rp ${formatRupiah(item.price * item.quantity)} (${item.weight || 250}g)`
).join('\n')}

📊 *Ringkasan:*
• Berat Total: ${orderData.total_berat}g
• Subtotal: Rp ${formatRupiah(orderData.subtotal)}
• Ongkir: Rp ${formatRupiah(orderData.shipping_cost)}
• *Total: Rp ${formatRupiah(orderData.total)}*

📍 *Alamat Pengiriman:*
${orderData.customer_address}

📌 *Status:* Menunggu Pembayaran

*📱 Cara Bayar:*
Scan QRIS di bawah ini dan transfer sesuai total pesanan.
Pesanan akan otomatis dibatalkan jika tidak dibayar dalam 10 menit.

Terima kasih sudah order di Babeh Fried Chicken! 🍗

_*Babeh Fried Chicken - Rasa Ayam yang Bikin Nagih!*_`;

    await sendWhatsAppWAHA(orderData.customer_phone, message);
}

async function sendAdminNotification(orderData) {
    const message = `*📢 PESANAN BARU Babeh Fried Chicken!*

Pesanan baru masuk:

📋 *No. Pesanan:* ${orderData.order_number}
👤 *Customer:* ${orderData.customer_name}
📱 *WA:* ${orderData.customer_phone}
📍 *Alamat:* ${orderData.customer_address}

*📦 Detail Pesanan:*
${orderData.items.map(item => 
    `- ${item.name} x${item.quantity} = Rp ${formatRupiah(item.price * item.quantity)} (${item.weight || 250}g)`
).join('\n')}

📊 *Total: Rp ${formatRupiah(orderData.total)}*

💳 *Metode:* QRIS
📌 *Status:* Menunggu Pembayaran

Mohon segera proses pesanan ini. Terima kasih! 🙌`;

    await sendWhatsAppWAHA(WAHA_ADMIN_GROUP, message);
}

async function sendPaymentSuccessNotification(orderData) {
    const customerMessage = `*✅ PEMBAYARAN BERHASIL! Babeh Fried Chicken*

Halo *${orderData.customer_name}*,

Pembayaran untuk pesanan *${orderData.order_number}* telah berhasil!

📋 *Ringkasan Pesanan:*
${orderData.items.map(item => 
    `- ${item.name} x${item.quantity} = Rp ${formatRupiah(item.price * item.quantity)}`
).join('\n')}

💰 *Total: Rp ${formatRupiah(orderData.total)}*

📌 *Status:* Menunggu Verifikasi Pembayaran

*🍗 Admin akan segera menghubungi Anda untuk konfirmasi!*

Terima kasih sudah order di Babeh Fried Chicken! 🙏

_*Babeh Fried Chicken - Rasa Ayam yang Bikin Nagih!*_`;

    await sendWhatsAppWAHA(orderData.customer_phone, customerMessage);

    const adminMessage = `*📢 KONFIRMASI PEMBAYARAN!*

Pesanan *${orderData.order_number}* oleh *${orderData.customer_name}*.

💰 Total: Rp ${formatRupiah(orderData.total)}
📌 Status: Menunggu Verifikasi Pembayaran

Customer mengkonfirmasi telah melakukan pembayaran.
Mohon segera verifikasi. 🚀`;

    await sendWhatsAppWAHA(WAHA_ADMIN_GROUP, adminMessage);
}

async function sendOrderCancelledNotification(orderData) {
    const message = `*⏰ PESANAN DIBATALKAN!*

Pesanan *${orderData.order_number}* oleh *${orderData.customer_name}* telah dibatalkan otomatis karena melewati batas waktu pembayaran 10 menit.

💰 Total: Rp ${formatRupiah(orderData.total)}
📌 Status: ❌ Dibatalkan Otomatis

Silakan hubungi customer jika diperlukan.`;

    await sendWhatsAppWAHA(WAHA_ADMIN_GROUP, message);
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
                    <span class="item-weight"><i class="fas fa-weight"></i> ${weight}g}</span>
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
// ADD TO ORDER
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
// SEARCH DESTINATION
// ============================================
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

// ============================================
// CALCULATE SHIPPING
// ============================================
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
// 🔥 QRIS STATIS - PAKAI GAMBAR
// ============================================

// Toast notification
function showToastNotification(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        z-index: 99999;
        font-weight: 500;
        font-size: 0.95rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideDown 0.3s ease-out;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: ${type === 'warning' ? '#333' : 'white'};
    `;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showQRISPaymentModal(orderData) {
    const modal = createQRISModal();
    const content = document.getElementById('qris-modal-content');
    if (!content) return;

    // Reset timer
    timerRemaining = 600;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Toast notification
    showToastNotification('📱 Menampilkan Kode QRIS', 'info', 2000);

    content.innerHTML = `
        <div style="position:relative; text-align:center; padding:10px 0;">
            <h3 style="color:#dc3545; margin-bottom:15px;">
                <i class="fas fa-qrcode"></i> Scan QRIS untuk Membayar
            </h3>
            <p>No. Pesanan: <strong>${orderData.order_number}</strong></p>
            <p style="font-size:1.2rem; margin:10px 0;">
                Total: <strong style="color:#dc3545;">Rp ${formatRupiah(orderData.total)}</strong>
            </p>
            <div id="qris-container" style="margin:20px auto; padding:15px; background:#f8f9fa; border-radius:10px; max-width:300px; min-height:200px; display:flex; align-items:center; justify-content:center;">
                <img src="images/qris.jpg" alt="QRIS Payment" 
                     style="max-width:100%; border-radius:8px;"
                     onerror="this.style.display='none'; document.getElementById('qris-error').style.display='block';">
                <div id="qris-error" style="display:none; color:#dc3545; padding:10px;">
                    <i class="fas fa-exclamation-circle"></i> Gambar QRIS tidak ditemukan
                    <br>
                    <small>Pastikan file images/qris.jpg ada</small>
                </div>
            </div>
            <div style="margin:15px 0; padding:10px; background:#fff3cd; border-radius:8px; color:#856404; font-size:0.9rem;">
                <i class="fas fa-clock"></i> Segera lakukan pembayaran, jika <strong id="timer-display">10:00</strong> pesanan belum dibayar akan otomatis tercancel oleh sistem
            </div>
            <div id="qris-status" style="margin:10px 0; padding:10px; background:#fff3cd; border-radius:8px; color:#856404; font-size:0.9rem;">
                ⏳ Menunggu Pembayaran
            </div>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button onclick="cancelOrder('${orderData.order_number}')" style="padding:8px 20px; background:#6c757d; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.9rem;">
                    <i class="fas fa-times"></i> Batal
                </button>
                <button onclick="confirmPayment('${orderData.order_number}')" style="padding:8px 20px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.9rem;">
                    <i class="fas fa-check"></i> Saya Sudah Bayar
                </button>
            </div>
            <p style="font-size:0.75rem; color:#6c757d; margin-top:10px;">
                Setelah anda melakukan pembayaran, Admin kami akan menghubungi anda melalui WA
            </p>
        </div>
    `;

    modal.style.display = 'flex';
    
    // Start timer
    startTimer(orderData.order_number);
    
    // Start polling
    if (orderData.order_number) {
        startPaymentPolling(orderData.order_number);
    }
}

// ============================================
// TIMER FUNCTIONS
// ============================================
function startTimer(orderNumber) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    timerRemaining = 600;
    updateTimerDisplay();
    
    timerInterval = setInterval(async () => {
        timerRemaining--;
        updateTimerDisplay();
        
        if (timerRemaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            await cancelOrder(orderNumber);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        const minutes = Math.floor(timerRemaining / 60);
        const seconds = timerRemaining % 60;
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Warning when less than 2 minutes
        if (timerRemaining < 120) {
            timerDisplay.style.color = '#dc3545';
        } else {
            timerDisplay.style.color = '#856404';
        }
    }
}

// ============================================
// CANCEL ORDER
// ============================================
window.cancelOrder = async function(orderNumber) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    try {
        // Update status di Supabase
        const { error } = await window.supabaseClient
            .from('order_fried_chicken')
            .update({
                payment_status: 'Pembayaran Dibatalkan',
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('order_number', orderNumber);

        if (error) throw error;
        
        // Kirim notifikasi WA
        const { data: orderData } = await window.supabaseClient
            .from('order_fried_chicken')
            .select('*')
            .eq('order_number', orderNumber)
            .single();
            
        if (orderData) {
            await sendOrderCancelledNotification(orderData);
        }
        
        showToastNotification('❌ Pesanan dibatalkan', 'error');
        closeQRISModal();
        resetOrderData();
        
        // Refresh halaman
        setTimeout(() => window.location.reload(), 1500);
        
    } catch (error) {
        console.error('Cancel order error:', error);
        showToastNotification('Gagal membatalkan pesanan', 'error');
    }
};

// ============================================
// CONFIRM PAYMENT
// ============================================
window.confirmPayment = async function(orderNumber) {
    try {
        // Update status di Supabase
        const { data, error } = await window.supabaseClient
            .from('order_fried_chicken')
            .update({
                payment_status: 'Menunggu Verifikasi Pembayaran',
                updated_at: new Date().toISOString()
            })
            .eq('order_number', orderNumber)
            .select();

        if (error) throw error;
        
        if (data && data.length > 0) {
            await sendPaymentSuccessNotification(data[0]);
        }
        
        showToastNotification('✅ Pembayaran dikonfirmasi! Admin akan menghubungi Anda.', 'success', 4000);
        closeQRISModal();
        resetOrderData();
        
        // Tampilkan halaman sukses
        setTimeout(() => showSuccessPage(orderNumber), 1000);
        
    } catch (error) {
        console.error('Confirm payment error:', error);
        showToastNotification('Gagal konfirmasi pembayaran', 'error');
    }
};

// ============================================
// RESET ORDER DATA
// ============================================
function resetOrderData() {
    localStorage.removeItem('currentOrder');
    window.updateOrderBadge();
    loadOrderItems();
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
    if (paymentPollingInterval) {
        clearInterval(paymentPollingInterval);
        paymentPollingInterval = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============================================
// POLLING PAYMENT STATUS (DARI SUPABASE)
// ============================================
function startPaymentPolling(orderNumber) {
    if (paymentPollingInterval) {
        clearInterval(paymentPollingInterval);
        paymentPollingInterval = null;
    }
    
    let attempts = 0;
    const maxAttempts = 60;
    
    paymentPollingInterval = setInterval(async () => {
        attempts++;
        
        try {
            const { data, error } = await window.supabaseClient
                .from('order_fried_chicken')
                .select('payment_status')
                .eq('order_number', orderNumber)
                .single();

            if (error) throw error;
            
            const statusElement = document.getElementById('qris-status');
            
            if (data && data.payment_status === 'Pembayaran Berhasil') {
                clearInterval(paymentPollingInterval);
                paymentPollingInterval = null;
                
                if (statusElement) {
                    statusElement.innerHTML = '✅ Pembayaran Berhasil!';
                    statusElement.style.background = '#d4edda';
                    statusElement.style.color = '#155724';
                }
                
                showToastNotification('✅ Pembayaran berhasil!', 'success');
                setTimeout(() => { 
                    closeQRISModal(); 
                    showSuccessPage(orderNumber); 
                }, 1500);
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(paymentPollingInterval);
                paymentPollingInterval = null;
            }
            
        } catch (error) {
            console.error('❌ Polling error:', error);
        }
    }, 10000);
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
            <p>Admin akan segera menghubungi Anda melalui WhatsApp untuk verifikasi pembayaran.</p>
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

window.loadOrderItems = loadOrderItems;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.selectSearchResult = selectSearchResult;
window.calculateShippingWithSubdistrict = calculateShippingWithSubdistrict;
window.submitOrder = submitOrder;
window.updateOrderBadge = updateOrderBadge;
window.addToOrder = addToOrder;
window.cancelOrder = cancelOrder;
window.confirmPayment = confirmPayment;

// Tambahkan CSS untuk animasi toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes slideUp {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);
