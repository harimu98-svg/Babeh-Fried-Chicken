// js/order.js - PERBAIKI FIELD NAME

// ===== HARDCODE ORIGIN =====
// Ganti dengan ID yang didapat dari console
// Contoh: dari hasil di atas, untuk "BOJONG SARI (LAMA)" ID-nya berapa?
// Kita perlu lihat response lengkapnya dulu
const ORIGIN_SUBDISTRICT_ID = 'YOUR_SUBDISTRICT_ID'; // Ganti nanti
const ORIGIN_NAME = 'Bojongsari, Depok, Jawa Barat';

// ============================================
// CEK RESPONSE LENGKAP DULU
// ============================================
// Jalankan ini di console untuk lihat ID sebenarnya:
// 
// async function cekDetail() {
//     const response = await fetch('/.netlify/functions/rajaongkir/search?q=Bojongsari Depok&limit=10');
//     const data = await response.json();
//     console.log('📦 FULL RESPONSE:', JSON.stringify(data, null, 2));
// }
// cekDetail();

// ============================================
// SEARCH DESTINATION - PERBAIKI FIELD NAME
// ============================================
let searchTimeout;

async function searchDestination(query) {
    const resultsContainer = document.getElementById('search-results');
    
    if (!query || query.length < 3) {
        resultsContainer.classList.remove('show');
        return;
    }
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            resultsContainer.innerHTML = '<div class="search-loading">🔍 Mencari...</div>';
            resultsContainer.classList.add('show');
            
            const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=20`);
            const data = await response.json();
            
            console.log('📦 Search response:', data);
            
            // Cek struktur response
            let results = [];
            if (data.data && Array.isArray(data.data)) {
                results = data.data;
            } else if (data.rajaongkir?.results && Array.isArray(data.rajaongkir.results)) {
                results = data.rajaongkir.results;
            }
            
            if (results.length > 0) {
                resultsContainer.innerHTML = results.map(item => {
                    // 🔥 PERBAIKI: Gunakan field name yang benar
                    // Dari response: ada 'id' bukan 'subdistrict_id'
                    const id = item.id || item.subdistrict_id || item.district_id;
                    const name = item.subdistrict_name || item.name || item.district || 'Kecamatan';
                    const city = item.city_name || item.city || 'Kota';
                    const province = item.province || item.province_name || 'Provinsi';
                    
                    // Log untuk debugging
                    console.log('📌 Item:', { id, name, city, province, raw: item });
                    
                    return `
                        <div class="search-result-item" onclick="selectSearchResult('${id}', '${name}', '${city}', '${province}')">
                            <span class="result-name">${name}</span>
                            <span class="result-location">${city}, ${province}</span>
                            ${id ? `<span class="result-badge">ID: ${id}</span>` : '<span class="result-badge" style="background:#dc3545;">⚠️ No ID</span>'}
                        </div>
                    `;
                }).join('');
                resultsContainer.classList.add('show');
            } else {
                resultsContainer.innerHTML = '<div class="search-no-results">❌ Tidak ditemukan</div>';
                resultsContainer.classList.add('show');
            }
        } catch (error) {
            console.error('❌ Search error:', error);
            resultsContainer.innerHTML = `<div class="search-no-results" style="color:#dc3545;">❌ Gagal mencari</div>`;
            resultsContainer.classList.add('show');
        }
    }, 500);
}

// ============================================
// SELECT SEARCH RESULT
// ============================================
function selectSearchResult(id, name, city, province) {
    if (!id) {
        showNotification('❌ Gagal: ID lokasi tidak ditemukan!', 'error');
        return;
    }
    
    document.getElementById('search-results').classList.remove('show');
    document.getElementById('search-destination').value = name;
    
    const selectedLocation = document.getElementById('selected-location');
    document.getElementById('selected-location-text').textContent = 
        `${name}, ${city}, ${province}`;
    document.getElementById('selected-subdistrict').value = id;
    selectedLocation.classList.add('show');
    
    console.log('✅ Selected:', { id, name, city, province });
    
    // Hitung ongkir
    calculateShippingWithSubdistrict(id);
}
