// js/order.js - VERSI FINAL

// ===== KONFIGURASI =====
const API_BASE_URL = '/.netlify/functions/rajaongkir';

// ============================================
// 1. LOAD PROVINCES
// ============================================
async function loadShippingCosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/provinces`);
        const data = await response.json();
        
        console.log('Province data:', data);
        
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('province-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Provinsi</option>';
            data.rajaongkir.results.forEach(province => {
                const option = document.createElement('option');
                option.value = province.province_id;
                option.textContent = province.province;
                select.appendChild(option);
            });
            console.log('✅ Provinces loaded successfully');
        } else {
            throw new Error('Gagal load provinsi');
        }
    } catch (error) {
        console.error('Error loading provinces:', error);
        showNotification('Gagal memuat data provinsi', 'error');
        loadStaticProvinces();
    }
}

// ============================================
// 2. LOAD CITIES
// ============================================
async function loadCities(provinceId) {
    if (!provinceId || provinceId === 'undefined') {
        resetSelect('city-select', 'Pilih Kota');
        resetSelect('district-select', 'Pilih Kecamatan');
        return;
    }

    try {
        setLoading('city-select', 'Memuat kota...');
        
        const response = await fetch(`${API_BASE_URL}/cities?province_id=${provinceId}`);
        const data = await response.json();
        
        console.log('City data:', data);
        
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('city-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kota</option>';
            select.disabled = false;
            
            if (data.rajaongkir.results && data.rajaongkir.results.length > 0) {
                data.rajaongkir.results.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city.city_id;
                    option.textContent = `${city.type} ${city.city_name}`;
                    select.appendChild(option);
                });
                console.log(`✅ ${data.rajaongkir.results.length} cities loaded`);
            } else {
                select.innerHTML = '<option value="">Tidak ada kota ditemukan</option>';
            }
        } else {
            throw new Error('Format response tidak dikenali');
        }
    } catch (error) {
        console.error('Error loading cities:', error);
        setError('city-select', 'Gagal memuat kota');
        showNotification('Gagal memuat data kota', 'error');
    }
}

// ============================================
// 3. LOAD SUBDISTRICTS
// ============================================
async function loadSubdistricts(cityId) {
    if (!cityId || cityId === 'undefined') {
        resetSelect('district-select', 'Pilih Kecamatan');
        return;
    }

    try {
        setLoading('district-select', 'Memuat kecamatan...');
        
        const response = await fetch(`${API_BASE_URL}/subdistricts?city_id=${cityId}`);
        const data = await response.json();
        
        console.log('Subdistrict data:', data);
        
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('district-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kecamatan</option>';
            select.disabled = false;
            
            if (data.rajaongkir.results && data.rajaongkir.results.length > 0) {
                data.rajaongkir.results.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.subdistrict_id;
                    option.textContent = item.subdistrict_name;
                    select.appendChild(option);
                });
                console.log(`✅ ${data.rajaongkir.results.length} subdistricts loaded`);
            } else {
                select.innerHTML = '<option value="">Tidak ada kecamatan ditemukan</option>';
            }
        } else {
            throw new Error('Format response tidak dikenali');
        }
    } catch (error) {
        console.error('Error loading subdistricts:', error);
        setError('district-select', 'Gagal memuat kecamatan');
        showNotification('Gagal memuat data kecamatan', 'error');
    }
}

// ============================================
// 4. CALCULATE SHIPPING
// ============================================
async function calculateShipping() {
    const subdistrictId = document.getElementById('district-select')?.value;
    if (!subdistrictId) {
        document.getElementById('shipping-cost').value = 0;
        document.getElementById('shipping-service').textContent = '';
        updateTotal();
        return;
    }

    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const totalWeight = order.items.reduce((sum, item) => sum + (1 * item.quantity), 0) || 1;

    try {
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
        
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const costs = data.rajaongkir.results[0].costs;
            if (costs && costs.length > 0) {
                const cheapest = costs.reduce((min, cost) => {
                    const price = cost.cost[0].value;
                    return price < min.cost[0].value ? cost : min;
                });
                
                document.getElementById('shipping-cost').value = cheapest.cost[0].value;
                document.getElementById('shipping-service').textContent = 
                    `${cheapest.service} - ${cheapest.description} (${cheapest.cost[0].etd} hari)`;
                updateTotal();
            }
        } else {
            throw new Error('Gagal menghitung ongkir');
        }
    } catch (error) {
        console.error('Error calculating shipping:', error);
        document.getElementById('shipping-cost').value = 0;
        showNotification('Gagal menghitung ongkir', 'error');
    }
}

// ============================================
// 5. HELPER FUNCTIONS
// ============================================
function resetSelect(id, placeholder) {
    const select = document.getElementById(id);
    if (select) {
        select.innerHTML = `<option value="">${placeholder}</option>`;
        select.disabled = true;
    }
}

function setLoading(id, text) {
    const select = document.getElementById(id);
    if (select) {
        select.innerHTML = `<option value="">${text}</option>`;
        select.disabled = true;
    }
}

function setError(id, text) {
    const select = document.getElementById(id);
    if (select) {
        select.innerHTML = `<option value="">${text}</option>`;
        select.disabled = true;
    }
}

function updateTotal() {
    const subtotal = parseInt(document.getElementById('subtotal')?.value) || 0;
    const shipping = parseInt(document.getElementById('shipping-cost')?.value) || 0;
    const total = subtotal + shipping;
    const grandTotal = document.getElementById('grand-total');
    if (grandTotal) grandTotal.textContent = formatRupiah(total);
}

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ============================================
// 6. STATIC PROVINCES (FALLBACK)
// ============================================
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

// ============================================
// 7. INISIALISASI
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadShippingCosts();
    
    document.getElementById('province-select')?.addEventListener('change', function() {
        loadCities(this.value);
    });
    
    document.getElementById('city-select')?.addEventListener('change', function() {
        loadSubdistricts(this.value);
    });
    
    document.getElementById('district-select')?.addEventListener('change', function() {
        calculateShipping();
    });
});
