// js/order.js - UPDATE DENGAN ENDPOINT YANG BENAR

// ===== KONFIGURASI =====
const API_BASE_URL = '/.netlify/functions/rajaongkir';

// ===== LOAD PROVINCES =====
async function loadShippingCosts() {
    try {
        // Gunakan endpoint provinces yang baru
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

// ===== LOAD CITIES =====
async function loadCities(provinceId) {
    if (!provinceId || provinceId === 'undefined' || provinceId === '') {
        const citySelect = document.getElementById('city-select');
        if (citySelect) {
            citySelect.innerHTML = '<option value="">Pilih Kota</option>';
            citySelect.disabled = true;
        }
        return;
    }

    try {
        const citySelect = document.getElementById('city-select');
        if (citySelect) {
            citySelect.disabled = false;
            citySelect.innerHTML = '<option value="">Memuat kota...</option>';
        }
        
        // Gunakan endpoint cities dengan province_id
        const response = await fetch(`${API_BASE_URL}/cities?province_id=${provinceId}`);
        const data = await response.json();
        
        console.log('City data:', data);
        
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('city-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kota</option>';
            if (data.rajaongkir.results && data.rajaongkir.results.length > 0) {
                // Group by city (remove duplicates)
                const cityMap = new Map();
                data.rajaongkir.results.forEach(item => {
                    if (!cityMap.has(item.city_id)) {
                        cityMap.set(item.city_id, {
                            city_id: item.city_id,
                            city_name: item.city_name,
                            type: item.type
                        });
                    }
                });
                
                const uniqueCities = Array.from(cityMap.values());
                uniqueCities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city.city_id;
                    option.textContent = `${city.type} ${city.city_name}`;
                    select.appendChild(option);
                });
                console.log(`✅ ${uniqueCities.length} cities loaded`);
            } else {
                select.innerHTML = '<option value="">Tidak ada kota ditemukan</option>';
            }
        } else {
            throw new Error('Format response tidak dikenali');
        }
    } catch (error) {
        console.error('Error loading cities:', error);
        const select = document.getElementById('city-select');
        if (select) {
            select.innerHTML = '<option value="">Gagal memuat kota</option>';
            select.disabled = true;
        }
        showNotification('Gagal memuat data kota', 'error');
    }
}

// ===== LOAD SUBDISTRICTS =====
async function loadSubdistricts(cityId) {
    if (!cityId || cityId === 'undefined' || cityId === '') {
        const districtSelect = document.getElementById('district-select');
        if (districtSelect) {
            districtSelect.innerHTML = '<option value="">Pilih Kecamatan</option>';
            districtSelect.disabled = true;
        }
        return;
    }

    try {
        const districtSelect = document.getElementById('district-select');
        if (districtSelect) {
            districtSelect.disabled = false;
            districtSelect.innerHTML = '<option value="">Memuat kecamatan...</option>';
        }
        
        // Gunakan endpoint subdistricts dengan city_id
        const response = await fetch(`${API_BASE_URL}/subdistricts?city_id=${cityId}`);
        const data = await response.json();
        
        console.log('Subdistrict data:', data);
        
        if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('district-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kecamatan</option>';
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
        const select = document.getElementById('district-select');
        if (select) {
            select.innerHTML = '<option value="">Gagal memuat kecamatan</option>';
            select.disabled = true;
        }
        showNotification('Gagal memuat data kecamatan', 'error');
    }
}

// ===== CALCULATE SHIPPING =====
async function calculateShipping() {
    const subdistrictId = document.getElementById('district-select')?.value;
    if (!subdistrictId) {
        const shippingCost = document.getElementById('shipping-cost');
        if (shippingCost) shippingCost.value = 0;
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
                origin: '501', // Jakarta Pusat (subdistrict_id)
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
