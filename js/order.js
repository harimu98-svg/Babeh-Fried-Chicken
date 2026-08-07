// js/order.js - VERSI FINAL

// ===== KONFIGURASI =====
const API_BASE_URL = '/.netlify/functions/rajaongkir';

// ===== HARDCODE ORIGIN =====
const ORIGIN_SUBDISTRICT_ID = '26017'; // CURUG, DEPOK
const ORIGIN_NAME = 'Curug, Depok, Jawa Barat';

let originSubdistrictId = ORIGIN_SUBDISTRICT_ID;
let searchTimeout;

// ============================================
// SET ORIGIN
// ============================================
function setOrigin() {
    const originInfo = document.getElementById('origin-info');
    if (originInfo) {
        originInfo.textContent = `📍 Lokasi toko: ${ORIGIN_NAME}`;
    }
    console.log('✅ Origin set:', { id: ORIGIN_SUBDISTRICT_ID, name: ORIGIN_NAME });
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
        return;
    }

    let html = '';
    order.items.forEach(item => {
        html += `
            <div class="order-item">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">Rp ${formatRupiah(item.price)} x ${item.quantity}</span>
                    <span style="font-size:0.8rem; color:#6c757d; display:block;">
                        <i class="fas fa-weight"></i> ${item.weight}g
                    </span>
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

    // Update hidden fields
    document.getElementById('order-items-json').value = JSON.stringify(order.items);
    document.getElementById('subtotal').value = order.total;
    document.getElementById('total-berat').value = order.total_berat;
}

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
        order.total_berat = order.items.reduce((sum, i) => sum + (i.weight * i.quantity), 0);
        localStorage.setItem('currentOrder', JSON.stringify(order));
        loadOrderItems();
        window.updateOrderBadge();
    }
}

function removeItem(productId) {
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    order.items = order.items.filter(i => i.id !== productId);
    order.total = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    order.total_berat = order.items.reduce((sum, i) => sum + (i.weight * i.quantity), 0);
    localStorage.setItem('currentOrder', JSON.stringify(order));
    loadOrderItems();
    window.updateOrderBadge();
}

// ============================================
// SEARCH DESTINATION
// ============================================
async function searchDestination(query) {
    const resultsContainer = document.getElementById('search-results');
    
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
            const data = await response.json();
            
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

    try {
        document.getElementById('shipping-cost-display').textContent = 'Menghitung...';
        document.getElementById('shipping-service').textContent = '';
        document.getElementById('shipping-loader').style.display = 'block';
        document.getElementById('shipping-options').innerHTML = '<div style="color:#6c757d;">⏳ Menghitung ongkir...</div>';
        
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
        
        const data = await response.json();
        
        let costs = [];
        if (data.data?.results) {
            data.data.results.forEach(courierResult => {
                if (courierResult.costs) {
                    courierResult.costs.forEach(cost => {
                        costs.push({
                            courier: courierResult.code,
                            courier_name: courierResult.name,
                            service: cost.service,
                            description: cost.description,
                            price: cost.cost?.[0]?.value || 0,
                            etd: cost.cost?.[0]?.etd || '1-2'
                        });
                    });
                }
            });
        }
        
        if (costs.length > 0) {
            displayShippingOptions(costs);
            const cheapest = costs.reduce((min, cost) => cost.price < min.price ? cost : min);
            
            document.getElementById('shipping-cost').value = cheapest.price;
            document.getElementById('shipping-cost-display').textContent = `Rp ${formatRupiah(cheapest.price)}`;
            document.getElementById('shipping-service').textContent = 
                `${cheapest.courier_name} - ${cheapest.service} (${cheapest.etd} hari)`;
            document.getElementById('shipping-service').style.color = '#28a745';
            document.getElementById('shipping-loader').style.display = 'none';
            updateTotal();
        } else {
            throw new Error('Tidak ada pilihan ongkir');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        resetShippingDisplay();
        showNotification('Gagal menghitung ongkir: ' + error.message, 'error');
    }
}

function resetShippingDisplay() {
    document.getElementById('shipping-cost').value = 0;
    document.getElementById('shipping-cost-display').textContent = 'Rp 0';
    document.getElementById('shipping-service').textContent = '⚠️ Gagal menghitung ongkir';
    document.getElementById('shipping-service').style.color = '#dc3545';
    document.getElementById('shipping-loader').style.display = 'none';
    document.getElementById('shipping-options').innerHTML = '';
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
                <div class="option-item" style="display:flex; justify-content:space-between; padding:8px 5px; border-bottom:1px solid #f0f0f0; ${isCheapest ? 'background:#f8f9fa; border-radius:4px;' : ''}">
                    <span>
                        ${isCheapest ? '🏆 ' : ''}
                        <strong>${cost.courier_name}</strong>
                        <span style="color:#6c757d; font-size:0.85rem;">${cost.service}</span>
                    </span>
                    <span style="font-weight:bold; color:${isCheapest ? '#28a745' : '#333'};">
                        Rp ${formatRupiah(cost.price)}
                        <span style="font-size:0.75rem; color:#6c757d; font-weight:normal;">(${cost.etd} hari)</span>
                        ${isCheapest ? ' ✅' : ''}
                    </span>
                </div>
            `;
        }).join('')}
    `;
}

// ============================================
// SUBMIT ORDER
// ============================================
async function submitOrder(event) {
    event.preventDefault();
    
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": [], "total": 0, "total_berat": 0}');
    if (order.items.length === 0) {
        showNotification('Silakan tambahkan pesanan terlebih dahulu!', 'error');
        return;
    }

    const customerName = document.getElementById('customer-name').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    const customerAddress = document.getElementById('customer-address').value.trim();
    const notes = document.getElementById('order-notes').value.trim();
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'QRIS';
    const subdistrictId = document.getElementById('selected-subdistrict').value;
    const shippingCost = parseInt(document.getElementById('shipping-cost').value) || 0;

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
        total_berat: order.total_berat,
        shipping_subdistrict: subdistrictId,
        payment_method: paymentMethod,
        payment_status: 'Menunggu Verifikasi pembayaran',
        notes: notes,
        status: 'pending'
    };

    try {
        const { data, error } = await window.supabaseClient
            .from('order_fried_chicken')
            .insert([orderData])
            .select();

        if (error) throw error;

        sendWAOrderNotification(orderData);
        localStorage.removeItem('currentOrder');
        window.updateOrderBadge();
        showSuccessPage(orderNumber);
    } catch (error) {
        console.error('Error submitting order:', error);
        showNotification('Gagal membuat pesanan. Silakan coba lagi!', 'error');
    }
}

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

function sendWAOrderNotification(orderData) {
    const message = `*Pesanan Baru Babeh Fried Chicken!*%0A%0A` +
        `No. Pesanan: ${orderData.order_number}%0A` +
        `Nama: ${orderData.customer_name}%0A` +
        `Telepon: ${orderData.customer_phone}%0A` +
        `Alamat: ${orderData.customer_address}%0A%0A` +
        `*Detail Pesanan:*%0A` +
        orderData.items.map(item => 
            `- ${item.name} x${item.quantity} = Rp ${formatRupiah(item.price * item.quantity)} (${item.weight}g)`
        ).join('%0A') +
        `%0A%0ABerat Total: ${orderData.total_berat}g%0A` +
        `Subtotal: Rp ${formatRupiah(orderData.subtotal)}%0A` +
        `Ongkir: Rp ${formatRupiah(orderData.shipping_cost)}%0A` +
        `*Total: Rp ${formatRupiah(orderData.total)}*%0A%0A` +
        `Metode Pembayaran: ${orderData.payment_method}`;

    window.open(`https://wa.me/6282121266056?text=${message}`, '_blank');
}

function showSuccessPage(orderNumber) {
    const container = document.getElementById('order-form-container');
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

function updateTotal() {
    const subtotal = parseInt(document.getElementById('subtotal')?.value) || 0;
    const shipping = parseInt(document.getElementById('shipping-cost')?.value) || 0;
    const total = subtotal + shipping;
    document.getElementById('order-total').textContent = `Rp ${formatRupiah(total)}`;
    
    const paymentTotal = document.getElementById('payment-total');
    if (paymentTotal) paymentTotal.textContent = `Rp ${formatRupiah(total)}`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function toggleShippingMethod() {
    const method = document.getElementById('shipping-method').value;
    document.getElementById('step-method').style.display = method === 'step' ? 'block' : 'none';
    document.getElementById('search-method').style.display = method === 'search' ? 'block' : 'none';
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing order page...');
    
    setOrigin();
    loadOrderItems();
    
    document.getElementById('shipping-method').value = 'search';
    toggleShippingMethod();
    
    // Search input
    const searchInput = document.getElementById('search-destination');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchDestination(e.target.value.trim());
        });
    }
    
    // Close results on click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#search-destination') && !e.target.closest('#search-results')) {
            document.getElementById('search-results').classList.remove('show');
        }
    });
    
    // Courier change
    document.getElementById('courier-select')?.addEventListener('change', function() {
        const subdistrictId = document.getElementById('selected-subdistrict')?.value;
        if (subdistrictId) calculateShippingWithSubdistrict(subdistrictId);
    });
    
    // Form submit
    document.getElementById('order-form').addEventListener('submit', submitOrder);
    
    console.log('✅ Order page initialized');
});

// ============================================
// GLOBAL FUNCTIONS UNTUK HTML
// ============================================
window.loadOrderItems = loadOrderItems;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.selectSearchResult = selectSearchResult;
window.toggleShippingMethod = toggleShippingMethod;
window.calculateShippingWithSubdistrict = calculateShippingWithSubdistrict;
window.submitOrder = submitOrder;
