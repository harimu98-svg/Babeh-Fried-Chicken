// js/order.js - FIX untuk response structure

// ===== LOAD PROVINCES =====
async function loadShippingCosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/province`);
        const data = await response.json();
        
        console.log('Province data:', data);
        
        // ✅ CEK STRUKTUR RESPONSE YANG BENAR
        // Netlify Function mengembalikan { meta: {...}, data: [...] }
        // BUKAN { rajaongkir: { status: {...}, results: [...] } }
        
        if (data.data && Array.isArray(data.data)) {
            const select = document.getElementById('province-select');
            if (!select) {
                console.error('Element province-select not found');
                return;
            }
            
            select.innerHTML = '<option value="">Pilih Provinsi</option>';
            data.data.forEach(province => {
                const option = document.createElement('option');
                option.value = province.province_id;
                option.textContent = province.province;
                select.appendChild(option);
            });
            
            console.log('✅ Provinces loaded successfully');
        } else if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            // Fallback: jika response dalam format RajaOngkir asli
            const select = document.getElementById('province-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Provinsi</option>';
            data.rajaongkir.results.forEach(province => {
                const option = document.createElement('option');
                option.value = province.province_id;
                option.textContent = province.province;
                select.appendChild(option);
            });
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('Format response tidak dikenali');
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
        
        // ✅ CEK STRUKTUR RESPONSE
        if (data.data && Array.isArray(data.data)) {
            const select = document.getElementById('city-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kota</option>';
            data.data.forEach(city => {
                const option = document.createElement('option');
                option.value = city.city_id;
                option.textContent = `${city.type} ${city.city_name}`;
                select.appendChild(option);
            });
        } else if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('city-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kota</option>';
            data.rajaongkir.results.forEach(city => {
                const option = document.createElement('option');
                option.value = city.city_id;
                option.textContent = `${city.type} ${city.city_name}`;
                select.appendChild(option);
            });
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('Format response tidak dikenali');
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
        
        // ✅ CEK STRUKTUR RESPONSE
        if (data.data && Array.isArray(data.data)) {
            const select = document.getElementById('district-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kecamatan</option>';
            data.data.forEach(district => {
                const option = document.createElement('option');
                option.value = district.district_id;
                option.textContent = district.district_name;
                select.appendChild(option);
            });
        } else if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
            const select = document.getElementById('district-select');
            if (!select) return;
            
            select.innerHTML = '<option value="">Pilih Kecamatan</option>';
            data.rajaongkir.results.forEach(district => {
                const option = document.createElement('option');
                option.value = district.district_id;
                option.textContent = district.district_name;
                select.appendChild(option);
            });
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('Format response tidak dikenali');
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
        
        // ✅ CEK STRUKTUR RESPONSE
        if (data.data && data.data.length > 0) {
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
        } else if (data.rajaongkir && data.rajaongkir.status && data.rajaongkir.status.code === 200) {
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
        } else if (data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('Format response tidak dikenali');
        }
    } catch (error) {
        console.error('Error calculating shipping:', error);
        const shippingCost = document.getElementById('shipping-cost');
        if (shippingCost) shippingCost.value = 0;
        showNotification('Gagal menghitung ongkir', 'error');
    }
}
