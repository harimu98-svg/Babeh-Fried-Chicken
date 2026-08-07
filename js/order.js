// js/order.js - VERSI DENGAN DIRECT SEARCH METHOD

// ===== KONFIGURASI =====
const API_BASE_URL = '/.netlify/functions/rajaongkir';

// ============================================
// 1. DIRECT SEARCH FUNCTION
// ============================================
let searchTimeout;

async function searchDestination(query) {
    const resultsContainer = document.getElementById('search-results');
    
    if (!query || query.length < 3) {
        resultsContainer.classList.remove('show');
        return;
    }
    
    // Debounce
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            resultsContainer.innerHTML = '<div class="search-loading">Mencari...</div>';
            resultsContainer.classList.add('show');
            
            const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=20`);
            const data = await response.json();
            
            console.log('Search results:', data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
                const results = data.rajaongkir.results || [];
                
                if (results.length > 0) {
                    resultsContainer.innerHTML = results.map(item => `
                        <div class="search-result-item" onclick="selectSearchResult('${item.subdistrict_id}', '${item.subdistrict_name}', '${item.city_name}', '${item.province}')">
                            <span class="result-name">${item.subdistrict_name}</span>
                            <span class="result-location">${item.city_name}, ${item.province}</span>
                            <span class="result-badge">${item.type || 'Kecamatan'}</span>
                        </div>
                    `).join('');
                    resultsContainer.classList.add('show');
                } else {
                    resultsContainer.innerHTML = '<div class="search-no-results">Tidak ditemukan</div>';
                    resultsContainer.classList.add('show');
                }
            } else {
                throw new Error('Format response tidak dikenali');
            }
        } catch (error) {
            console.error('❌ Search error:', error);
            resultsContainer.innerHTML = `<div class="search-no-results" style="color:#dc3545;">Gagal mencari: ${error.message}</div>`;
            resultsContainer.classList.add('show');
        }
    }, 500);
}

// ============================================
// 2. SELECT SEARCH RESULT
// ============================================
function selectSearchResult(subdistrictId, subdistrictName, cityName, province) {
    // Sembunyikan hasil
    document.getElementById('search-results').classList.remove('show');
    
    // Set input value
    document.getElementById('search-destination').value = subdistrictName;
    
    // Tampilkan lokasi terpilih
    const selectedLocation = document.getElementById('selected-location');
    document.getElementById('selected-location-text').textContent = 
        `${subdistrictName}, ${cityName}, ${province}`;
    document.getElementById('selected-subdistrict').value = subdistrictId;
    selectedLocation.classList.add('show');
    
    // Hitung ongkir
    calculateShippingWithSubdistrict(subdistrictId);
}

// ============================================
// 3. CALCULATE SHIPPING WITH SUBDISTRICT
// ============================================
async function calculateShippingWithSubdistrict(subdistrictId) {
    if (!subdistrictId) {
        document.getElementById('shipping-cost').value = 0;
        document.getElementById('shipping-cost-display').textContent = 'Rp 0';
        document.getElementById('shipping-service').textContent = '';
        return;
    }

    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const totalWeight = order.items.reduce((sum, item) => sum + (1 * item.quantity), 0) || 1;

    try {
        // Tampilkan loading
        document.getElementById('shipping-cost-display').textContent = 'Menghitung...';
        document.getElementById('shipping-service').textContent = '';
        
        const response = await fetch(`${API_BASE_URL}/cost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin: '501', // Ganti dengan subdistrict_id toko Anda
                destination: subdistrictId,
                weight: totalWeight * 1000,
                courier: 'jne'
            })
        });
        
        const data = await response.json();
        
        console.log('Cost data:', data);
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const costs = data.rajaongkir.results[0].costs;
            if (costs && costs.length > 0) {
                const cheapest = costs.reduce((min, cost) => {
                    const price = cost.cost[0].value;
                    return price < min.cost[0].value ? cost : min;
                });
                
                const shippingCost = cheapest.cost[0].value;
                document.getElementById('shipping-cost').value = shippingCost;
                document.getElementById('shipping-cost-display').textContent = `Rp ${formatRupiah(shippingCost)}`;
                document.getElementById('shipping-service').textContent = 
                    `${cheapest.service} - ${cheapest.description} (${cheapest.cost[0].etd} hari)`;
                updateTotal();
            } else {
                throw new Error('Tidak ada pilihan ongkir');
            }
        } else {
            throw new Error('Gagal menghitung ongkir');
        }
    } catch (error) {
        console.error('❌ Error calculating shipping:', error);
        document.getElementById('shipping-cost').value = 0;
        document.getElementById('shipping-cost-display').textContent = 'Rp 0';
        document.getElementById('shipping-service').textContent = 'Gagal menghitung ongkir';
        showNotification('Gagal menghitung ongkir: ' + error.message, 'error');
    }
}

// ============================================
// 4. TOGGLE SHIPPING METHOD
// ============================================
function toggleShippingMethod() {
    const method = document.getElementById('shipping-method').value;
    const stepMethod = document.getElementById('step-method');
    const searchMethod = document.getElementById('search-method');
    
    if (method === 'step') {
        stepMethod.style.display = 'block';
        searchMethod.style.display = 'none';
        // Sembunyikan info bahwa step method tidak tersedia
        showNotification('Step-by-Step method tidak tersedia. Gunakan Direct Search.', 'info');
    } else {
        stepMethod.style.display = 'none';
        searchMethod.style.display = 'block';
    }
}

// ============================================
// 5. NOTIFICATION
// ============================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

// ============================================
// 6. FORMAT RUPIAH
// ============================================
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

// ============================================
// 7. UPDATE TOTAL
// ============================================
function updateTotal() {
    const subtotal = parseInt(document.getElementById('subtotal')?.value) || 0;
    const shipping = parseInt(document.getElementById('shipping-cost')?.value) || 0;
    const total = subtotal + shipping;
    document.getElementById('order-total').textContent = `Rp ${formatRupiah(total)}`;
    
    // Update payment total
    const paymentTotal = document.getElementById('payment-total');
    const paymentTotalTransfer = document.getElementById('payment-total-transfer');
    if (paymentTotal) paymentTotal.textContent = `Rp ${formatRupiah(total)}`;
    if (paymentTotalTransfer) paymentTotalTransfer.textContent = `Rp ${formatRupiah(total)}`;
}

// ============================================
// 8. INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing order page...');
    
    // Set default method ke search
    document.getElementById('shipping-method').value = 'search';
    toggleShippingMethod();
    
    // Event listener untuk search
    const searchInput = document.getElementById('search-destination');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchDestination(this.value);
        });
        
        // Close results on click outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#search-destination') && !e.target.closest('#search-results')) {
                document.getElementById('search-results').classList.remove('show');
            }
        });
        
        // Enter key untuk search
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchDestination(this.value);
            }
        });
    }
    
    // Load order items
    if (typeof loadOrderItems === 'function') {
        loadOrderItems();
    }
    
    console.log('✅ Order page initialized');
});
