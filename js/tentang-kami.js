document.addEventListener('DOMContentLoaded', function() {
    // About page content
    const aboutContent = `
        <div class="about-container">
            <div class="about-header">
                <h1>Tentang Babeh Fried Chicken</h1>
                <div class="about-divider"></div>
            </div>
            
            <div class="about-content">
                <div class="about-section">
                    <h2><i class="fas fa-store"></i> Sejarah Kami</h2>
                    <p>Babeh Fried Chicken berdiri sejak tahun 2020 dengan komitmen menyajikan ayam goreng berkualitas dengan rasa yang khas dan menggugah selera. Kami menggunakan bahan-bahan segar dan rempah pilihan untuk menciptakan cita rasa yang otentik.</p>
                </div>

                <div class="about-section">
                    <h2><i class="fas fa-utensils"></i> Visi & Misi</h2>
                    <div class="vision-mission">
                        <div class="vision">
                            <h3>Visi</h3>
                            <p>Menjadi pilihan utama masyarakat Indonesia untuk menikmati ayam goreng berkualitas dengan harga terjangkau.</p>
                        </div>
                        <div class="mission">
                            <h3>Misi</h3>
                            <ul>
                                <li>Menyajikan produk dengan kualitas terbaik</li>
                                <li>Memberikan pelayanan yang ramah dan profesional</li>
                                <li>Mengembangkan inovasi menu yang beragam</li>
                                <li>Menjaga kebersihan dan kehalalan produk</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="about-section">
                    <h2><i class="fas fa-award"></i> Keunggulan Kami</h2>
                    <div class="advantages-grid">
                        <div class="advantage-item">
                            <i class="fas fa-drumstick-bite"></i>
                            <h3>Ayam Fresh</h3>
                            <p>Menggunakan ayam segar berkualitas</p>
                        </div>
                        <div class="advantage-item">
                            <i class="fas fa-pepper-hot"></i>
                            <h3>Rempah Pilihan</h3>
                            <p>Bumbu rempah original pilihan</p>
                        </div>
                        <div class="advantage-item">
                            <i class="fas fa-hand-holding-heart"></i>
                            <h3>Halal</h3>
                            <p>Bersertifikat halal</p>
                        </div>
                        <div class="advantage-item">
                            <i class="fas fa-clock"></i>
                            <h3>Fast Service</h3>
                            <p>Penyajian cepat dan tepat waktu</p>
                        </div>
                    </div>
                </div>

                <div class="about-section">
                    <h2><i class="fas fa-phone-alt"></i> Hubungi Kami</h2>
                    <div class="contact-info">
                        <p><i class="fas fa-whatsapp"></i> <a href="https://wa.me/${window.WA_ADMIN}" target="_blank">${window.WA_ADMIN}</a></p>
                        <p><i class="fas fa-envelope"></i> babeh.friedchicken@gmail.com</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('about-content').innerHTML = aboutContent;
});
