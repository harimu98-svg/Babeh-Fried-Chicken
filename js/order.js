// js/order.js - UPDATE BODY FORMAT

// ============================================
// CALCULATE SHIPPING WITH SUBDISTRICT
// ============================================
async function calculateShippingWithSubdistrict(subdistrictId) {
    if (!subdistrictId) {
        document.getElementById('shipping-cost').value = 0;
        document.getElementById('shipping-cost-display').textContent = 'Rp 0';
        document.getElementById('shipping-service').textContent = '';
        return;
    }

    // Pastikan origin sudah diset
    if (!originSubdistrictId) {
        await setOrigin();
    }

    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const totalWeight = order.items.reduce((sum, item) => sum + (1 * item.quantity), 0) || 1;

    try {
        document.getElementById('shipping-cost-display').textContent = 'Menghitung...';
        document.getElementById('shipping-service').textContent = '';
        
        console.log('🔄 Calculating shipping...');
        console.log('📌 Origin (Depok):', originSubdistrictId);
        console.log('📌 Destination:', subdistrictId);
        console.log('📌 Weight:', totalWeight * 1000, 'gram');
        
        // Build form-urlencoded body
        const formData = new URLSearchParams();
        formData.append('origin', originSubdistrictId);
        formData.append('destination', subdistrictId);
        formData.append('weight', (totalWeight * 1000).toString());
        formData.append('courier', 'jne:sicepat:jnt:tiki:pos:anteraja'); // Multiple couriers
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
            // Cari yang termurah (price: lowest)
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
        showNotification('Gagal menghitung ongkir: ' + error.message, 'error');
    }
}
