// --- AUTH GUARD & INISIALISASI ---
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'index.html';
}

// URL Web App GAS untuk Database PMK
const API_PMK_URL = 'https://script.google.com/macros/s/AKfycbzgMldi-CLCLUVcDFYXLIZ_nv77-xKdkjMkY50Yokm1M5yLyb5RYPD4PhvsXHxMntT5rg/exec'; 

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. TAMPILKAN INFO USER (Dari Sesi Login) ---
    const userNip = sessionStorage.getItem('userNip');
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');
    
    if(userName) document.getElementById('displayName').textContent = userName;
    if(userRole) {
        document.getElementById('displayRole').textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    }

    // --- 2. DEKLARASI VARIABEL DOM UTAMA ---
    const btnBuatUsulan = document.getElementById('btnBuatUsulan');
    const btnRefreshData = document.getElementById('btnRefreshData');
    const usulanCardContainer = document.getElementById('usulanCardContainer');
    const emptyStateContainer = document.getElementById('emptyStateContainer');
    
    // Modal Usulan
    const usulanModal = document.getElementById('usulanModal');
    const btnCloseUsulan = document.getElementById('btnCloseUsulan');
    const formBuatUsulan = document.getElementById('formBuatUsulan');
    const modalUsulanTitle = document.getElementById('modalUsulanTitle');
    const riwayatContainer = document.getElementById('riwayatContainer');
    const btnTambahRiwayat = document.getElementById('btnTambahRiwayat');
    const riwayatCountBadge = document.getElementById('riwayatCountBadge');
    const btnSimpanUsulan = document.getElementById('btnSimpanUsulan');

    // Modal Tanggapan
    const tanggapanModal = document.getElementById('tanggapanModal');
    const btnCloseTanggapan = document.getElementById('btnCloseTanggapan');
    const formTanggapan = document.getElementById('formTanggapan');
    const inputTanggapan = document.getElementById('inputTanggapan');
    const btnSimpanTanggapan = document.getElementById('btnSimpanTanggapan');

    let riwayatCount = 0;
    const MAX_RIWAYAT = 5;
    let isEditMode = false;
    let activeUsulanId = ''; 
    let currentUsulanData = null; // Menyimpan data utuh dari database

    // --- 3. FUNGSI LOAD DATA USULAN DARI BACKEND ---
    function loadDataUsulan() {
        Swal.fire({ title: 'Memuat Data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

        fetch(`${API_PMK_URL}?action=getUsulanByNip&nip=${userNip}`)
            .then(res => res.json())
            .then(data => {
                Swal.close();
                if (data.success && data.data) {
                    currentUsulanData = data.data; // Simpan data global
                    renderUsulanCard(data.data);
                    emptyStateContainer.style.display = 'none';
                    usulanCardContainer.style.display = 'block';
                    
                    btnBuatUsulan.disabled = true;
                    btnBuatUsulan.title = "Anda sudah memiliki usulan aktif.";
                    activeUsulanId = data.data.ID;
                } else {
                    usulanCardContainer.innerHTML = '';
                    usulanCardContainer.style.display = 'none';
                    emptyStateContainer.style.display = 'block';
                    
                    btnBuatUsulan.disabled = false;
                    btnBuatUsulan.title = "Buat usulan baru";
                    activeUsulanId = '';
                    currentUsulanData = null;
                }
            })
            .catch(err => {
                Swal.fire('Error', 'Gagal memuat data dari server.', 'error');
            });
    }

    // Panggil saat halaman pertama dimuat
    loadDataUsulan(); 

    if(btnRefreshData) btnRefreshData.addEventListener('click', loadDataUsulan);

    // --- 4. RENDER UI CARD USULAN DINAMIS ---
    
    // Fungsi Bantuan: Mengubah string tanggal menjadi DD-MM-YYYY (Tampilan Card)
    function formatTanggalIndo(dateStr, includeTime = false) {
        if (!dateStr || dateStr === '') return '-';
        let d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        
        // Memaksa zona waktu ke GMT+8 (Asia/Makassar) agar tidak mundur sehari
        let optionsDate = { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' };
        let dStr = d.toLocaleString('en-GB', optionsDate); // Menghasilkan format DD/MM/YYYY
        
        let [day, month, year] = dStr.split('/');
        let result = `${day}-${month}-${year}`;
        
        if (includeTime) {
            let optionsTime = { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false };
            let timeStr = d.toLocaleTimeString('en-GB', optionsTime);
            result += ` ${timeStr}`;
        }
        return result;
    }

    function renderUsulanCard(data) {
        let riwayatHtml = '';
        for(let i = 1; i <= 5; i++) {
            let instansi = data[`RK_${i}_Instansi`];
            if(instansi && instansi !== '') {
                let dari = formatTanggalIndo(data[`RK_${i}_Dari`]);
                let sampai = formatTanggalIndo(data[`RK_${i}_Sampai`]);
                let tahun = data[`RK_${i}_Tahun_Usul`];
                let bulan = data[`RK_${i}_Bulan_Usul`];
                
                riwayatHtml += `
                <li>
                    <strong>${instansi}</strong>
                    <span>${dari} s.d. ${sampai} (${tahun} Tahun, ${bulan} Bulan)</span>
                </li>`;
            }
        }

        function getBadgeClass(status) {
            let s = (status || '').toUpperCase();
            if(s.includes('ACC')) return 'badge-acc';
            if(s.includes('TMS')) return 'badge-tms';
            if(s.includes('BTS')) return 'badge-bts';
            return 'badge-proses'; 
        }

        let statPengelola = data.Pengelola_Status || 'Belum Diproses';
        let statVerifikator = data.Verifikator_Status || 'Belum Diproses';

        let tglPengelola = data.Pengelola_Tanggal ? `<span style="font-size: 0.75rem; color: #64748B; margin-left: 8px;"><i class="far fa-calendar-alt"></i> ${formatTanggalIndo(data.Pengelola_Tanggal)}</span>` : '';
        let tglVerifikator = data.Verifikator_Tanggal ? `<span style="font-size: 0.75rem; color: #64748B; margin-left: 8px;"><i class="far fa-calendar-alt"></i> ${formatTanggalIndo(data.Verifikator_Tanggal)}</span>` : '';
        let tglTanggapan = data.Pengusul_Tanggal ? `<span style="font-size: 0.75rem; color: #64748B; margin-left: 8px;"><i class="far fa-calendar-alt"></i> ${formatTanggalIndo(data.Pengusul_Tanggal)}</span>` : '';

        // --- TAMBAHAN BARU: Logika Sembunyikan Tombol SK ---
        let btnSkHtml = '';
        if (data.URL_SK && data.URL_SK.trim() !== '') {
            btnSkHtml = `<button class="btn-footer btn-sk" onclick="window.open('${data.URL_SK}', '_blank')"><i class="fas fa-file-signature btn-icon"></i> Lihat SK</button>`;
        }
       
        let html = `
        <div class="usulan-card">
            <div class="usulan-header">
                <span class="usulan-id"><i class="fas fa-hashtag btn-icon"></i> ID: ${data.ID}</span>
                <span class="usulan-date"><i class="far fa-calendar-alt btn-icon"></i> ${formatTanggalIndo(data.Timestamp)}</span>
            </div>
            
            <div class="usulan-body">
                <div class="data-section">
                    <h3 class="section-title"><i class="fas fa-id-badge btn-icon"></i> Data Diri</h3>
                    <table class="info-table">
                        <tr><td>Nama</td><td>: ${data.Nama}</td></tr>
                        <tr><td>NIP</td><td>: ${data.NIP}</td></tr>
                        <tr><td>Pangkat</td><td>: ${data.Pangkat}</td></tr>
                        <tr><td>TMT Pangkat</td><td>: ${formatTanggalIndo(data.TMT_Pangkat)}</td></tr>
                        <tr><td>Jabatan</td><td>: ${data.Jabatan}</td></tr>
                        <tr><td>Unor</td><td>: ${data.Unor}</td></tr>
                        <tr><td>Unor Induk</td><td>: ${data.Unor_Induk}</td></tr>
                        <tr><td>Nomor WA</td><td>: ${data.Nomor_WA}</td></tr>
                    </table>
                </div>

                <div class="data-section">
                    <h3 class="section-title"><i class="fas fa-briefcase btn-icon"></i> Riwayat Kerja Sebelum CPNS</h3>
                    <ul class="experience-list">
                        ${riwayatHtml}
                    </ul>
                    <div style="margin-top:15px; padding-top:10px; border-top:1px dashed #CBD5E1;">
                        <strong style="font-size:0.85rem; color:#0F172A;">Total Usulan: ${data.Total_Usul_Tahun} Tahun, ${data.Total_Usul_Bulan} Bulan</strong>
                    </div>
                </div>

                <div class="data-section">
                    <h3 class="section-title"><i class="fas fa-tasks btn-icon"></i> Status Usulan</h3>
                    <div class="status-timeline">
                        <div class="status-item">
                            <div style="margin-bottom: 5px; display: flex; align-items: center; flex-wrap: wrap;">
                                <span class="status-label" style="margin-bottom: 0;">Unor Induk (${data.Unor_Induk}):</span>
                                ${tglPengelola}
                            </div>
                            <span class="badge ${getBadgeClass(statPengelola)}">${statPengelola}</span>
                            <p class="status-note">${data.Pengelola_Catatan || '-'}</p>
                        </div>
                        <div class="status-item">
                            <div style="margin-bottom: 5px; display: flex; align-items: center; flex-wrap: wrap;">
                                <span class="status-label" style="margin-bottom: 0;">Instansi (BKPSDM):</span>
                                ${tglVerifikator}
                            </div>
                            <span class="badge ${getBadgeClass(statVerifikator)}">${statVerifikator}</span>
                            <p class="status-note">${data.Verifikator_Catatan || '-'}</p>
                        </div>
                        <div class="status-item">
                            <div style="margin-bottom: 5px; display: flex; align-items: center; flex-wrap: wrap;">
                                <span class="status-label" style="margin-bottom: 0;">Tanggapan Anda:</span>
                                ${tglTanggapan}
                            </div>
                            <p class="status-note">${data.Pengusul_Tanggapan || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="usulan-footer">
                <button class="btn-footer btn-edit" onclick="bukaModalEdit()"><i class="fas fa-edit btn-icon"></i> Edit Data</button>
                <button class="btn-footer btn-folder" onclick="window.open('${data.URL_Berkas}', '_blank')"><i class="fas fa-folder-open btn-icon"></i> Berkas Usul</button>
                
                ${btnSkHtml} <!-- Memanggil tombol SK HANYA JIKA ADA -->
                
                <button class="btn-footer btn-response" onclick="bukaModalTanggapan()"><i class="fas fa-comment-dots btn-icon"></i> Beri Tanggapan</button>
            </div>
        </div>`;
        
        usulanCardContainer.innerHTML = html;
    }


    // --- 5. LOGIKA MODAL BUAT / EDIT USULAN ---
    function openModal(modal) {
        modal.style.display = 'flex';
        setTimeout(() => { modal.classList.add('show'); }, 10);
    }
    function closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 400);
    }

    btnBuatUsulan.addEventListener('click', function() {
        isEditMode = false;
        modalUsulanTitle.textContent = 'Form Buat Usulan PMK';
        formBuatUsulan.reset();
        
        document.getElementById('usulNama').value = userName;
        document.getElementById('usulNip').value = userNip;
        
        riwayatContainer.innerHTML = '';
        riwayatCount = 0;
        tambahRiwayat(null);

        openModal(usulanModal);
    });

    // Validasi & Format Otomatis Nomor WA (08xx-xxxx-xxxx)
    const inputWa = document.getElementById('usulWa');
    if (inputWa) {
        inputWa.addEventListener('input', function(e) {
            // 1. Hapus semua karakter yang bukan angka
            let angka = this.value.replace(/[^0-9]/g, '');
            
            // 2. Format otomatis: sisipkan strip (-) setiap 4 digit
            let hasil = '';
            for (let i = 0; i < angka.length; i++) {
                if (i > 0 && i % 4 === 0) {
                    hasil += '-';
                }
                hasil += angka[i];
            }
            
            // 3. Tampilkan kembali ke dalam form
            this.value = hasil;
        });
    }

    // HELPER: Format tanggal kembali ke YYYY-MM-DD untuk input type="date" (Bebas Bug Mundur Sehari)
    function formatDateForInput(dateStr) {
        if(!dateStr) return '';
        let d = new Date(dateStr);
        if(isNaN(d.getTime())) return dateStr;
        
        // Memaksa pembacaan tanggal menggunakan zona waktu GMT+8 (Asia/Makassar)
        let options = { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' };
        let dStr = d.toLocaleString('en-GB', options); // Menghasilkan string DD/MM/YYYY
        
        // Balik posisinya menjadi YYYY-MM-DD agar bisa dibaca oleh input type="date" HTML
        let [day, month, year] = dStr.split('/');
        return `${year}-${month}-${day}`;
    }

    // FUNGSI YANG SEMPAT HILANG: BUKA MODAL EDIT DATA
    window.bukaModalEdit = function() {
        if(!currentUsulanData) return; 

        isEditMode = true;
        modalUsulanTitle.textContent = 'Form Edit Usulan PMK';
        formBuatUsulan.reset();
        
        // 1. Isi Data Diri
        document.getElementById('usulNama').value = currentUsulanData.Nama;
        document.getElementById('usulNip').value = currentUsulanData.NIP;
        document.getElementById('usulPangkat').value = currentUsulanData.Pangkat || '';
        document.getElementById('usulTmtPangkat').value = formatDateForInput(currentUsulanData.TMT_Pangkat);
        document.getElementById('usulJabatan').value = currentUsulanData.Jabatan || '';
        document.getElementById('usulUnor').value = currentUsulanData.Unor || '';
        document.getElementById('usulUnorInduk').value = currentUsulanData.Unor_Induk || '';
        
        // Bersihkan tanda petik (') dari awalan Nomor WA jika ada
        let wa = currentUsulanData.Nomor_WA || '';
        document.getElementById('usulWa').value = wa.toString().replace(/'/g, '');

        // 2. Isi Riwayat Kerja
        riwayatContainer.innerHTML = '';
        riwayatCount = 0;
        
        let adaRiwayat = false;
        for(let i = 1; i <= MAX_RIWAYAT; i++) {
            let instansi = currentUsulanData[`RK_${i}_Instansi`];
            if(instansi && instansi.trim() !== '') {
                adaRiwayat = true;
                let dataLoad = {
                    instansi: instansi,
                    dari: formatDateForInput(currentUsulanData[`RK_${i}_Dari`]),
                    sampai: formatDateForInput(currentUsulanData[`RK_${i}_Sampai`])
                };
                tambahRiwayat(dataLoad);
            }
        }
        
        // Pancing 1 form kosong jika riwayat sama sekali tidak ada
        if(!adaRiwayat) tambahRiwayat(null);

        openModal(usulanModal);
    }
    
    if(btnCloseUsulan) btnCloseUsulan.addEventListener('click', () => closeModal(usulanModal));


    // --- 6. LOGIKA RIWAYAT DINAMIS ---
    function tambahRiwayat(dataLoad = null) {
        if (riwayatCount >= MAX_RIWAYAT) return;
        riwayatCount++;
        riwayatCountBadge.textContent = `${riwayatCount} / ${MAX_RIWAYAT}`;
        btnTambahRiwayat.style.display = riwayatCount >= MAX_RIWAYAT ? 'none' : 'flex';

        const id = Date.now() + riwayatCount; 
        
        const valInstansi = dataLoad ? dataLoad.instansi : '';
        const valDari = dataLoad ? dataLoad.dari : '';
        const valSampai = dataLoad ? dataLoad.sampai : '';

        const html = `
            <div class="riwayat-item" id="riwayat_${id}">
                <div class="riwayat-header">
                    <span>Riwayat Kerja ${riwayatCount}</span>
                    ${riwayatCount > 1 ? `<button type="button" class="btn-remove-riwayat" onclick="hapusRiwayat(${id})"><i class="fas fa-trash"></i> Hapus</button>` : ''}
                </div>
                <div class="input-group">
                    <label>Nama Instansi / Perusahaan</label>
                    <input type="text" class="input-instansi" required placeholder="Cth: Klinik Sanggam Medika" value="${valInstansi}">
                </div>
                <div class="form-grid">
                    <div class="input-group">
                        <label>Masa Kerja (Dari)</label>
                        <input type="date" class="input-dari" required onchange="hitungDurasi(${id})" value="${valDari}">
                    </div>
                    <div class="input-group">
                        <label>Masa Kerja (Sampai)</label>
                        <input type="date" class="input-sampai" required onchange="hitungDurasi(${id})" value="${valSampai}">
                    </div>
                </div>
                <div class="input-group">
                    <label>Total Lama Kerja (Otomatis)</label>
                    <div class="duration-flex">
                        <input type="text" class="input-tahun input-readonly" readonly placeholder="0 Tahun">
                        <input type="text" class="input-bulan input-readonly" readonly placeholder="0 Bulan">
                    </div>
                </div>
            </div>
        `;
        riwayatContainer.insertAdjacentHTML('beforeend', html);
        updatePenomoranRiwayat();
        
        // Langsung hitung durasi jika load data
        if(dataLoad) hitungDurasi(id);
    }

    if(btnTambahRiwayat) btnTambahRiwayat.addEventListener('click', () => tambahRiwayat(null));

    window.hitungDurasi = function(id) {
        const item = document.getElementById(`riwayat_${id}`);
        const tglDari = item.querySelector('.input-dari').value;
        const tglSampai = item.querySelector('.input-sampai').value;
        const outTahun = item.querySelector('.input-tahun');
        const outBulan = item.querySelector('.input-bulan');

        if (tglDari && tglSampai) {
            let d1 = new Date(tglDari);
            let d2 = new Date(tglSampai);
            if (d2 < d1) { outTahun.value = "Tgl Tidak Valid"; outBulan.value = ""; return; }
            let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
            if (d2.getDate() < d1.getDate()) months--;
            if (months < 0) months = 0;
            outTahun.value = `${Math.floor(months / 12)} Tahun`;
            outBulan.value = `${months % 12} Bulan`;
        }
    };

    window.hapusRiwayat = function(id) {
        document.getElementById(`riwayat_${id}`).remove();
        riwayatCount--;
        riwayatCountBadge.textContent = `${riwayatCount} / ${MAX_RIWAYAT}`;
        btnTambahRiwayat.style.display = 'flex';
        updatePenomoranRiwayat();
    };

    function updatePenomoranRiwayat() {
        const items = riwayatContainer.querySelectorAll('.riwayat-item');
        items.forEach((item, index) => {
            item.querySelector('.riwayat-header span').textContent = `Riwayat Kerja ${index + 1}`;
        });
    }

    // --- 7. SIMPAN FORM USULAN (POST KE API) ---
    formBuatUsulan.addEventListener('submit', function(e) {
        e.preventDefault();
        
        btnSimpanUsulan.classList.add('loading');
        btnSimpanUsulan.disabled = true;

        const payload = {
            Nama: document.getElementById('usulNama').value,
            NIP: document.getElementById('usulNip').value,
            Pangkat: document.getElementById('usulPangkat').value,
            TMT_Pangkat: document.getElementById('usulTmtPangkat').value,
            Jabatan: document.getElementById('usulJabatan').value,
            Unor: document.getElementById('usulUnor').value,
            Unor_Induk: document.getElementById('usulUnorInduk').value,
            Nomor_WA: document.getElementById('usulWa').value
        };

        const riwayatItems = riwayatContainer.querySelectorAll('.riwayat-item');
        let totalMonthsUsul = 0;

        for(let i = 1; i <= MAX_RIWAYAT; i++) {
            payload[`RK_${i}_Instansi`] = '';
            payload[`RK_${i}_Dari`] = '';
            payload[`RK_${i}_Sampai`] = '';
            payload[`RK_${i}_Tahun_Usul`] = 0;
            payload[`RK_${i}_Bulan_Usul`] = 0;
        }

        riwayatItems.forEach((item, index) => {
            let idx = index + 1; 
            
            payload[`RK_${idx}_Instansi`] = item.querySelector('.input-instansi').value;
            payload[`RK_${idx}_Dari`] = item.querySelector('.input-dari').value;
            payload[`RK_${idx}_Sampai`] = item.querySelector('.input-sampai').value;
            
            let thn = parseInt(item.querySelector('.input-tahun').value) || 0;
            let bln = parseInt(item.querySelector('.input-bulan').value) || 0;
            
            payload[`RK_${idx}_Tahun_Usul`] = thn;
            payload[`RK_${idx}_Bulan_Usul`] = bln;

            totalMonthsUsul += (thn * 12) + bln;
        });

        payload.Total_Usul_Tahun = Math.floor(totalMonthsUsul / 12);
        payload.Total_Usul_Bulan = totalMonthsUsul % 12;

        const requestData = {
            action: isEditMode ? 'updateUsulan' : 'createUsulan',
            payload: payload
        };

        if (isEditMode) {
            requestData.payload.ID = activeUsulanId;
        }

        fetch(API_PMK_URL, {
            method: 'POST',
            body: JSON.stringify(requestData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                let msgTitle = isEditMode ? 'Usulan Diperbarui!' : 'Usulan Disimpan!';
                let msgText = isEditMode ? 'Perubahan data telah disimpan ke database.' : 'Folder berkas telah dibuatkan. Silakan unggah dokumen bukti.';

                Swal.fire({
                    icon: 'success', title: msgTitle, text: msgText, confirmButtonColor: '#3B82F6'
                }).then(() => {
                    formBuatUsulan.reset();
                    closeModal(usulanModal);
                    loadDataUsulan(); 
                });
            } else {
                Swal.fire('Gagal Menyimpan', data.message, 'error');
            }
        })
        .catch(err => Swal.fire('Error Koneksi', 'Gagal menghubungi server.', 'error'))
        .finally(() => {
            btnSimpanUsulan.classList.remove('loading');
            btnSimpanUsulan.disabled = false;
        });
    });

    // --- 8. LOGIKA MODAL TANGGAPAN PENGUSUL ---
    window.bukaModalTanggapan = function() {
        if(!currentUsulanData) return;
        inputTanggapan.value = currentUsulanData.Pengusul_Tanggapan || '';
        openModal(tanggapanModal);
    }

    if(btnCloseTanggapan) btnCloseTanggapan.addEventListener('click', () => closeModal(tanggapanModal));
    
    // Simpan Tanggapan (Memanfaatkan fitur updateUsulan dari GAS)
    if(formTanggapan) {
        formTanggapan.addEventListener('submit', function(e) {
            e.preventDefault();
            
            btnSimpanTanggapan.classList.add('loading');
            btnSimpanTanggapan.disabled = true;

            const requestData = {
                action: 'updateUsulan', // Kita pakai fungsi updateUsulan untuk menghemat API
                payload: {
                    ID: activeUsulanId,
                    Pengusul_Tanggapan: inputTanggapan.value,
                    Pengusul_Tanggal: new Date().toISOString()
                }
            };

            fetch(API_PMK_URL, {
                method: 'POST',
                body: JSON.stringify(requestData)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success', title: 'Tanggapan Terkirim!',
                        text: 'Tanggapan Anda berhasil disimpan.', confirmButtonColor: '#3B82F6'
                    }).then(() => {
                        formTanggapan.reset();
                        closeModal(tanggapanModal);
                        loadDataUsulan(); // Refresh tampilan untuk memunculkan tanggapan
                    });
                } else {
                    Swal.fire('Gagal Menyimpan', data.message, 'error');
                }
            })
            .catch(err => Swal.fire('Error', 'Gagal menghubungi server.', 'error'))
            .finally(() => {
                btnSimpanTanggapan.classList.remove('loading');
                btnSimpanTanggapan.disabled = false;
            });
        });
    }

    // --- 9. LOGOUT ---
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            Swal.fire({
                title: 'Yakin keluar?', icon: 'warning', showCancelButton: true,
                confirmButtonColor: '#3B82F6', cancelButtonColor: '#EF4444',
                confirmButtonText: 'Ya, Keluar', cancelButtonText: 'Batal'
            }).then((res) => {
                if (res.isConfirmed) {
                    sessionStorage.clear();
                    window.location.href = 'index.html';
                }
            });
        });
    }
});