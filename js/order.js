// js/order.js - VERSI FINAL DENGAN SEMUA DEFINISI

// ============================================
// 1. KONFIGURASI API
// ============================================
// API_BASE_URL untuk Netlify Functions
const API_BASE_URL = '/.netlify/functions/rajaongkir';

// Atau jika pakai Binderbyte:
// const BINDERBYTE_API_KEY = 'YOUR_API_KEY';
// const BINDERBYTE_BASE_URL = 'https://api.binderbyte.com/v1';

// ============================================
// 2. FUNGSI LOAD PROVINCES
// ============================================
async function loadShippingCosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/province`);
        const data = await response.json();
        
        console.log('Province data:', data);
        
        // Cek format response dari Netlify Function
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('province-select');
            if (!select) {
                console.error('Element province-select not found');
                return;
            }
            
            select.innerHTML = '<option value="">Pilih Provinsi</option>';
            data.rajaongkir.results.forEach(province => {
                const option = document.createElement('option');
                option.value = province.province_id;
                option.textContent = province.province;
                select.appendChild(option);
            });
            console.log('✅ Provinces loaded successfully');
        } else if (data.data && Array.isArray(data.data)) {
            // Alternatif format response
            const select = document.getElementById('province-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Provinsi</option>';
            data.data.forEach(province => {
                const option = document.createElement('option');
                option.value = province.province_id;
                option.textContent = province.province;
                select.appendChild(option);
            });
            console.log('✅ Provinces loaded successfully (alternate format)');
        } else {
            throw new Error('Gagal load provinsi: format response tidak dikenali');
        }
    } catch (error) {
        console.error('Error loading provinces:', error);
        showNotification('Gagal memuat data provinsi. Gunakan ongkir manual.', 'error');
        loadStaticProvinces(); // Fallback ke data statis
    }
}

// ============================================
// 3. FUNGSI LOAD CITIES
// ============================================
async function loadCities(provinceId) {
    if (!provinceId) {
        const citySelect = document.getElementById('city-select');
        if (citySelect) citySelect.innerHTML = '<option value="">Pilih Kota</option>';
        const districtSelect = document.getElementById('district-select');
        if (districtSelect) districtSelect.innerHTML = '<option value="">Pilih Kecamatan</option>';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/city?province=${provinceId}`);
        const data = await response.json();
        
        console.log('City data:', data);
        
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('city-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kota</option>';
            data.rajaongkir.results.forEach(city => {
                const option = document.createElement('option');
                option.value = city.city_id;
                option.textContent = `${city.type} ${city.city_name}`;
                select.appendChild(option);
            });
        } else if (data.data && Array.isArray(data.data)) {
            const select = document.getElementById('city-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kota</option>';
            data.data.forEach(city => {
                const option = document.createElement('option');
                option.value = city.city_id;
                option.textContent = `${city.type} ${city.city_name}`;
                select.appendChild(option);
            });
        } else {
            throw new Error('Format response tidak dikenali');
        }
    } catch (error) {
        console.error('Error loading cities:', error);
        showNotification('Gagal memuat data kota', 'error');
    }
}

// ============================================
// 4. FUNGSI LOAD DISTRICTS
// ============================================
async function loadDistricts(cityId) {
    if (!cityId) {
        const districtSelect = document.getElementById('district-select');
        if (districtSelect) districtSelect.innerHTML = '<option value="">Pilih Kecamatan</option>';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/district?city=${cityId}`);
        const data = await response.json();
        
        console.log('District data:', data);
        
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('district-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kecamatan</option>';
            data.rajaongkir.results.forEach(district => {
                const option = document.createElement('option');
                option.value = district.district_id;
                option.textContent = district.district_name;
                select.appendChild(option);
            });
        } else if (data.data && Array.isArray(data.data)) {
            const select = document.getElementById('district-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kecamatan</option>';
            data.data.forEach(district => {
                const option = document.createElement('option');
                option.value = district.district_id;
                option.textContent = district.district_name;
                select.appendChild(option);
            });
        } else {
            throw new Error('Format response tidak dikenali');
        }
    } catch (error) {
        console.error('Error loading districts:', error);
        showNotification('Gagal memuat data kecamatan', 'error');
    }
}

// ============================================
// 5. FUNGSI CALCULATE SHIPPING
// ============================================
async function calculateShipping() {
    const districtId = document.getElementById('district-select')?.value;
    if (!districtId) {
        const shippingCost = document.getElementById('shipping-cost');
        if (shippingCost) shippingCost.value = 0;
        const shippingService = document.getElementById('shipping-service');
        if (shippingService) shippingService.textContent = '';
        updateTotal();
        return;
    }

    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const totalWeight = order.items.reduce((sum, item) => sum + (1 * item.quantity), 0) || 1;

    try {
        const response = await fetch(`${API_BASE_URL}/cost`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin: '501', // Jakarta Pusat
                destination: districtId,
                weight: totalWeight * 1000,
                courier: 'jne'
            })
        });
        
        const data = await response.json();
        
        console.log('Cost data:', data);
        
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const costs = data.rajaongkir.results[0].costs;
            if (costs && costs.length > 0) {
                const cheapest = costs.reduce((min, cost) => {
                    const price = cost.cost[0].value;
                    return price < min.cost[0].value ? cost : min;
                });
                
                const shippingCost = document.getElementById('shipping-cost');
                if (shippingCost) shippingCost.value = cheapest.cost[0].value;
                
                const shippingService = document.getElementById('shipping-service');
                if (shippingService) {
                    shippingService.textContent = 
                        `${cheapest.service} - ${cheapest.description} (${cheapest.cost[0].etd} hari)`;
                }
                updateTotal();
            }
        } else if (data.data && data.data.length > 0) {
            const costs = data.data[0].costs;
            if (costs && costs.length > 0) {
                const cheapest = costs.reduce((min, cost) => {
                    const price = cost.cost[0].value;
                    return price < min.cost[0].value ? cost : min;
                });
                
                const shippingCost = document.getElementById('shipping-cost');
                if (shippingCost) shippingCost.value = cheapest.cost[0].value;
                
                const shippingService = document.getElementById('shipping-service');
                if (shippingService) {
                    shippingService.textContent = 
                        `${cheapest.service} - ${cheapest.description} (${cheapest.cost[0].etd} hari)`;
                }
                updateTotal();
            }
        } else {
            throw new Error('Gagal menghitung ongkir');
        }
    } catch (error) {
        console.error('Error calculating shipping:', error);
        const shippingCost = document.getElementById('shipping-cost');
        if (shippingCost) shippingCost.value = 0;
        showNotification('Gagal menghitung ongkir', 'error');
    }
}

// ============================================
// 6. FUNGSI UPDATE TOTAL
// ============================================
function updateTotal() {
    const subtotal = parseInt(document.getElementById('subtotal')?.value) || 0;
    const shipping = parseInt(document.getElementById('shipping-cost')?.value) || 0;
    const total = subtotal + shipping;
    const grandTotal = document.getElementById('grand-total');
    if (grandTotal) grandTotal.textContent = formatRupiah(total);
}

// ============================================
// 7. FUNGSI FORMAT RUPIAH
// ============================================
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

// ============================================
// 8. FUNGSI NOTIFICATION
// ============================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ============================================
// 9. FUNGSI STATIC PROVINCES (FALLBACK)
// ============================================
function loadStaticProvinces() {
    console.log('Loading static provinces (fallback)');
    
    const staticProvinces = [
        { id: '1', name: 'Aceh' },
        { id: '2', name: 'Sumatera Utara' },
        { id: '3', name: 'Sumatera Barat' },
        { id: '4', name: 'Riau' },
        { id: '5', name: 'Kepulauan Riau' },
        { id: '6', name: 'Jambi' },
        { id: '7', name: 'Bengkulu' },
        { id: '8', name: 'Sumatera Selatan' },
        { id: '9', name: 'Kepulauan Bangka Belitung' },
        { id: '10', name: 'Lampung' },
        { id: '11', name: 'DKI Jakarta' },
        { id: '12', name: 'Jawa Barat' },
        { id: '13', name: 'Banten' },
        { id: '14', name: 'Jawa Tengah' },
        { id: '15', name: 'DI Yogyakarta' },
        { id: '16', name: 'Jawa Timur' },
        { id: '17', name: 'Bali' },
        { id: '18', name: 'Nusa Tenggara Barat' },
        { id: '19', name: 'Nusa Tenggara Timur' },
        { id: '20', name: 'Kalimantan Barat' },
        { id: '21', name: 'Kalimantan Tengah' },
        { id: '22', name: 'Kalimantan Selatan' },
        { id: '23', name: 'Kalimantan Timur' },
        { id: '24', name: 'Kalimantan Utara' },
        { id: '25', name: 'Sulawesi Utara' },
        { id: '26', name: 'Gorontalo' },
        { id: '27', name: 'Sulawesi Tengah' },
        { id: '28', name: 'Sulawesi Selatan' },
        { id: '29', name: 'Sulawesi Tenggara' },
        { id: '30', name: 'Sulawesi Barat' },
        { id: '31', name: 'Maluku' },
        { id: '32', name: 'Maluku Utara' },
        { id: '33', name: 'Papua' },
        { id: '34', name: 'Papua Barat' }
    ];

    const select = document.getElementById('province-select');
    if (!select) {
        console.error('Element province-select not found');
        return;
    }
    
    select.innerHTML = '<option value="">Pilih Provinsi</option>';
    staticProvinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province.id;
        option.textContent = province.name;
        select.appendChild(option);
    });
    console.log('✅ Static provinces loaded');
}

// ============================================
// 10. INISIALISASI
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing order page...');
    
    // Load provinces
    loadShippingCosts();
    
    // Event listeners dengan null check
    const provinceSelect = document.getElementById('province-select');
    if (provinceSelect) {
        provinceSelect.addEventListener('change', function() {
            loadCities(this.value);
        });
    } else {
        console.warn('Element province-select not found in DOM');
    }
    
    const citySelect = document.getElementById('city-select');
    if (citySelect) {
        citySelect.addEventListener('change', function() {
            loadDistricts(this.value);
        });
    } else {
        console.warn('Element city-select not found in DOM');
    }
    
    const districtSelect = document.getElementById('district-select');
    if (districtSelect) {
        districtSelect.addEventListener('change', function() {
            calculateShipping();
        });
    } else {
        console.warn('Element district-select not found in DOM');
    }
    
    console.log('✅ Order page initialized');
});
