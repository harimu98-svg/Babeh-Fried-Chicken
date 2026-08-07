// js/produk-harga.js
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    window.updateOrderBadge();
});

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
                        <button class="btn-order" onclick="window.addToOrder(${product.id}, '${product.nama_produk}', ${product.harga}, ${berat})">
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
