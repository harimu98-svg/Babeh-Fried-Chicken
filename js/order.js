// js/order.js - FULL DENGAN QRISLY
const API_BASE_URL = '/.netlify/functions/rajaongkir';
const ORIGIN_SUBDISTRICT_ID = '26017'; // CURUG, DEPOK
const ORIGIN_NAME = 'Curug, Depok, Jawa Barat';

let searchTimeout;
let paymentPollingInterval = null;

// ============================================
// SET ORIGIN
// ============================================
function setOrigin() {
    const originInfo = document.getElementById('origin-info');
    if (originInfo) {
        originInfo.textContent = `📍 Lokasi toko: ${ORIGIN_NAME}`;
    }
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

    if (!container) return;

    order.total_berat = order.items.reduce((sum, item) => sum + ((item.weight || 250) * item.quantity), 0);
    order.total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (order.items.length === 0) {
        container.innerHTML = `
            <div class="empty-order">
                <i class="fas fa-shopping-cart fa-3x"></i>
                <p>Belum ada pesanan</p>
                <a href="#produk">Lihat Menu</a>
            </div>
        `;
        if (totalContainer) totalContainer.textContent = 'Rp 0';
        if (beratContainer) beratContainer.textContent = '0 g';
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
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span class="item-qty">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button class="remove-btn" onclick="removeItem(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    if (totalContainer) totalContainer.textContent = `Rp ${formatRupiah(order.total)}`;
    if (beratContainer) beratContainer.textContent = `${order.total_berat} g`;

    updateHiddenFields(order);
    updateTotal();
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
    console.log('➕ Adding:', { productId, productName, price, weight: itemWeight });
    
    let order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": [], "total": 0, "total_berat": 0}');
    
    const existingItem = order.items.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        order.items.push({
            id: productId,
            name: productName,
            price: price,
            weight: itemWeight,
            quantity: 1
        });
    }

    order.total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    order.total_berat = order.items.reduce((sum, item) => sum + ((item.weight || 250) * item.quantity), 0);
    
    localStorage.setItem('currentOrder', JSON.stringify(order));
    window.updateOrderBadge();
    loadOrderItems();
    showNotification(`✅ ${productName} ditambahkan!`, 'success');
};

// ============================================
// UPDATE QUANTITY
// ============================================
function updateQuantity(productId, change) {
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const item = order.items.find(i => i.id === productId);
    
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            order.items = order.items.filter(i => i.id !== productId);
        }
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
            resultsContainer.innerHTML = '<div class="search-loading">🔍 Mencari...</div>';
            resultsContainer.classList.add('show');
            
            const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=20`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📦 Search response:', data);
            
            let results = [];
            if (data.data && Array.isArray(data.data)) {
                results = data.data;
            } else if (data.rajaongkir?.results) {
                results = data.rajaongkir.results;
            }
            
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
                resultsContainer.innerHTML = '<div class="search-no-results">❌ Tidak ditemukan</div>';
                resultsContainer.classList.add('show');
            }
        } catch (error) {
            console.error('❌ Search error:', error);
            resultsContainer.innerHTML = `<div class="search-no-results" style="color:#dc3545;">❌ Gagal mencari</div>`;
            resultsContainer.classList.add('show');
        }
    }, 500);
}

// ============================================
// SELECT SEARCH RESULT
// ============================================
function selectSearchResult(id, name, city, province) {
    if (!id) {
        showNotification('❌ ID lokasi tidak ditemukan!', 'error');
        return;
    }
    
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
    if (!subdistrictId) {
        resetShippingDisplay();
        return;
    }

    const courierSelect = document.getElementById('courier-select');
    const courier = courierSelect ? courierSelect.value : 'jne';

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
        
        console.log('📤 Cost request:', formData.toString());
        
        const response = await fetch(`${API_BASE_URL}/cost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('📦 Full response:', JSON.stringify(data, null, 2));
        
        if (data.error) {
            throw new Error(data.error + (data.details ? `: ${data.details}` : ''));
        }
        
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
        
        console.log('📊 Parsed costs:', costs);
        
        if (costs.length > 0) {
            displayShippingOptions(costs);
            const cheapest = costs.reduce((min, cost) => cost.price < min.price ? cost : min);
            
            const shippingCost = document.getElementById('shipping-cost');
            if (shippingCost) shippingCost.value = cheapest.price;
            if (costDisplay) costDisplay.textContent = `Rp ${formatRupiah(cheapest.price)}`;
            if (serviceDisplay) {
                serviceDisplay.textContent = `${cheapest.courier_name} - ${cheapest.service} (${cheapest.etd})`;
                serviceDisplay.style.color = '#28a745';
            }
            if (loader) loader.style.display = 'none';
            updateTotal();
            showNotification(`✅ Ongkir: Rp ${formatRupiah(cheapest.price)}`, 'success');
        } else {
            throw new Error('Tidak ada pilihan ongkir');
        }
    } catch (error) {
        console.error('❌ Cost error:', error);
        if (costDisplay) costDisplay.textContent = 'Rp 0';
        if (serviceDisplay) {
            serviceDisplay.textContent = `⚠️ ${error.message}`;
            serviceDisplay.style.color = '#dc3545';
        }
        if (loader) loader.style.display = 'none';
        if (optionsContainer) {
            optionsContainer.innerHTML = `<div style="color:#dc3545;">❌ ${error.message}</div>`;
        }
        showNotification('Gagal menghitung ongkir', 'error');
    }
}

function resetShippingDisplay() {
    const shippingCost = document.getElementById('shipping-cost');
    const costDisplay = document.getElementById('shipping-cost-display');
    const serviceDisplay = document.getElementById('shipping-service');
    const loader = document.getElementById('shipping-loader');
    const optionsContainer = document.getElementById('shipping-options');
    
    if (shippingCost) shippingCost.value = 0;
    if (costDisplay) costDisplay.textContent = 'Rp 0';
    if (serviceDisplay) {
        serviceDisplay.textContent = '⚠️ Gagal menghitung ongkir';
        serviceDisplay.style.color = '#dc3545';
    }
    if (loader) loader.style.display = 'none';
    if (optionsContainer) optionsContainer.innerHTML = '';
}

function displayShippingOptions(costs) {
    const container = document.getElementById('shipping-options');
    if (!container) return;
    
    const sorted = [...costs].sort((a, b) => a.price - b.price);
    
    container.innerHTML = `
        <div style="font-size:0.85rem; color:#6c757d; margin-bottom:8px; font-weight:bold;">
            <i class="fas fa-truck"></i> Pilihan Ongkir:
        </div>
        ${sorted.map((cost, index) => {
            const isCheapest = index === 0;
            return `
                <div class="option-item ${isCheapest ? 'cheapest' : ''}" style="display:flex; justify-content:space-between; padding:8px 5px; border-bottom:1px solid #f0f0f0; ${isCheapest ? 'background:#f8f9fa; border-radius:4px;' : ''}">
                    <span>
                        ${isCheapest ? '🏆 ' : ''}
                        <strong>${cost.courier_name}</strong>
                        <span style="color:#6c757d; font-size:0.85rem;">${cost.service}</span>
                        ${cost.description ? `<span style="color:#6c757d; font-size:0.8rem; display:block;">${cost.description}</span>` : ''}
                    </span>
                    <span style="font-weight:bold; color:${isCheapest ? '#28a745' : '#333'};">
                        Rp ${formatRupiah(cost.price)}
                        <span style="font-size:0.75rem; color:#6c757d; font-weight:normal;">(${cost.etd})</span>
                        ${isCheapest ? ' ✅' : ''}
                    </span>
                </div>
            `;
        }).join('')}
    `;
}

// ============================================
// UPDATE TOTAL
// ============================================
function updateTotal() {
    const subtotal = parseInt(document.getElementById('subtotal')?.value) || 0;
    const shipping = parseInt(document.getElementById('shipping-cost')?.value) || 0;
    const total = subtotal + shipping;
    
    const orderTotal = document.getElementById('order-total');
    if (orderTotal) orderTotal.textContent = `Rp ${formatRupiah(total)}`;
    
    const paymentTotal = document.getElementById('payment-total');
    if (paymentTotal) paymentTotal.textContent = `Rp ${formatRupiah(total)}`;
}

// ============================================
// GENERATE ORDER NUMBER
// ============================================
function generateOrderNumber() {
    const date = new Date();
    const timestamp = date.getFullYear() + 
        String(date.getMonth() + 1).padStart(2, '0') + 
        String(date.getDate()).padStart(2, '0') + 
        String(date.getHours()).padStart(2, '0') + 
        String(date.getMinutes()).padStart(2, '0') + 
        String(date.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BFC${timestamp}${random}`;
}

// ============================================
// 🔥 BARU: QRISLY PAYMENT FUNCTIONS
// ============================================

// 1. Generate QRIS via Netlify Function
async function generateQRISPayment(orderData) {
    try {
        console.log('🔄 Generating QRIS for order:', orderData.order_number);
        
        const response = await fetch('/.netlify/functions/qrisly-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: orderData.total,
                qris_id: window.QRISLY_CONFIG?.qrisId || 761,
                order_number: orderData.order_number
            })
        });

        const result = await response.json();
        console.log('📦 QRIS generate response:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Gagal generate QRIS');
        }

        return {
            historyId: result.history_id,
            qrImage: result.qr_image,
            expiredAt: result.expired_at
        };
    } catch (error) {
        console.error('❌ QRIS generate error:', error);
        throw error;
    }
}

// 2. Check Payment Status
async function checkPaymentStatus(historyId) {
    try {
        const response = await fetch(`/.netlify/functions/qrisly-status?history_id=${historyId}`);
        const result = await response.json();
        
        return {
            status: result.data?.status || 'unpaid',
            isPaid: result.data?.status === 'paid',
            isExpired: result.data?.status === 'expired'
        };
    } catch (error) {
        console.error('❌ Status check error:', error);
        return { status: 'unknown', isPaid: false, isExpired: false };
    }
}

// 3. Update Order Payment Status
async function updateOrderPaymentStatus(orderNumber, status) {
    try {
        const { error } = await window.supabaseClient
            .from('order_fried_chicken')
            .update({
                payment_status: status === 'paid' ? 'Pembayaran Berhasil' : 'Pembayaran Gagal',
                qrisly_status: status
            })
            .eq('order_number', orderNumber);
            
        if (error) throw error;
        console.log('✅ Order status updated:', orderNumber, status);
        return true;
    } catch (error) {
        console.error('❌ Error updating order:', error);
        return false;
    }
}

// 4. Tampilkan QRIS Modal
function createQRISModal() {
    // Cek apakah modal sudah ada
    let modal = document.getElementById('qris-modal');
    if (modal) return modal;
    
    modal = document.createElement('div');
    modal.id = 'qris-modal';
    modal.className = 'modal qris-modal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 9999;
        align-items: center;
        justify-content: center;
    `;
    modal.innerHTML = `
        <div class="qris-modal-content" style="
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        ">
            <!-- Content will be injected here -->
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeQRISModal();
        }
    });
    
    return modal;
}

function showQRISPaymentModal(orderData) {
    const modal = createQRISModal();
    const content = modal.querySelector('.qris-modal-content');
    
    const isQrisString = orderData.qrisly_qr_image && 
                         !orderData.qrisly_qr_image.startsWith('http') && 
                         !orderData.qrisly_qr_image.startsWith('data:image');
    
    content.innerHTML = `
        <h3 style="color:#dc3545; margin-bottom:15px;">
            <i class="fas fa-qrcode"></i> Scan QRIS untuk Membayar
        </h3>
        <p style="margin:5px 0;">No. Pesanan: <strong>${orderData.order_number}</strong></p>
        <p style="margin:5px 0; font-size:1.2rem;">
            Total: <strong style="color:#dc3545;">Rp ${formatRupiah(orderData.total)}</strong>
        </p>
        <div id="qris-container" style="margin:20px 0; padding:15px; background:#f8f9fa; border-radius:10px; display:flex; justify-content:center;">
            ${isQrisString ? 
                `<div id="qrcode" style="width:250px; height:250px;"></div>` :
                `<img src="${orderData.qrisly_qr_image}" style="max-width:100%; border-radius:8px;">`
            }
        </div>
        <p style="font-size:0.85rem; color:#6c757d;">
            ⏰ Kadaluarsa: ${orderData.qrisly_expired_at ? new Date(orderData.qrisly_expired_at).toLocaleString('id-ID') : '15 menit'}
        </p>
        <div id="qris-status" style="margin:15px 0; padding:10px; background:#fff3cd; border-radius:8px; color:#856404;">
            ⏳ Menunggu pembayaran...
        </div>
        <div style="display:flex; gap:10px; justify-content:center;">
            <button onclick="closeQRISModal()" class="btn btn-secondary" style="padding:8px 20px; background:#6c757d; color:white; border:none; border-radius:8px; cursor:pointer;">
                <i class="fas fa-times"></i> Tutup
            </button>
            <button onclick="manualCheckPayment('${orderData.order_number}')" class="btn btn-primary" style="padding:8px 20px; background:#dc3545; color:white; border:none; border-radius:8px; cursor:pointer;">
                <i class="fas fa-sync"></i> Cek Status
            </button>
        </div>
        <p style="font-size:0.75rem; color:#6c757d; margin-top:15px;">
            Pembayaran akan otomatis terverifikasi setelah transfer
        </p>
    `;
    
    modal.style.display = 'flex';
    
    // 🔥 Generate QR Code jika QRIS string
    if (isQrisString) {
        setTimeout(() => {
            const container = document.getElementById('qrcode');
            if (container && typeof QRCode !== 'undefined') {
                new QRCode(container, {
                    text: orderData.qrisly_qr_image,
                    width: 250,
                    height: 250,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
                console.log('✅ QR Code generated from QRIS string');
            } else {
                // Fallback ke Google Chart
                const fallbackImg = document.createElement('img');
                fallbackImg.src = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(orderData.qrisly_qr_image)}&chs=300x300&choe=UTF-8`;
                fallbackImg.style.cssText = 'max-width:100%; border-radius:8px;';
                const containerDiv = document.getElementById('qris-container');
                if (containerDiv) {
                    containerDiv.innerHTML = '';
                    containerDiv.appendChild(fallbackImg);
                }
            }
        }, 100);
    }
    
    if (orderData.qrisly_history_id) {
        startPaymentPolling(orderData.qrisly_history_id, orderData.order_number);
    }
}

function closeQRISModal() {
    const modal = document.getElementById('qris-modal');
    if (modal) modal.style.display = 'none';
    
    // Stop polling
    if (paymentPollingInterval) {
        clearInterval(paymentPollingInterval);
        paymentPollingInterval = null;
    }
}

// 5. Polling Status Payment
function startPaymentPolling(historyId, orderNumber) {
    // Stop polling lama jika ada
    if (paymentPollingInterval) {
        clearInterval(paymentPollingInterval);
        paymentPollingInterval = null;
    }
    
    let attempts = 0;
    const maxAttempts = 30; // 5 menit (30 x 10 detik)

    paymentPollingInterval = setInterval(async () => {
        attempts++;
        console.log(`🔄 Checking payment status (${attempts}/${maxAttempts})...`);
        
        const status = await checkPaymentStatus(historyId);
        console.log('📊 Status:', status);
        
        const statusElement = document.getElementById('qris-status');
        
        if (status.isPaid) {
            clearInterval(paymentPollingInterval);
            paymentPollingInterval = null;
            
            if (statusElement) {
                statusElement.innerHTML = '✅ Pembayaran Berhasil!';
                statusElement.style.background = '#d4edda';
                statusElement.style.color = '#155724';
            }
            
            // Update order di Supabase
            await updateOrderPaymentStatus(orderNumber, 'paid');
            
            showNotification('✅ Pembayaran berhasil!', 'success');
            
            setTimeout(() => {
                closeQRISModal();
                // Tampilkan halaman sukses
                showSuccessPage(orderNumber);
            }, 1500);
            
        } else if (status.isExpired) {
            clearInterval(paymentPollingInterval);
            paymentPollingInterval = null;
            
            if (statusElement) {
                statusElement.innerHTML = '❌ QRIS Kadaluarsa. Silakan pesan ulang.';
                statusElement.style.background = '#f8d7da';
                statusElement.style.color = '#721c24';
            }
            
            await updateOrderPaymentStatus(orderNumber, 'expired');
            showNotification('QRIS kadaluarsa. Silakan pesan ulang.', 'error');
        }
        
        if (attempts >= maxAttempts) {
            clearInterval(paymentPollingInterval);
            paymentPollingInterval = null;
            
            if (statusElement) {
                statusElement.innerHTML = '⏰ Waktu habis. Silakan cek status manual.';
                statusElement.style.background = '#f8d7da';
                statusElement.style.color = '#721c24';
            }
            showNotification('Waktu cek status habis. Cek manual.', 'info');
        }
    }, 10000); // 10 detik
}

// 6. Manual Check Payment
window.manualCheckPayment = async function(orderNumber) {
    showNotification('🔄 Mengecek status pembayaran...', 'info');
    
    try {
        // Ambil history_id dari database
        const { data, error } = await window.supabaseClient
            .from('order_fried_chicken')
            .select('qrisly_history_id')
            .eq('order_number', orderNumber)
            .single();
            
        if (error) throw error;
        
        if (data?.qrisly_history_id) {
            const status = await checkPaymentStatus(data.qrisly_history_id);
            
            if (status.isPaid) {
                await updateOrderPaymentStatus(orderNumber, 'paid');
                showNotification('✅ Pembayaran berhasil!', 'success');
                closeQRISModal();
                showSuccessPage(orderNumber);
            } else if (status.isExpired) {
                showNotification('❌ QRIS sudah kadaluarsa', 'error');
            } else {
                showNotification('⏳ Masih menunggu pembayaran...', 'info');
            }
        }
    } catch (error) {
        console.error('❌ Manual check error:', error);
        showNotification('Gagal cek status', 'error');
    }
};

// ============================================
// SUBMIT ORDER - DENGAN QRISLY
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
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'QRIS';
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
    
    // 🔥 Siapkan data order
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
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'QRIS' ? 'Menunggu Pembayaran' : 'Menunggu Verifikasi pembayaran',
        notes: notes || '',
        status: 'pending'
    };

    // 🔥 Jika QRIS, generate QRIS dinamis
    if (paymentMethod === 'QRIS') {
        try {
            showNotification('🔄 Menyiapkan QRIS...', 'info');
            const qrisResult = await generateQRISPayment(orderData);
            
            orderData.qrisly_history_id = qrisResult.historyId;
            orderData.qrisly_status = 'unpaid';
            orderData.qrisly_qr_image = qrisResult.qrImage;
            orderData.qrisly_expired_at = qrisResult.expiredAt;
            
            console.log('✅ QRIS generated:', qrisResult);
        } catch (error) {
            showNotification('Gagal generate QRIS: ' + error.message, 'error');
            return;
        }
    }

    console.log('📤 Final order data:', orderData);

    try {
        const { data, error } = await window.supabaseClient
            .from('order_fried_chicken')
            .insert([orderData])
            .select();

        if (error) {
            console.error('❌ Supabase Error:', error);
            let errorMessage = 'Gagal membuat pesanan: ';
            if (error.message?.includes('policy')) {
                errorMessage += 'Masalah keamanan database. Hubungi admin.';
            } else if (error.details) {
                errorMessage += error.details;
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            showNotification(errorMessage, 'error');
            return;
        }

        console.log('✅ Order created successfully:', data);
        
        sendWAOrderNotification(orderData);
        localStorage.removeItem('currentOrder');
        window.updateOrderBadge();
        
        // 🔥 Jika QRIS, tampilkan modal pembayaran
        if (paymentMethod === 'QRIS' && orderData.qrisly_qr_image) {
            showQRISPaymentModal(orderData);
        } else {
            showSuccessPage(orderNumber);
        }
        
    } catch (error) {
        console.error('❌ Exception:', error);
        showNotification('Gagal membuat pesanan: ' + error.message, 'error');
    }
}

// ============================================
// SEND WA NOTIFICATION
// ============================================
function sendWAOrderNotification(orderData) {
    const message = `*Pesanan Baru Babeh Fried Chicken!*%0A%0A` +
        `No. Pesanan: ${orderData.order_number}%0A` +
        `Nama: ${orderData.customer_name}%0A` +
        `Telepon: ${orderData.customer_phone}%0A` +
        `Alamat: ${orderData.customer_address}%0A%0A` +
        `*Detail Pesanan:*%0A` +
        orderData.items.map(item => 
            `- ${item.name} x${item.quantity} = Rp ${formatRupiah(item.price * item.quantity)} (${item.weight || 250}g)`
        ).join('%0A') +
        `%0A%0ABerat Total: ${orderData.total_berat}g%0A` +
        `Subtotal: Rp ${formatRupiah(orderData.subtotal)}%0A` +
        `Ongkir: Rp ${formatRupiah(orderData.shipping_cost)}%0A` +
        `*Total: Rp ${formatRupiah(orderData.total)}*%0A%0A` +
        `Metode Pembayaran: ${orderData.payment_method}`;

    window.open(`https://wa.me/6282121266056?text=${message}`, '_blank');
}

// ============================================
// SHOW SUCCESS PAGE
// ============================================
function showSuccessPage(orderNumber) {
    const container = document.getElementById('order-form-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="order-success">
            <i class="fas fa-check-circle fa-4x" style="color:#28a745;"></i>
            <h2>Pesanan Berhasil!</h2>
            <p>Nomor Pesanan: <strong>${orderNumber}</strong></p>
            <p>Silakan lakukan pembayaran melalui metode yang dipilih.</p>
            <p>Kami akan mengirimkan konfirmasi melalui WhatsApp.</p>
            <button onclick="window.location.reload()" class="btn btn-primary">
                <i class="fas fa-sync"></i> Pesan Lagi
            </button>
        </div>
    `;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

// ============================================
// UPDATE ORDER BADGE
// ============================================
window.updateOrderBadge = function() {
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const badge = document.getElementById('order-badge');
    if (badge) {
        const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
};

// ============================================
// TOGGLE SHIPPING METHOD
// ============================================
function toggleShippingMethod() {
    const searchMethod = document.getElementById('search-method');
    if (searchMethod) searchMethod.style.display = 'block';
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing order page...');
    
    setOrigin();
    loadOrderItems();
    
    // Search input
    const searchInput = document.getElementById('search-destination');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchDestination(e.target.value.trim());
        });
    }
    
    // Close search results
    document.addEventListener('click', function(e) {
        const results = document.getElementById('search-results');
        const input = document.getElementById('search-destination');
        if (results && input) {
            if (!e.target.closest('#search-destination') && !e.target.closest('#search-results')) {
                results.classList.remove('show');
            }
        }
    });
    
    // Courier change
    const courierSelect = document.getElementById('courier-select');
    if (courierSelect) {
        courierSelect.addEventListener('change', function() {
            const subdistrictId = document.getElementById('selected-subdistrict')?.value;
            if (subdistrictId) calculateShippingWithSubdistrict(subdistrictId);
        });
    }
    
    // Form submit
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', submitOrder);
    }
    
    toggleShippingMethod();
    
    console.log('✅ Order page initialized');
});

// ============================================
// GLOBAL FUNCTIONS
// ============================================
window.loadOrderItems = loadOrderItems;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.selectSearchResult = selectSearchResult;
window.calculateShippingWithSubdistrict = calculateShippingWithSubdistrict;
window.submitOrder = submitOrder;
window.updateOrderBadge = updateOrderBadge;
window.addToOrder = addToOrder;
