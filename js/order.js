// js/order.js - DENGAN HARDCODE ORIGIN

// ===== KONFIGURASI =====
const API_BASE_URL = '/.netlify/functions/rajaongkir';

// ===== HARDCODE ORIGIN (LOKASI TOKO DI DEPOK) =====
// Ganti dengan subdistrict_id yang sesuai dengan alamat toko Anda
// Untuk Bojongsari, Depok
const ORIGIN_SUBDISTRICT_ID = '187'; // Ganti dengan ID yang didapat
const ORIGIN_NAME = 'Bojongsari, Depok, Jawa Barat'; // Nama lokasi

// Contoh jika sudah tahu ID-nya:
// const ORIGIN_SUBDISTRICT_ID = '187'; // Pancoran Mas
// const ORIGIN_NAME = 'Pancoran Mas, Depok, Jawa Barat';

// ============================================
// SET ORIGIN - HARDCODE
// ============================================
function setOrigin() {
    const originInfo = document.getElementById('origin-info');
    
    // Gunakan hardcode
    originSubdistrictId = ORIGIN_SUBDISTRICT_ID;
    
    if (originInfo) {
        originInfo.textContent = `📍 Lokasi toko: ${ORIGIN_NAME}`;
    }
    
    console.log('✅ Origin set (hardcoded):', originSubdistrictId);
    console.log('📍 Location:', ORIGIN_NAME);
    
    // Simpan ke localStorage agar bisa dipakai nanti
    localStorage.setItem('origin_subdistrict_id', originSubdistrictId);
    localStorage.setItem('origin_name', ORIGIN_NAME);
}

// ============================================
// CALCULATE SHIPPING DENGAN PILIHAN KURIR
// ============================================
async function calculateShippingWithSubdistrict(subdistrictId, courier = null) {
    if (!subdistrictId) {
        document.getElementById('shipping-cost').value = 0;
        document.getElementById('shipping-cost-display').textContent = 'Rp 0';
        document.getElementById('shipping-service').textContent = '';
        return;
    }

    // Jika courier tidak dipilih, ambil dari dropdown
    if (!courier) {
        const courierSelect = document.getElementById('courier-select');
        if (courierSelect) {
            courier = courierSelect.value;
        }
    }

    // Jika masih tidak ada, gunakan default
    if (!courier || courier === '') {
        courier = 'jne'; // Default
    }

    // Pastikan origin sudah diset
    if (!originSubdistrictId) {
        setOrigin();
    }

    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const totalWeight = order.items.reduce((sum, item) => sum + (1 * item.quantity), 0) || 1;

    try {
        document.getElementById('shipping-cost-display').textContent = 'Menghitung...';
        document.getElementById('shipping-service').textContent = '';
        document.getElementById('shipping-loader').style.display = 'block';
        
        console.log('🔄 Calculating shipping...');
        console.log('📌 Origin (Depok):', originSubdistrictId);
        console.log('📌 Destination:', subdistrictId);
        console.log('📌 Weight:', totalWeight * 1000, 'gram');
        console.log('📌 Courier:', courier);
        
        // Build form-urlencoded body
        const formData = new URLSearchParams();
        formData.append('origin', originSubdistrictId);
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
        
        console.log('Cost data:', data);
        
        if (data.error) {
            throw new Error(data.error + (data.details ? `: ${data.details}` : ''));
        }
        
        // Cek berbagai kemungkinan struktur response
        let costs = null;
        if (data.rajaongkir && data.rajaongkir.results) {
            costs = data.rajaongkir.results[0]?.costs;
        } else if (data.data && data.data.length > 0) {
            costs = data.data[0]?.costs;
        }
        
        if (costs && costs.length > 0) {
            // Tampilkan semua pilihan ongkir
            displayShippingOptions(costs);
            
            // Ambil yang termurah
            const cheapest = costs.reduce((min, cost) => {
                const price = cost.cost?.[0]?.value || cost.value || 0;
                return price < (min.cost?.[0]?.value || min.value || Infinity) ? cost : min;
            });
            
            const shippingCost = cheapest.cost?.[0]?.value || cheapest.value || 0;
            const serviceName = cheapest.service || 'Layanan';
            const description = cheapest.description || '';
            const etd = cheapest.cost?.[0]?.etd || '1-2';
            
            document.getElementById('shipping-cost').value = shippingCost;
            document.getElementById('shipping-cost-display').textContent = `Rp ${formatRupiah(shippingCost)}`;
            document.getElementById('shipping-service').textContent = 
                `${serviceName} - ${description} (${etd} hari)`;
            document.getElementById('shipping-service').style.color = '#28a745';
            document.getElementById('shipping-loader').style.display = 'none';
            updateTotal();
            
            showNotification(`✅ Ongkir: Rp ${formatRupiah(shippingCost)}`, 'success');
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
        container.innerHTML = '<p style="color:#6c757d;">Tidak ada pilihan ongkir</p>';
        return;
    }
    
    // Sort by price
    const sorted = [...costs].sort((a, b) => {
        const priceA = a.cost?.[0]?.value || a.value || 0;
        const priceB = b.cost?.[0]?.value || b.value || 0;
        return priceA - priceB;
    });
    
    container.innerHTML = `
        <div style="font-size:0.9rem; color:#6c757d; margin-bottom:5px;">
            <i class="fas fa-truck"></i> Pilihan Ongkir:
        </div>
        ${sorted.map(cost => {
            const price = cost.cost?.[0]?.value || cost.value || 0;
            const service = cost.service || 'Layanan';
            const desc = cost.description || '';
            const etd = cost.cost?.[0]?.etd || '1-2';
            const isCheapest = price === sorted[0].cost?.[0]?.value || price === sorted[0].value;
            return `
                <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #f0f0f0; ${isCheapest ? 'background:#f8f9fa;' : ''}">
                    <span>
                        ${isCheapest ? '🏆 ' : ''}
                        <strong>${service}</strong>
                        <span style="color:#6c757d; font-size:0.85rem;">${desc}</span>
                    </span>
                    <span style="font-weight:bold; color:${isCheapest ? '#28a745' : '#333'};">
                        Rp ${formatRupiah(price)}
                        <span style="font-size:0.8rem; color:#6c757d; font-weight:normal;">(${etd} hari)</span>
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
                calculateShippingWithSubdistrict(subdistrictId, this.value);
            }
        });
    }
});
