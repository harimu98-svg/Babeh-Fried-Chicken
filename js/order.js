// js/order.js - VERSI FINAL

// ===== KONFIGURASI =====
const API_BASE_URL = '/.netlify/functions/rajaongkir';

// ===== LOAD PROVINCES =====
async function loadShippingCosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/province`);
        const data = await response.json();
        
        console.log('Province data:', data);
        
        // Cek apakah ada error dari function
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.rajaongkir && data.rajaongkir.status.code === 200) {
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
        } else {
            throw new Error('Gagal load provinsi');
        }
    } catch (error) {
        console.error('Error loading provinces:', error);
        showNotification('Gagal memuat data provinsi. Gunakan ongkir manual.', 'error');
        loadStaticProvinces();
    }
}

// ===== LOAD CITIES =====
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
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.rajaongkir && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('city-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kota</option>';
            data.rajaongkir.results.forEach(city => {
                const option = document.createElement('option');
                option.value = city.city_id;
                option.textContent = `${city.type} ${city.city_name}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading cities:', error);
        showNotification('Gagal memuat data kota', 'error');
    }
}

// ===== LOAD DISTRICTS =====
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
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.rajaongkir && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('district-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kecamatan</option>';
            data.rajaongkir.results.forEach(district => {
                const option = document.createElement('option');
                option.value = district.district_id;
                option.textContent = district.district_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading districts:', error);
        showNotification('Gagal memuat data kecamatan', 'error');
    }
}

// ===== CALCULATE SHIPPING =====
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
                origin: '501',
                destination: districtId,
                weight: totalWeight * 1000,
                courier: 'jne'
            })
        });
        
        const data = await response.json();
        
        console.log('Cost data:', data);
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.rajaongkir && data.rajaongkir.status.code === 200) {
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
        } else {
            throw new Error('Gagal hitung ongkir');
        }
    } catch (error) {
        console.error('Error calculating shipping:', error);
        const shippingCost = document.getElementById('shipping-cost');
        if (shippingCost) shippingCost.value = 0;
        showNotification('Gagal menghitung ongkir', 'error');
    }
}

// ===== UPDATE TOTAL =====
function updateTotal() {
    const subtotal = parseInt(document.getElementById('subtotal')?.value) || 0;
    const shipping = parseInt(document.getElementById('shipping-cost')?.value) || 0;
    const total = subtotal + shipping;
    const grandTotal = document.getElementById('grand-total');
    if (grandTotal) grandTotal.textContent = formatRupiah(total);
}

// ===== FORMAT RUPIAH =====
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

// ===== SHOW NOTIFICATION =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ===== FALLBACK: STATIC PROVINCES =====
function loadStaticProvinces() {
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
    if (!select) return;
    
    select.innerHTML = '<option value="">Pilih Provinsi</option>';
    staticProvinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province.id;
        option.textContent = province.name;
        select.appendChild(option);
    });
}

// ===== INISIALISASI =====
document.addEventListener('DOMContentLoaded', function() {
    // Load provinces
    loadShippingCosts();
    
    // Event listeners dengan null check
    const provinceSelect = document.getElementById('province-select');
    if (provinceSelect) {
        provinceSelect.addEventListener('change', function() {
            loadCities(this.value);
        });
    }
    
    const citySelect = document.getElementById('city-select');
    if (citySelect) {
        citySelect.addEventListener('change', function() {
            loadDistricts(this.value);
        });
    }
    
    const districtSelect = document.getElementById('district-select');
    if (districtSelect) {
        districtSelect.addEventListener('change', function() {
            calculateShipping();
        });
    }
});
