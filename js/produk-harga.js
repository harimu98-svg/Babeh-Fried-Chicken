// js/produk-harga.js - FULL DENGAN REALTIME

// ============================================
// REALTIME SUBSCRIPTION UNTUK PRODUK
// ============================================
let productChannel = null;

function subscribeToProductChanges() {
    // Hapus subscription lama jika ada
    if (productChannel) {
        window.supabaseClient.removeChannel(productChannel);
    }

    console.log('🔄 Subscribing to product changes...');

    productChannel = window.supabaseClient
        .channel('product-changes')
        .on(
            'postgres_changes',
            {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'produk_fried_chicken'
            },
            (payload) => {
                console.log('📦 Produk berubah!', payload);
                console.log('📦 Event type:', payload.eventType);
                console.log('📦 Data:', payload.new || payload.old);
                
                // 🔥 LANGSUNG LOAD ULANG PRODUK TANPA REFRESH!
                showNotification('🔄 Menu sedang diperbarui...', 'info');
                loadProducts();
            }
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Subscribed to product changes!');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Subscription error:', err);
            }
        });
}

// ============================================
// LOAD PRODUCTS (EXISTING)
// ============================================
async function loadProducts() {
    try {
        const { data: products, error } = await window.supabaseClient
            .from('produk_fried_chicken')
            .select('*')
            .eq('is_available', true)
            .order('kategori', { ascending: true });

        if (error) throw error;
        displayProducts(products);
        console.log('✅ Products loaded:', products.length);
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('products-container').innerHTML = `
            <div class="alert alert-danger">Gagal memuat produk. Silakan refresh halaman.</div>
        `;
    }
}

// ============================================
// DISPLAY PRODUCTS (EXISTING)
// ============================================
function displayProducts(products) {
    const container = document.getElementById('products-container');
    
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
            const berat = product.berat || 250;
            html += `
                <div class="product-card">
                    ${product.gambar_url ? `<img src="${product.gambar_url}" alt="${product.nama_produk}" class="product-image">` : 
                    `<div class="product-image-placeholder"><i class="fas fa-utensils"></i></div>`}
                    <div class="product-info">
                        <h3 class="product-name">${product.nama_produk}</h3>
                        <p class="product-description">${product.deskripsi || ''}</p>
                        <div class="product-price">Rp ${formatRupiah(product.harga)}</div>
                        <div class="product-weight"><i class="fas fa-weight"></i> ${berat}g</div>
                        <button class="btn-order" onclick="window.addToOrder(${product.id}, '${product.nama_produk}', ${product.harga}, ${product.berat || 250})">
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

// ============================================
// NOTIFICATION
// ============================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ============================================
// FORMAT RUPIAH
// ============================================
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID').format(amount);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing product page...');
    
    // Load products
    loadProducts();
    
    // 🔥 SUBSCRIBE REALTIME
    subscribeToProductChanges();
    
    // Update order badge
    window.updateOrderBadge();
    
    console.log('✅ Product page initialized with Realtime');
});

// ============================================
// CLEANUP (Opsional)
// ============================================
window.addEventListener('beforeunload', function() {
    if (productChannel) {
        window.supabaseClient.removeChannel(productChannel);
        console.log('🔄 Removed product subscription');
    }
});
