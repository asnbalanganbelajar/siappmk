// --- AUTH GUARD: Proteksi Halaman ---
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'index.html';
}

// ==========================================
// KONFIGURASI URL API
// ==========================================
// GANTI DENGAN URL GAS API MASING-MASING!
const API_PMK_URL = 'https://script.google.com/macros/s/AKfycbzgMldi-CLCLUVcDFYXLIZ_nv77-xKdkjMkY50Yokm1M5yLyb5RYPD4PhvsXHxMntT5rg/exec';
const API_AUTH_URL = 'https://script.google.com/macros/s/AKfycbxgz0nkLlWB5jLT2e8Dcf9gNFwlB8FNEb6af6WwezdUZkQXtfHw-oBq1NnpXiY8guhg/exec';

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. TAMPILKAN DATA USER ---
    const userNip = sessionStorage.getItem('userNip');
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');
    const userUnorInduk = sessionStorage.getItem('userUnor'); // Cth: DISDIKBUD, DINKES
    
    if(userName) document.getElementById('displayName').textContent = userName;
    if(userRole) document.getElementById('displayRole').textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);

    // --- 2. DEKLARASI VARIABEL GLOBAL ---
    let allUsulanData = []; // Menyimpan semua data dari API
    let filteredData = [];  // Menyimpan data hasil pencarian
    let currentPage = 1;
    const itemsPerPage = 10; // Jumlah baris per halaman
    
    let activeUsulanId = '';
    let isEditMode = false;
    const MAX_RIWAYAT = 5;
    let riwayatCount = 0;

    // Elemen DOM Tabel
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const btnUnduhRekap = document.getElementById('btnUnduhRekap');
    const btnRefresh = document.querySelector('.btn-refresh');
    const tableLoadingState = document.getElementById('tableLoadingState');
    const tableEmptyState = document.getElementById('tableEmptyState');
    const paginationWrapper = document.querySelector('.pagination-wrapper');

    // Elemen DOM Modal Fasilitasi/Edit
    const btnBuatUsulanFasilitasi = document.getElementById('btnBuatUsulanFasilitasi');
    const usulanModal = document.getElementById('usulanModal');
    const btnCloseUsulan = document.getElementById('btnCloseUsulan');
    const formBuatUsulan = document.getElementById('formBuatUsulan');
    const modalUsulanTitle = document.getElementById('modalUsulanTitle');
    const inputNip = document.getElementById('usulNip');
    const inputNama = document.getElementById('usulNama');
    const nipStatus = document.getElementById('nipStatus');
    const riwayatContainer = document.getElementById('riwayatContainer');
    const btnTambahRiwayat = document.getElementById('btnTambahRiwayat');
    const riwayatCountBadge = document.getElementById('riwayatCountBadge');
    const btnSimpanUsulan = document.getElementById('btnSimpanUsulan');
    
    // Elemen DOM Modal Detail
    const detailModal = document.getElementById('detailModal');
    const btnCloseDetail = document.getElementById('btnCloseDetail');
    const btnPerbaikiData = document.getElementById('btnPerbaikiData');
    const formStatusPengelola = document.getElementById('formStatusPengelola');
    const btnSimpanStatus = document.getElementById('btnSimpanStatus');


    // ==========================================
    // 3. FUNGSI HELPER (FORMAT TANGGAL DLL)
    // ==========================================
    function formatTanggalIndo(dateStr) {
        if (!dateStr || dateStr === '') return '-';
        let d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        
        // Memaksa format menjadi DD-MM-YYYY tanpa jam
        let day = d.getDate().toString().padStart(2, '0');
        let month = (d.getMonth() + 1).toString().padStart(2, '0');
        let year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }

    // HELPER: Format tanggal ke YYYY-MM-DD untuk input type="date" (Modal Edit)
    function formatTanggalInput(dateStr) {
        if(!dateStr) return '';
        let d = new Date(dateStr);
        if(isNaN(d.getTime())) return dateStr;
        
        // Memaksa zona waktu ke GMT+8 (Asia/Makassar) agar tidak mundur sehari
        let options = { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' };
        let dStr = d.toLocaleString('en-GB', options); // Menghasilkan format DD/MM/YYYY
        
        let [day, month, year] = dStr.split('/');
        return `${year}-${month}-${day}`; // Dibalik agar sesuai standar input HTML
    }

    function getBadgeClass(status) {
        let s = (status || '').toUpperCase();
        if(s.includes('ACC')) return 'badge-acc';
        if(s.includes('TMS')) return 'badge-tms';
        if(s.includes('BTS')) return 'badge-bts';
        return 'badge-proses'; 
    }


    // ==========================================
    // 4. LOAD & RENDER TABEL UTAMA
    // ==========================================
    function loadDataTabel() {
        tableBody.innerHTML = '';
        tableEmptyState.style.display = 'none';
        paginationWrapper.style.display = 'none';
        
        // Panggil popup loading SweetAlert agar seragam dengan Pengusul
        Swal.fire({ 
            title: 'Memuat Data...', 
            allowOutsideClick: false, 
            didOpen: () => { Swal.showLoading(); }
        });
        
        // Memanggil API PMK berdasarkan Unor Induk Pengelola
        fetch(`${API_PMK_URL}?action=getUsulanByUnorInduk&unorInduk=${userUnorInduk}`)
            .then(res => res.json())
            .then(data => {
                Swal.close(); // Tutup loading saat data selesai ditarik
                
                if (data.success && data.data.length > 0) {
                    allUsulanData = data.data;
                    filteredData = [...allUsulanData];
                    currentPage = 1;
                    renderTable();
                } else {
                    tableEmptyState.style.display = 'block';
                    allUsulanData = [];
                    filteredData = [];
                }
            })
            .catch(err => {
                Swal.close(); // Tutup loading jika terjadi error
                Swal.fire('Error', 'Gagal memuat data dari server.', 'error');
            });
    }

    // Panggil saat load pertama kali
    loadDataTabel();
    if (btnRefresh) btnRefresh.addEventListener('click', loadDataTabel);

    function renderTable() {
        tableBody.innerHTML = '';
        if (filteredData.length === 0) {
            tableEmptyState.style.display = 'block';
            paginationWrapper.style.display = 'none';
            return;
        }
        tableEmptyState.style.display = 'none';
        paginationWrapper.style.display = 'flex';

        // Hitung Slice untuk Pagination
        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if(currentPage > totalPages) currentPage = totalPages;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);

        // Render Baris
        pageData.forEach(item => {
            let statPengelola = item.Pengelola_Status || 'Belum Diproses';
            let statVerifikator = item.Verifikator_Status || 'Belum Diproses';
            
            // --- STYLING CATATAN & TANGGAL (Tetap sama seperti yang sudah diperbaiki) ---
            const noteStyle = "background: #F8FAFC; padding: 6px 10px; border-radius: 6px; border: 1px solid #E2E8F0; margin-top: 6px; font-style: italic; color: #475569;";
            let notePengelola = `<div class="td-note" style="${noteStyle}">${item.Pengelola_Catatan || '-'}</div>`;
            let noteVerifikator = `<div class="td-note" style="${noteStyle}">${item.Verifikator_Catatan || '-'}</div>`;
            let noteTanggapan = `<div class="td-note" style="${noteStyle}">${item.Pengusul_Tanggapan || '-'}</div>`;
            
            let tglPengelola = item.Pengelola_Tanggal ? `<div class="td-date-small" style="margin-top: 4px; color: #64748B;"><i class="far fa-calendar-alt"></i> ${formatTanggalIndo(item.Pengelola_Tanggal)}</div>` : '';
            let tglVerifikator = item.Verifikator_Tanggal ? `<div class="td-date-small" style="margin-top: 4px; color: #64748B;"><i class="far fa-calendar-alt"></i> ${formatTanggalIndo(item.Verifikator_Tanggal)}</div>` : '';
            let tglTanggapan = item.Pengusul_Tanggal ? `<div class="td-date-small" style="margin-top: 4px; color: #64748B;"><i class="far fa-calendar-alt"></i> ${formatTanggalIndo(item.Pengusul_Tanggal)}</div>` : '';
            
            // --- TAMBAHAN BARU: Logika Sembunyikan Tombol SK ---
            let btnSkHtml = '';
            if (item.URL_SK && item.URL_SK.trim() !== '') {
                btnSkHtml = `<button class="btn-cell btn-cell-sk" title="Lihat SK" onclick="window.open('${item.URL_SK}', '_blank')"><i class="fas fa-file-signature"></i></button>`;
            }

            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="td-id">${item.ID}</div>
                    <div class="td-date"><i class="far fa-calendar-alt"></i> ${formatTanggalIndo(item.Timestamp)}</div>
                </td>
                <td>
                    <div class="td-name">${item.Nama}</div>
                    <div class="td-sub">${item.NIP}</div>
                    <div class="td-sub text-muted">${item.Unor}</div>
                </td>
                <td>
                    <span class="badge ${getBadgeClass(statPengelola)}">${statPengelola}</span>
                    ${notePengelola}
                    ${tglPengelola}
                </td>
                <td>
                    <span class="badge ${getBadgeClass(statVerifikator)}">${statVerifikator}</span>
                    ${noteVerifikator}
                    ${tglVerifikator}
                </td>
                <td>
                    ${noteTanggapan}
                    ${tglTanggapan}
                </td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-cell btn-cell-detail" title="Detail & Verifikasi" onclick="openDetailModal('${item.ID}')"><i class="fas fa-search"></i></button>
                        <button class="btn-cell btn-cell-folder" title="Buka Berkas" onclick="window.open('${item.URL_Berkas}', '_blank')"><i class="fas fa-folder-open"></i></button>
                        
                        ${btnSkHtml} <!-- Memanggil tombol SK HANYA JIKA ADA -->
                        
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        renderPagination(totalItems, totalPages, startIndex, endIndex);
    }

    // --- PENCARIAN & PAGINATION ---
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const keyword = this.value.toLowerCase();
            filteredData = allUsulanData.filter(item => {
                return (item.Nama.toLowerCase().includes(keyword) || 
                        item.NIP.toLowerCase().includes(keyword) || 
                        item.ID.toLowerCase().includes(keyword));
            });
            currentPage = 1; // Kembali ke hal 1 setiap kali mencari
            renderTable();
        });
    }

    function renderPagination(totalItems, totalPages, startIndex, endIndex) {
        const info = document.querySelector('.pagination-info');
        const ul = document.querySelector('.pagination');
        ul.innerHTML = '';
        
        let actualEnd = endIndex > totalItems ? totalItems : endIndex;
        info.textContent = `Menampilkan ${startIndex + 1}-${actualEnd} dari ${totalItems} data`;

        // Tombol Prev
        let prevLi = document.createElement('li');
        prevLi.innerHTML = `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}"><i class="fas fa-chevron-left"></i> Prev</button>`;
        if(currentPage > 1) prevLi.addEventListener('click', () => { currentPage--; renderTable(); });
        ul.appendChild(prevLi);

        // Angka Halaman (Sederhana)
        for(let i = 1; i <= totalPages; i++) {
            let li = document.createElement('li');
            li.innerHTML = `<button class="page-btn ${currentPage === i ? 'active' : ''}">${i}</button>`;
            if(currentPage !== i) li.addEventListener('click', () => { currentPage = i; renderTable(); });
            ul.appendChild(li);
        }

        // Tombol Next
        let nextLi = document.createElement('li');
        nextLi.innerHTML = `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}">Next <i class="fas fa-chevron-right"></i></button>`;
        if(currentPage < totalPages) nextLi.addEventListener('click', () => { currentPage++; renderTable(); });
        ul.appendChild(nextLi);
    }


    // ==========================================
    // 5. MODAL DETAIL & VERIFIKASI PENGELOLA
    // ==========================================
    function openModal(modal) {
        modal.style.display = 'flex';
        setTimeout(() => { modal.classList.add('show'); }, 10);
    }
    function closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 400);
    }

    if(btnCloseDetail) btnCloseDetail.addEventListener('click', () => closeModal(detailModal));

    window.openDetailModal = function(id) {
        const data = allUsulanData.find(item => item.ID === id);
        if(!data) return;
        
        activeUsulanId = id;
        
        // Render Konten Detail Modal
        const headerCard = detailModal.querySelector('.usulan-header');
        headerCard.innerHTML = `
            <span class="usulan-id"><i class="fas fa-hashtag btn-icon"></i> ID: ${data.ID}</span>
            <span class="usulan-date"><i class="far fa-calendar-alt btn-icon"></i> ${formatTanggalIndo(data.Timestamp)}</span>
        `;
        
        const bodyCard = detailModal.querySelector('.usulan-body');
        
        let riwayatHtml = '';
        for(let i = 1; i <= 5; i++) {
            let instansi = data[`RK_${i}_Instansi`];
            if(instansi) {
                let d = formatTanggalIndo(data[`RK_${i}_Dari`]);
                let s = formatTanggalIndo(data[`RK_${i}_Sampai`]);
                let t = data[`RK_${i}_Tahun_Usul`];
                let b = data[`RK_${i}_Bulan_Usul`];
                riwayatHtml += `<li><strong>${instansi}</strong><span>${d} s.d. ${s} (${t} Tahun, ${b} Bulan)</span></li>`;
            }
        }

        bodyCard.innerHTML = `
            <div class="form-grid">
                <div>
                    <h4 style="margin-bottom: 12px; color: #0F172A; border-bottom: 2px solid #F1F5F9; padding-bottom: 5px;"><i class="fas fa-id-badge"></i> Data Pengusul</h4>
                    <table class="info-table">
                        <tr><td>Nama</td><td>: ${data.Nama}</td></tr>
                        <tr><td>NIP</td><td>: ${data.NIP}</td></tr>
                        <tr><td>Pangkat</td><td>: ${data.Pangkat}</td></tr>
                        <tr><td>TMT Pangkat</td><td>: ${formatTanggalIndo(data.TMT_Pangkat)}</td></tr>
                        <tr><td>Jabatan</td><td>: ${data.Jabatan}</td></tr>
                        <tr><td>Unor</td><td>: ${data.Unor}</td></tr>
                        <tr><td>Nomor WA</td><td>: ${data.Nomor_WA}</td></tr>
                    </table>
                </div>
                <div>
                    <h4 style="margin-bottom: 12px; color: #0F172A; border-bottom: 2px solid #F1F5F9; padding-bottom: 5px;"><i class="fas fa-briefcase"></i> Riwayat Kerja Sebelum CPNS</h4>
                    <ul class="experience-list">${riwayatHtml}</ul>
                </div>
            </div>
        `;

        // Pre-fill form verifikasi jika sudah pernah diverif
        document.getElementById('statusPengelola').value = (data.Pengelola_Status && data.Pengelola_Status !== 'Belum Diproses') ? data.Pengelola_Status : "";
        document.getElementById('catatanPengelola').value = data.Pengelola_Catatan || "";

        openModal(detailModal);
    }

    // SIMPAN VERIFIKASI PENGELOLA
    if(formStatusPengelola) {
        formStatusPengelola.addEventListener('submit', function(e) {
            e.preventDefault();
            btnSimpanStatus.classList.add('loading');
            btnSimpanStatus.disabled = true;

            const requestData = {
                action: 'updateUsulan',
                payload: {
                    ID: activeUsulanId,
                    Pengelola_Status: document.getElementById('statusPengelola').value,
                    Pengelola_Catatan: document.getElementById('catatanPengelola').value,
                    Pengelola_Tanggal: new Date().toISOString()
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
                        icon: 'success', title: 'Status Diperbarui', 
                        text: 'Verifikasi Pengelola berhasil disimpan.', confirmButtonColor: '#3B82F6', timer: 1500
                    }).then(() => {
                        closeModal(detailModal);
                        loadDataTabel(); // Refresh tabel
                    });
                } else {
                    Swal.fire('Gagal', data.message, 'error');
                }
            })
            .catch(err => Swal.fire('Error', 'Gagal menghubungi server.', 'error'))
            .finally(() => {
                btnSimpanStatus.classList.remove('loading');
                btnSimpanStatus.disabled = false;
            });
        });
    }


    // ==========================================
    // 6. MODAL FASILITASI & PERBAIKI DATA
    // ==========================================
    if(btnCloseUsulan) btnCloseUsulan.addEventListener('click', () => closeModal(usulanModal));

    // Buka Modal Fasilitasi (Buat Baru)
    if(btnBuatUsulanFasilitasi) {
        btnBuatUsulanFasilitasi.addEventListener('click', function() {
            isEditMode = false;
            activeUsulanId = '';
            modalUsulanTitle.textContent = 'Fasilitasi Buat Usulan PMK';
            formBuatUsulan.reset();
            
            inputNip.readOnly = false;
            inputNip.classList.remove('input-readonly');
            inputNama.value = ''; 
            nipStatus.style.display = 'none'; 
            
            // Kunci Unor Induk ke milik Pengelola
            document.getElementById('usulUnorInduk').value = userUnorInduk;
            
            riwayatContainer.innerHTML = '';
            riwayatCount = 0;
            tambahRiwayat();

            openModal(usulanModal);
        });
    }

    // Pencarian NIP Otomatis (Fasilitasi) ke API Auth
    if(inputNip) {
        inputNip.addEventListener('input', function() {
            if(isEditMode) return; 
            this.value = this.value.replace(/[^0-9]/g, '');
            
            if (this.value.length === 18) {
                nipStatus.style.display = 'block';
                inputNama.value = ''; 
                inputNama.placeholder = 'Mencari ke database...';

                fetch(`${API_AUTH_URL}?action=getUserByNip&nip=${this.value}`)
                .then(res => res.json())
                .then(data => {
                    nipStatus.style.display = 'none';
                    if(data.success && data.data) {
                        if(data.data.status.toUpperCase() !== 'PNS') {
                            Swal.fire('Peringatan', 'Pegawai ini terdaftar sebagai ' + data.data.status + '. PMK hanya untuk PNS.', 'warning');
                            inputNama.value = '';
                            inputNama.placeholder = 'Bukan PNS';
                        } else {
                            inputNama.value = data.data.nama;
                        }
                    } else {
                        inputNama.placeholder = 'NIP Tidak Ditemukan';
                    }
                }).catch(err => {
                    nipStatus.style.display = 'none';
                    inputNama.placeholder = 'Gagal memuat NIP';
                });
            } else {
                inputNama.value = '';
                inputNama.placeholder = 'Otomatis terisi jika NIP ditemukan';
                nipStatus.style.display = 'none';
            }
        });
    }

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

    // Tombol "Perbaiki Data" di dalam Modal Detail
    if(btnPerbaikiData) {
        btnPerbaikiData.addEventListener('click', function() {
            closeModal(detailModal); // Tutup modal detail

            const data = allUsulanData.find(item => item.ID === activeUsulanId);
            if(!data) return;

            isEditMode = true;
            modalUsulanTitle.textContent = 'Fasilitasi Edit Usulan PMK';
            formBuatUsulan.reset();
            
            inputNip.readOnly = true;
            inputNip.classList.add('input-readonly');
            nipStatus.style.display = 'none';

            // Isi Data
            inputNip.value = data.NIP;
            inputNama.value = data.Nama;
            document.getElementById('usulPangkat').value = data.Pangkat || '';
            document.getElementById('usulTmtPangkat').value = formatTanggalInput(data.TMT_Pangkat);
            document.getElementById('usulJabatan').value = data.Jabatan || '';
            document.getElementById('usulUnor').value = data.Unor || '';
            document.getElementById('usulUnorInduk').value = data.Unor_Induk || '';
            document.getElementById('usulWa').value = (data.Nomor_WA || '').toString().replace(/'/g, '');
            
            // Isi Riwayat
            riwayatContainer.innerHTML = '';
            riwayatCount = 0;
            let adaRiwayat = false;
            for(let i = 1; i <= MAX_RIWAYAT; i++) {
                let instansi = data[`RK_${i}_Instansi`];
                if(instansi && instansi.trim() !== '') {
                    adaRiwayat = true;
                    tambahRiwayat({
                        instansi: instansi,
                        dari: formatTanggalInput(data[`RK_${i}_Dari`]),
                        sampai: formatTanggalInput(data[`RK_${i}_Sampai`])
                    });
                }
            }
            if(!adaRiwayat) tambahRiwayat(null);

            // Beri waktu sejenak sebelum membuka form edit agar modal detail tertutup rapi
            setTimeout(() => { openModal(usulanModal); }, 400);
        });
    }


    // ==========================================
    // 7. FUNGSI RIWAYAT KERJA DINAMIS
    // ==========================================
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
        if (dataLoad) hitungDurasi(id);
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

    // ==========================================
    // 8. SUBMIT FORM (FASILITASI / EDIT) KE API
    // ==========================================
    if(formBuatUsulan) {
        formBuatUsulan.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if(!inputNama.value || inputNama.value === 'NIP Tidak Ditemukan' || inputNama.value === 'Bukan PNS') {
                Swal.fire('Periksa NIP', 'Pastikan NIP ditemukan dan valid (PNS).', 'warning');
                return;
            }

            btnSimpanUsulan.classList.add('loading');
            btnSimpanUsulan.disabled = true;

            const payload = {
                Nama: inputNama.value,
                NIP: inputNip.value,
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
            if (isEditMode) requestData.payload.ID = activeUsulanId;

            fetch(API_PMK_URL, {
                method: 'POST',
                body: JSON.stringify(requestData)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    let msgTitle = isEditMode ? 'Data Diperbarui!' : 'Fasilitasi Usulan Berhasil!';
                    Swal.fire({
                        icon: 'success', title: msgTitle, text: 'Data telah disimpan ke database.', confirmButtonColor: '#3B82F6'
                    }).then(() => {
                        formBuatUsulan.reset();
                        closeModal(usulanModal);
                        loadDataTabel(); 
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
    }

    // ==========================================
    // 9. FITUR LOGOUT
    // ==========================================
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

    // ==========================================
    // 10. FITUR UNDUH REKAP EXCEL
    // ==========================================
    if (btnUnduhRekap) {
        btnUnduhRekap.addEventListener('click', function() {
            // Cek apakah ada data yang tampil di tabel
            if (filteredData.length === 0) {
                Swal.fire('Data Kosong', 'Tidak ada data usulan untuk diunduh.', 'warning');
                return;
            }

            // 1. Mapping / Menyusun Data sesuai Kolom yang Disepakati
            const excelData = filteredData.map((item, index) => {
                // Tentukan Status Terakhir yang paling relevan
                let statusTerakhir = item.Pengelola_Status || 'Belum Diproses';
                if (item.Verifikator_Status && item.Verifikator_Status !== 'Belum Diproses' && item.Verifikator_Status !== '') {
                    statusTerakhir = `Verifikator: ${item.Verifikator_Status}`;
                } else {
                    statusTerakhir = `Pengelola: ${statusTerakhir}`;
                }

                // Gabungkan Catatan Pengelola dan Verifikator dengan baris baru (Enter)
                let catatanGabungan = [];
                if (item.Pengelola_Catatan) catatanGabungan.push(`Pengelola: ${item.Pengelola_Catatan}`);
                if (item.Verifikator_Catatan) catatanGabungan.push(`Verifikator: ${item.Verifikator_Catatan}`);
                let catatanAkhir = catatanGabungan.length > 0 ? catatanGabungan.join('\n') : '-';

                return {
                    "No.": index + 1,
                    "NIP": "'" + item.NIP, // Tanda petik agar NIP tidak jadi angka eksponensial di Excel
                    "Nama Pegawai": item.Nama || "-",
                    "Unit Kerja (Unor)": item.Unor || "-",
                    "Total Usulan PMK": `${item.Total_Usul_Tahun || 0} Tahun, ${item.Total_Usul_Bulan || 0} Bulan`,
                    "Status Terakhir": statusTerakhir,
                    "Catatan Perbaikan": catatanAkhir,
                    "Tanggapan Pengusul": item.Pengusul_Tanggapan || "-",
                    "Tanggal Masuk": formatTanggalIndo(item.Timestamp),
                    "Tanggal Diproses": item.Pengelola_Tanggal ? formatTanggalIndo(item.Pengelola_Tanggal) : "-"
                };
            });

            // 2. Buat Lembar Kerja Excel
            const ws = XLSX.utils.json_to_sheet(excelData);
            
            // Mengatur lebar kolom agar rapi saat dibuka
            const wscols = [
                {wch: 5},   // No
                {wch: 22},  // NIP
                {wch: 30},  // Nama
                {wch: 25},  // Unor
                {wch: 20},  // Total Usulan
                {wch: 25},  // Status
                {wch: 50},  // Catatan
                {wch: 35},  // Tanggapan
                {wch: 15},  // Tgl Masuk
                {wch: 15}   // Tgl Proses
            ];
            ws['!cols'] = wscols;

            // 3. Gabungkan ke Buku Kerja dan Unduh
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Rekap Usulan");

            // Generate nama file dinamis dengan tanggal hari ini
            let dateNow = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
            let fileName = `Rekap_PMK_${userUnorInduk}_${dateNow}.xlsx`;

            XLSX.writeFile(wb, fileName);
        });
    }

}); // Batas akhir DOMContentLoaded