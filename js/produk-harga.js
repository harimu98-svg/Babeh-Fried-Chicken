document.addEventListener('DOMContentLoaded', function() {
    loadProducts();

    async function loadProducts() {
        try {
            const { data: products, error } = await window.supabaseClient
                .from('produk_fried_chicken')
                .select('*')
                .eq('is_available', true)
                .order('kategori', { ascending: true });

            if (error) throw error;
            displayProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            document.getElementById('products-container').innerHTML = `
                <div class="alert alert-danger">Gagal memuat produk. Silakan refresh halaman.</div>
            `;
        }
    }

    function displayProducts(products) {
        const container = document.getElementById('products-container');
        
        // Group by category
        const categories = {};
        products.forEach(product => {
            if (!categories[product.kategori]) {
                categories[product.kategori] = [];
            }
            categories[product.kategori].push(product);
        });

        let html = '';
        for (const [category, items] of Object.entries(categories)) {
            html += `
                <div class="category-section">
                    <h2 class="category-title">${category}</h2>
                    <div class="products-grid">
            `;
            
            items.forEach(product => {
                html += `
                    <div class="product-card">
                        ${product.gambar_url ? `<img src="${product.gambar_url}" alt="${product.nama_produk}" class="product-image">` : 
                        `<div class="product-image-placeholder"><i class="fas fa-utensils"></i></div>`}
                        <div class="product-info">
                            <h3 class="product-name">${product.nama_produk}</h3>
                            <p class="product-description">${product.deskripsi || ''}</p>
                            <div class="product-price">Rp ${formatRupiah(product.harga)}</div>
                            <button class="btn-order" onclick="addToOrder(${product.id}, '${product.nama_produk}', ${product.harga})">
                                <i class="fas fa-plus"></i> Pesan
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        container.innerHTML = html || '<p class="text-center">Belum ada produk tersedia</p>';
    }

    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID').format(amount);
    }

    // Add to order function
    window.addToOrder = function(productId, productName, price) {
        const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": [], "total": 0}');
        
        // Check if product already in order
        const existingItem = order.items.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            order.items.push({
                id: productId,
                name: productName,
                price: price,
                quantity: 1
            });
        }

        // Update total
        order.total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        localStorage.setItem('currentOrder', JSON.stringify(order));
        updateOrderBadge();
        showNotification(`Berhasil menambahkan ${productName} ke pesanan!`, 'success');
    };

    window.updateOrderBadge = function() {
        const order = JSON.parse(localStorage.getItem('currentOrder') || '{"items": []}');
        const badge = document.getElementById('order-badge');
        if (badge) {
            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
        }
    };

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Initialize order badge
    window.updateOrderBadge();
});
