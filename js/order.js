// js/order.js - PERBAIKI PARSING RESPONSE

// ===== HARDCODE ORIGIN =====
// Ganti dengan subdistrict_id yang sesuai dengan toko Anda
const ORIGIN_SUBDISTRICT_ID = '31555'; // Ganti!
const ORIGIN_NAME = 'Bojongsari, Depok, Jawa Barat';

// ============================================
// SEARCH DESTINATION
// ============================================
let searchTimeout;

async function searchDestination(query) {
    const resultsContainer = document.getElementById('search-results');
    
    if (!query || query.length < 3) {
        resultsContainer.classList.remove('show');
        return;
    }
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            resultsContainer.innerHTML = '<div class="search-loading">🔍 Mencari...</div>';
            resultsContainer.classList.add('show');
            
            const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=20`);
            const data = await response.json();
            
            console.log('📦 Search response:', data);
            
            // Cek struktur response dari RajaOngkir
            let results = [];
            if (data.data && Array.isArray(data.data)) {
                results = data.data;
            } else if (data.rajaongkir?.results && Array.isArray(data.rajaongkir.results)) {
                results = data.rajaongkir.results;
            }
            
            if (results.length > 0) {
                resultsContainer.innerHTML = results.map(item => {
                    const id = item.subdistrict_id || item.id;
                    const name = item.subdistrict_name || item.name || 'Kecamatan';
                    const city = item.city_name || item.city || 'Kota';
                    const province = item.province || 'Provinsi';
                    
                    return `
                        <div class="search-result-item" onclick="selectSearchResult('${id}', '${name}', '${city}', '${province}')">
                            <span class="result-name">${name}</span>
                            <span class="result-location">${city}, ${province}</span>
                            <span class="result-badge">ID: ${id}</span>
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
    document.getElementById('search-results').classList.remove('show');
    document.getElementById('search-destination').value = name;
    
    const selectedLocation = document.getElementById('selected-location');
    document.getElementById('selected-location-text').textContent = 
        `${name}, ${city}, ${province}`;
    document.getElementById('selected-subdistrict').value = id;
    selectedLocation.classList.add('show');
    
    // Hitung ongkir
    calculateShippingWithSubdistrict(id);
}

// ============================================
// CALCULATE SHIPPING
// ============================================
async function calculateShippingWithSubdistrict(subdistrictId) {
    if (!subdistrictId) {
        document.getElementById('shipping-cost').value = 0;
        document.getElementById('shipping-cost-display').textContent = 'Rp 0';
        document.getElementById('shipping-service').textContent = '';
        return;
    }

    // Ambil kurir dari dropdown
    const courierSelect = document.getElementById('courier-select');
    const courier = courierSelect ? courierSelect.value : 'jne';

    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const totalWeight = order.items.reduce((sum, item) => sum + (1 * item.quantity), 0) || 1;

    try {
        document.getElementById('shipping-cost-display').textContent = 'Menghitung...';
        document.getElementById('shipping-service').textContent = '';
        document.getElementById('shipping-loader').style.display = 'block';
        document.getElementById('shipping-options').innerHTML = '<div style="color:#6c757d;">⏳ Menghitung ongkir...</div>';
        
        console.log('🔄 Calculating shipping...');
        console.log('📌 Origin:', ORIGIN_SUBDISTRICT_ID);
        console.log('📌 Destination:', subdistrictId);
        console.log('📌 Weight:', totalWeight * 1000, 'gram');
        console.log('📌 Courier:', courier);
        
        // Build form-urlencoded body (sesuai collection)
        const formData = new URLSearchParams();
        formData.append('origin', ORIGIN_SUBDISTRICT_ID);
        formData.append('destination', subdistrictId);
        formData.append('weight', (totalWeight * 1000).toString());
        formData.append('courier', courier);
        formData.append('price', 'lowest');
        
        console.log('📦 Form data:', formData.toString());
        
        const response = await fetch(`${API_BASE_URL}/cost`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });
        
        const data = await response.json();
        
        console.log('📦 Cost response:', data);
        
        if (data.error) {
            throw new Error(data.error + (data.details ? `: ${data.details}` : ''));
        }
        
        // Parse response sesuai struktur dari collection
        // Response structure: { meta: {...}, data: { results: [...] } }
        let costs = [];
        if (data.data && data.data.results) {
            // Format dari RajaOngkir
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
        } else if (data.rajaongkir?.results) {
            // Fallback format lain
            data.rajaongkir.results.forEach(courierResult => {
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
        
        console.log('📊 Parsed costs:', costs);
        
        if (costs.length > 0) {
            // Tampilkan semua pilihan ongkir
            displayShippingOptions(costs);
            
            // Ambil yang termurah
            const cheapest = costs.reduce((min, cost) => 
                cost.price < min.price ? cost : min
            );
            
            document.getElementById('shipping-cost').value = cheapest.price;
            document.getElementById('shipping-cost-display').textContent = `Rp ${formatRupiah(cheapest.price)}`;
            document.getElementById('shipping-service').textContent = 
                `${cheapest.courier_name} - ${cheapest.service} (${cheapest.etd} hari)`;
            document.getElementById('shipping-service').style.color = '#28a745';
            document.getElementById('shipping-loader').style.display = 'none';
            updateTotal();
            
            showNotification(`✅ Ongkir: Rp ${formatRupiah(cheapest.price)}`, 'success');
        } else {
            throw new Error('Tidak ada pilihan ongkir');
        }
    } catch (error) {
        console.error('❌ Error calculating shipping:', error);
        document.getElementById('shipping-cost').value = 0;
        document.getElementById('shipping-cost-display').textContent = 'Rp 0';
        document.getElementById('shipping-service').textContent = '⚠️ Gagal menghitung ongkir';
        document.getElementById('shipping-service').style.color = '#dc3545';
        document.getElementById('shipping-loader').style.display = 'none';
        document.getElementById('shipping-options').innerHTML = 
            `<div style="color:#dc3545;">❌ ${error.message}</div>`;
        showNotification('Gagal menghitung ongkir: ' + error.message, 'error');
    }
}

// ============================================
// TAMPILKAN SEMUA PILIHAN ONGKIR
// ============================================
function displayShippingOptions(costs) {
    const container = document.getElementById('shipping-options');
    if (!container) return;
    
    if (!costs || costs.length === 0) {
        container.innerHTML = '<div style="color:#6c757d;">Tidak ada pilihan ongkir</div>';
        return;
    }
    
    // Sort by price
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
                        <span style="color:#6c757d; font-size:0.8rem;">${cost.description}</span>
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
// REKALKULASI SAAT KURIR DIGANTI
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Event listener untuk perubahan kurir
    const courierSelect = document.getElementById('courier-select');
    if (courierSelect) {
        courierSelect.addEventListener('change', function() {
            const subdistrictId = document.getElementById('selected-subdistrict')?.value;
            if (subdistrictId) {
                calculateShippingWithSubdistrict(subdistrictId);
            }
        });
    }
});
