document.addEventListener('DOMContentLoaded', function() {
    loadOrderItems();
    loadShippingCosts();

    // Handle quantity changes
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('qty-btn')) {
            const productId = e.target.dataset.id;
            const change = parseInt(e.target.dataset.change);
            updateQuantity(productId, change);
        }
    });

    // Form submission
    document.getElementById('order-form').addEventListener('submit', function(e) {
        e.preventDefault();
        submitOrder();
    });

    // Payment method change
    document.querySelectorAll('input[name="payment_method"]').forEach(input => {
        input.addEventListener('change', function() {
            document.getElementById('qris-payment').style.display = 
                this.value === 'QRIS' ? 'block' : 'none';
            document.getElementById('transfer-payment').style.display = 
                this.value === 'TRANSFER' ? 'block' : 'none';
        });
    });

    // Shipping cost calculation
    document.getElementById('city-select').addEventListener('change', calculateShipping);
    document.getElementById('province-select').addEventListener('change', function() {
        loadCities(this.value);
    });

    async function loadOrderItems() {
        const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
        const container = document.getElementById('order-items');
        const totalContainer = document.getElementById('order-total');

        if (order.items.length === 0) {
            container.innerHTML = `
                <div class="empty-order">
                    <i class="fas fa-shopping-cart fa-3x"></i>
                    <p>Belum ada pesanan</p>
                    <a href="#" onclick="window.location.href='#produk'">Lihat Menu</a>
                </div>
            `;
            totalContainer.innerHTML = 'Rp 0';
            return;
        }

        let html = '';
        order.items.forEach(item => {
            html += `
                <div class="order-item">
                    <div class="item-info">
                        <span class="item-name">${item.name}</span>
                        <span class="item-price">Rp ${formatRupiah(item.price)}</span>
                    </div>
                    <div class="item-controls">
                        <button class="qty-btn" data-id="${item.id}" data-change="-1">-</button>
                        <span class="item-qty">${item.quantity}</span>
                        <button class="qty-btn" data-id="${item.id}" data-change="1">+</button>
                        <button class="remove-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        totalContainer.innerHTML = `Rp ${formatRupiah(order.total)}`;

        // Update hidden fields
        document.getElementById('order-items-json').value = JSON.stringify(order.items);
        document.getElementById('subtotal').value = order.total;
    }

    function updateQuantity(productId, change) {
        const order = JSON.parse(localStorage.getItem('currentOrder'));
        const item = order.items.find(i => i.id === productId);
        
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                order.items = order.items.filter(i => i.id !== productId);
            }
            order.total = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
            localStorage.setItem('currentOrder', JSON.stringify(order));
            loadOrderItems();
            window.updateOrderBadge();
        }
    }

    async function submitOrder() {
        const order = JSON.parse(localStorage.getItem('currentOrder'));
        if (!order || order.items.length === 0) {
            showNotification('Silakan tambahkan pesanan terlebih dahulu!', 'error');
            return;
        }

        // Get form data
        const formData = {
            customer_name: document.getElementById('customer-name').value,
            customer_phone: document.getElementById('customer-phone').value,
            customer_address: document.getElementById('customer-address').value,
            city: document.getElementById('city-select').value,
            province: document.getElementById('province-select').value,
            payment_method: document.querySelector('input[name="payment_method"]:checked').value,
            notes: document.getElementById('order-notes').value
        };

        // Validate
        if (!formData.customer_name || !formData.customer_phone || !formData.customer_address) {
            showNotification('Mohon lengkapi data pemesan!', 'error');
            return;
        }

        // Calculate shipping
        const shippingCost = parseInt(document.getElementById('shipping-cost').value) || 0;
        const subtotal = order.total;
        const total = subtotal + shippingCost;

        // Create order data
        const orderData = {
            order_number: generateOrderNumber(),
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone,
            customer_address: formData.customer_address,
            items: order.items,
            subtotal: subtotal,
            shipping_cost: shippingCost,
            total: total,
            shipping_city: formData.city,
            shipping_province: formData.province,
            payment_method: formData.payment_method,
            payment_status: 'Menunggu Verifikasi pembayaran',
            notes: formData.notes,
            status: 'pending'
        };

        try {
            const { data, error } = await window.supabaseClient
                .from('order_fried_chicken')
                .insert([orderData])
                .select();

            if (error) throw error;

            // Send WhatsApp notification
            sendWAOrderNotification(orderData);

            // Clear cart
            localStorage.removeItem('currentOrder');
            window.updateOrderBadge();

            // Show success
            showSuccessPage(orderData.order_number);
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
                `- ${item.name} x${item.quantity} = Rp ${formatRupiah(item.price * item.quantity)}`
            ).join('%0A') +
            `%0A%0ASubtotal: Rp ${formatRupiah(orderData.subtotal)}%0A` +
            `Ongkir: Rp ${formatRupiah(orderData.shipping_cost)}%0A` +
            `*Total: Rp ${formatRupiah(orderData.total)}*%0A%0A` +
            `Metode Pembayaran: ${orderData.payment_method}%0A` +
            `Catatan: ${orderData.notes || '-'}`;

        const waUrl = `https://wa.me/${window.WA_ADMIN}?text=${message}`;
        window.open(waUrl, '_blank');
    }

    function showSuccessPage(orderNumber) {
        const container = document.getElementById('order-form-container');
        container.innerHTML = `
            <div class="order-success">
                <i class="fas fa-check-circle fa-4x" style="color: #28a745;"></i>
                <h2>Pesanan Berhasil!</h2>
                <p>Nomor Pesanan: <strong>${orderNumber}</strong></p>
                <p>Silakan lakukan pembayaran melalui metode yang dipilih.</p>
                <p>Kami akan mengirimkan konfirmasi melalui WhatsApp.</p>
                <button onclick="window.location.href='#produk'" class="btn btn-primary">
                    Kembali ke Menu
                </button>
            </div>
        `;
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
});

// Shipping related functions
async function loadShippingCosts() {
    try {
        // Load provinces
        const response = await fetch(`${window.RAJA_ONGKIR_BASE_URL}/province`, {
            headers: {
                'key': window.RAJA_ONGKIR_API_KEY
            }
        });
        const data = await response.json();
        
        if (data.rajaongkir.status.code === 200) {
            const select = document.getElementById('province-select');
            data.rajaongkir.results.forEach(province => {
                const option = document.createElement('option');
                option.value = province.province_id;
                option.textContent = province.province;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading provinces:', error);
        document.getElementById('shipping-cost').value = 0;
    }
}

async function loadCities(provinceId) {
    if (!provinceId) return;
    
    try {
        const response = await fetch(`${window.RAJA_ONGKIR_BASE_URL}/city?province=${provinceId}`, {
            headers: {
                'key': window.RAJA_ONGKIR_API_KEY
            }
        });
        const data = await response.json();
        
        if (data.rajaongkir.status.code === 200) {
            const select = document.getElementById('city-select');
            select.innerHTML = '<option value="">Pilih Kota</option>';
            data.rajaongkir.results.forEach(city => {
                const option = document.createElement('option');
                option.value = city.city_id;
                option.textContent = city.city_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading cities:', error);
    }
}

async function calculateShipping() {
    const cityId = document.getElementById('city-select').value;
    if (!cityId) {
        document.getElementById('shipping-cost').value = 0;
        return;
    }

    // Get total weight (estimation: 1kg per item)
    const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
    const totalWeight = order.items.reduce((sum, item) => sum + (1 * item.quantity), 0) || 1;

    try {
        const response = await fetch(`${window.RAJA_ONGKIR_BASE_URL}/cost`, {
            method: 'POST',
            headers: {
                'key': window.RAJA_ONGKIR_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                origin: '501', // Jakarta Pusat (default origin)
                destination: cityId,
                weight: totalWeight * 1000, // in grams
                courier: 'jne'
            })
        });
        
        const data = await response.json();
        
        if (data.rajaongkir.status.code === 200) {
            const costs = data.rajaongkir.results[0].costs;
            if (costs && costs.length > 0) {
                // Take the cheapest option
                const cheapest = costs.reduce((min, cost) => {
                    const price = cost.cost[0].value;
                    return price < min.cost[0].value ? cost : min;
                });
                document.getElementById('shipping-cost').value = cheapest.cost[0].value;
                document.getElementById('shipping-service').textContent = 
                    `${cheapest.service} - ${cheapest.description}`;
                updateTotal();
            }
        }
    } catch (error) {
        console.error('Error calculating shipping:', error);
        document.getElementById('shipping-cost').value = 0;
    }
}

function updateTotal() {
    const subtotal = parseInt(document.getElementById('subtotal').value) || 0;
    const shipping = parseInt(document.getElementById('shipping-cost').value) || 0;
    const total = subtotal + shipping;
    document.getElementById('grand-total').textContent = formatRupiah(total);
}
