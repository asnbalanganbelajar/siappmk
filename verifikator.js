// --- AUTH GUARD: Proteksi Halaman ---
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'index.html';
}

const API_PMK_URL = 'https://script.google.com/macros/s/AKfycbzgMldi-CLCLUVcDFYXLIZ_nv77-xKdkjMkY50Yokm1M5yLyb5RYPD4PhvsXHxMntT5rg/exec';

// TAMBAHAN: API Database User untuk Manajemen Pengaturan
const API_USER_URL = 'https://script.google.com/macros/s/AKfycbxgz0nkLlWB5jLT2e8Dcf9gNFwlB8FNEb6af6WwezdUZkQXtfHw-oBq1NnpXiY8guhg/exec';

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. TAMPILKAN DATA USER ---
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');
    
    if(userName) document.getElementById('displayName').textContent = userName;
    if(userRole) document.getElementById('displayRole').textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);

    // --- 2. DEKLARASI VARIABEL GLOBAL ---
    let allUsulanData = []; 
    let filteredData = [];  
    let currentPage = 1;
    const itemsPerPage = 10;
    let activeUsulanId = '';

    // Elemen DOM Tabel
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const btnRefresh = document.querySelector('.btn-refresh');
    const tableEmptyState = document.getElementById('tableEmptyState');
    const paginationWrapper = document.querySelector('.pagination-wrapper');
    const btnUnduhRekap = document.getElementById('btnUnduhRekap');

    // Elemen Modal & Form
    const btnInfoStatistik = document.getElementById('btnInfoStatistik');
    const statistikModal = document.getElementById('statistikModal');
    const btnSettings = document.getElementById('btnSettings');
    const pengaturanModal = document.getElementById('pengaturanModal');
    
    const detailModal = document.getElementById('detailModal');
    const btnBukaBerkasModal = document.getElementById('btnBukaBerkasModal');
    const formVerifikasi = document.getElementById('formVerifikasi');
    const btnSimpanVerifikasi = document.getElementById('btnSimpanVerifikasi');
    const containerVerifMasaKerja = document.getElementById('containerVerifMasaKerja');
    const totalVerifTahun = document.getElementById('totalVerifTahun');
    const totalVerifBulan = document.getElementById('totalVerifBulan');


    // ==========================================
    // 3. FUNGSI HELPER (FORMAT TANGGAL DLL)
    // ==========================================
    function formatTanggalIndo(dateStr, includeTime = false) {
        if (!dateStr || dateStr === '') return '-';
        let d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        
        let optionsDate = { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' };
        let dStr = d.toLocaleString('en-GB', optionsDate); 
        let [day, month, year] = dStr.split('/');
        let result = `${day}-${month}-${year}`;
        
        if (includeTime) {
            let optionsTime = { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hour12: false };
            let timeStr = d.toLocaleTimeString('en-GB', optionsTime);
            result += ` ${timeStr}`;
        }
        return result;
    }

    function getBadgeClass(status) {
        let s = (status || '').toUpperCase();
        if(s.includes('ACC') || s.includes('SELESAI')) return 'badge-acc';
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
        
        Swal.fire({ title: 'Memuat Data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
        
        // Panggil Fungsi Baru: getAllUsulan
        fetch(`${API_PMK_URL}?action=getAllUsulan`)
            .then(res => res.json())
            .then(data => {
                Swal.close();
                if (data.success && data.data.length > 0) {
                    allUsulanData = data.data;
                    filteredData = [...allUsulanData];
                    currentPage = 1;
                    renderTable();
                    hitungStatistik(); // Update Dashboard Modal
                } else {
                    tableEmptyState.style.display = 'block';
                    allUsulanData = [];
                    filteredData = [];
                }
            })
            .catch(err => {
                Swal.close();
                Swal.fire('Error', 'Gagal memuat data dari server.', 'error');
            });
    }

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

        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if(currentPage > totalPages) currentPage = totalPages;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);

        pageData.forEach(item => {
            let statPengelola = item.Pengelola_Status || 'Belum Diproses';
            let statVerifikator = item.Verifikator_Status || 'Belum Diproses';
            
            const noteStyle = "background: #F8FAFC; padding: 6px 10px; border-radius: 6px; border: 1px solid #E2E8F0; margin-top: 6px; font-style: italic; color: #475569;";
            let notePengelola = `<div class="td-note" style="${noteStyle}">${item.Pengelola_Catatan || '-'}</div>`;
            let noteVerifikator = `<div class="td-note" style="${noteStyle}">${item.Verifikator_Catatan || '-'}</div>`;
            let noteTanggapan = `<div class="td-note" style="${noteStyle}">${item.Pengusul_Tanggapan || '-'}</div>`;
            
            let tglPengelola = item.Pengelola_Tanggal ? `<div class="td-date-small" style="margin-top: 4px; color: #64748B;"><i class="far fa-calendar-alt"></i> ${formatTanggalIndo(item.Pengelola_Tanggal)}</div>` : '';
            let tglVerifikator = item.Verifikator_Tanggal ? `<div class="td-date-small" style="margin-top: 4px; color: #64748B;"><i class="far fa-calendar-alt"></i> ${formatTanggalIndo(item.Verifikator_Tanggal)}</div>` : '';
            let tglTanggapan = item.Pengusul_Tanggal ? `<div class="td-date-small" style="margin-top: 4px; color: #64748B;"><i class="far fa-calendar-alt"></i> ${formatTanggalIndo(item.Pengusul_Tanggal)}</div>` : '';
            
            let btnSkHtml = '';
            if (item.URL_SK && item.URL_SK.trim() !== '') {
                btnSkHtml = `<button class="btn-cell btn-cell-sk" title="Lihat SK" onclick="window.open('${item.URL_SK}', '_blank')"><i class="fas fa-file-signature"></i></button>`;
            }

            // Keterangan Internal Sesama Verifikator
            let internalNote = item.Keterangan_Internal ? `<div class="td-note" style="border-left: 3px solid #8B5CF6; background: #F5F3FF; padding: 6px; border-radius:4px; font-style:italic;">${item.Keterangan_Internal}</div>` : '-';

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
                    <div class="td-sub text-muted" style="font-weight:600; margin-top:2px;">${item.Unor_Induk}</div>
                </td>
                <td>
                    <span class="badge ${getBadgeClass(statPengelola)}">${statPengelola}</span>
                    ${notePengelola} ${tglPengelola}
                </td>
                <td>
                    <span class="badge ${getBadgeClass(statVerifikator)}">${statVerifikator}</span>
                    ${noteVerifikator} ${tglVerifikator}
                </td>
                <td>
                    ${noteTanggapan} ${tglTanggapan}
                </td>
                <td>${internalNote}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-cell btn-cell-detail" title="Detail & Verifikasi" onclick="openDetailModal('${item.ID}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-cell btn-cell-folder" title="Buka Berkas" onclick="window.open('${item.URL_Berkas}', '_blank')"><i class="fas fa-folder-open"></i></button>
                        ${btnSkHtml}
                        <button class="btn-cell btn-cell-delete" title="Hapus Usulan" onclick="hapusUsulan('${item.ID}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
        renderPagination(totalItems, totalPages, startIndex, endIndex);
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const keyword = this.value.toLowerCase();
            filteredData = allUsulanData.filter(item => {
                return (item.Nama.toLowerCase().includes(keyword) || 
                        item.NIP.toLowerCase().includes(keyword) || 
                        item.Unor_Induk.toLowerCase().includes(keyword) || 
                        item.ID.toLowerCase().includes(keyword));
            });
            currentPage = 1; 
            renderTable();
        });
    }

    function renderPagination(totalItems, totalPages, startIndex, endIndex) {
        const info = document.querySelector('.pagination-info');
        const ul = document.querySelector('.pagination');
        ul.innerHTML = '';
        
        let actualEnd = endIndex > totalItems ? totalItems : endIndex;
        info.textContent = `Menampilkan ${startIndex + 1}-${actualEnd} dari ${totalItems} data`;

        let prevLi = document.createElement('li');
        prevLi.innerHTML = `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}"><i class="fas fa-chevron-left"></i> Prev</button>`;
        if(currentPage > 1) prevLi.addEventListener('click', () => { currentPage--; renderTable(); });
        ul.appendChild(prevLi);

        for(let i = 1; i <= totalPages; i++) {
            let li = document.createElement('li');
            li.innerHTML = `<button class="page-btn ${currentPage === i ? 'active' : ''}">${i}</button>`;
            if(currentPage !== i) li.addEventListener('click', () => { currentPage = i; renderTable(); });
            ul.appendChild(li);
        }

        let nextLi = document.createElement('li');
        nextLi.innerHTML = `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}">Next <i class="fas fa-chevron-right"></i></button>`;
        if(currentPage < totalPages) nextLi.addEventListener('click', () => { currentPage++; renderTable(); });
        ul.appendChild(nextLi);
    }


    // ==========================================
    // 5. MODAL STATISTIK (Dinamis dari Data)
    // ==========================================
    function hitungStatistik() {
        let tTotal = allUsulanData.length;
        let tProses = 0; let tAcc = 0; let tBts = 0; let tTms = 0;

        allUsulanData.forEach(item => {
            let stat = (item.Verifikator_Status || '').toUpperCase();
            if (stat.includes('ACC') || stat.includes('SELESAI')) tAcc++;
            else if (stat.includes('BTS')) tBts++;
            else if (stat.includes('TMS')) tTms++;
            else tProses++; 
        });

        document.getElementById('statTotal').textContent = tTotal;
        document.getElementById('statProses').textContent = tProses;
        document.getElementById('statAcc').textContent = tAcc;
        document.getElementById('statBts').textContent = tBts;
        document.getElementById('statTms').textContent = tTms;
    }

    function bukaModal(modal) { modal.style.display = 'flex'; setTimeout(() => { modal.classList.add('show'); }, 10); }
    function tutupModal(modal) { modal.classList.remove('show'); setTimeout(() => { modal.style.display = 'none'; }, 400); }

    const bindModal = (btn, modal, closeBtn) => {
        if(btn) btn.addEventListener('click', () => bukaModal(modal));
        if(closeBtn) closeBtn.addEventListener('click', () => tutupModal(modal));
        if(modal) modal.addEventListener('click', (e) => { if(e.target === modal) tutupModal(modal); });
    }

    bindModal(btnInfoStatistik, statistikModal, document.getElementById('btnCloseStatistik'));
    bindModal(btnSettings, pengaturanModal, document.getElementById('btnClosePengaturan'));
    bindModal(null, detailModal, document.getElementById('btnCloseDetail')); // Detail dibuka via JS

    // --- 6. LOGIKA MODAL PENGATURAN ---
    // Variabel DOM Pengaturan
    const adminSearchNip = document.getElementById('adminSearchNip');
    const btnAdminSearchUser = document.getElementById('btnAdminSearchUser');
    const adminUserResult = document.getElementById('adminUserResult');
    const adminSelectRole = document.getElementById('adminSelectRole');
    const adminInputUnor = document.getElementById('adminInputUnor'); // Tambahan Variabel
    let currentAdminTargetNip = '';

    // A. Fungsi Cari Pegawai
    if(btnAdminSearchUser) {
        btnAdminSearchUser.addEventListener('click', function() {
            let nipTarget = adminSearchNip.value.trim();
            if (nipTarget === '') return Swal.fire('Oops!', 'Masukkan NIP terlebih dahulu.', 'warning');

            btnAdminSearchUser.classList.add('loading');
            btnAdminSearchUser.disabled = true;

            fetch(API_USER_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'adminSearchUser', nip: nipTarget })
            }).then(res => res.json()).then(data => {
                if(data.success) {
                    currentAdminTargetNip = data.data.nip;
                    document.getElementById('adminResNama').innerHTML = `<i class="fas fa-user-circle"></i> ${data.data.nama}`;
                    
                    let currentRole = data.data.role || "Pengusul";
                    currentRole = currentRole.charAt(0).toUpperCase() + currentRole.slice(1).toLowerCase();
                    adminSelectRole.value = currentRole;
                    
                    // Set nilai Unor dari database
                    adminInputUnor.value = data.data.unor || "";
                    
                    adminUserResult.style.display = 'block';
                } else {
                    adminUserResult.style.display = 'none';
                    Swal.fire('Tidak Ditemukan', data.message, 'error');
                }
            }).catch(err => Swal.fire('Error', 'Gagal memuat data pengguna.', 'error'))
              .finally(() => {
                  btnAdminSearchUser.classList.remove('loading');
                  btnAdminSearchUser.disabled = false;
              });
        });
    }

    // Otomatisasi Unor untuk Verifikator
    if (adminSelectRole) {
        adminSelectRole.addEventListener('change', function() {
            if (this.value === 'Verifikator') {
                adminInputUnor.value = 'INSTANSI';
                // Beri efek highlight agar user sadar ada perubahan
                adminInputUnor.style.backgroundColor = '#FEF3C7'; 
                setTimeout(() => adminInputUnor.style.backgroundColor = '#FFFFFF', 800);
            }
        });
    }

    // B. Fungsi Simpan Role & Unor Baru
    const btnAdminSaveRole = document.getElementById('btnAdminSaveRole');
    if(btnAdminSaveRole) {
        btnAdminSaveRole.addEventListener('click', function() {
            let updatedUnor = adminInputUnor.value.trim();
            if(updatedUnor === '') return Swal.fire('Oops!', 'Unor Induk tidak boleh kosong.', 'warning');

            Swal.fire({
                title: 'Simpan Perubahan?',
                text: `Data akan diubah menjadi Role: ${adminSelectRole.value} dan Unor: ${updatedUnor}.`,
                icon: 'question', showCancelButton: true, confirmButtonColor: '#3B82F6', confirmButtonText: 'Ya, Simpan'
            }).then((res) => {
                if(res.isConfirmed) {
                    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    fetch(API_USER_URL, {
                        method: 'POST',
                        body: JSON.stringify({ 
                            action: 'adminUpdateRole', 
                            nip: currentAdminTargetNip, 
                            role: adminSelectRole.value,
                            unor: updatedUnor // Kirim Unor baru ke GAS
                        })
                    }).then(r => r.json()).then(d => {
                        if(d.success) Swal.fire('Berhasil!', d.message, 'success');
                        else Swal.fire('Gagal', d.message, 'error');
                    });
                }
            });
        });
    }

    // C. Fungsi Reset Password
    const btnAdminResetPass = document.getElementById('btnAdminResetPass');
    if(btnAdminResetPass) {
        btnAdminResetPass.addEventListener('click', function() {
            Swal.fire({
                title: 'Reset Password?',
                html: 'Password akan dikembalikan ke default (8 digit pertama NIP) dan pengguna akan diminta mengubah password saat login berikutnya.',
                icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Ya, Reset'
            }).then((res) => {
                if(res.isConfirmed) {
                    Swal.fire({ title: 'Mereset...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    fetch(API_USER_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'adminResetPassword', nip: currentAdminTargetNip })
                    }).then(r => r.json()).then(d => {
                        if(d.success) Swal.fire('Di-reset!', d.message, 'success');
                        else Swal.fire('Gagal', d.message, 'error');
                    });
                }
            });
        });
    }

    // ==========================================
    // 6. MODAL VERIFIKASI & MASA KERJA DISETUJUI
    // ==========================================
    window.openDetailModal = function(id) {
        const data = allUsulanData.find(item => item.ID === id);
        if(!data) return;
        
        activeUsulanId = id;
        formVerifikasi.reset();
        
        // 1. Tampilkan Header & Info Diri
        const headerCard = detailModal.querySelector('.usulan-header');
        headerCard.innerHTML = `<span class="usulan-id"><i class="fas fa-hashtag btn-icon"></i> ID: ${data.ID}</span>
                                <span class="usulan-date"><i class="far fa-calendar-alt btn-icon"></i> ${formatTanggalIndo(data.Timestamp)}</span>`;
        
        // Fungsi Tarik Berkas via tombol dalam Modal
        btnBukaBerkasModal.onclick = () => window.open(data.URL_Berkas, '_blank');

        let riwayatHtml = '';
        containerVerifMasaKerja.innerHTML = ''; 
        let indexVerif = 1;

        for(let i = 1; i <= 5; i++) {
            let instansi = data[`RK_${i}_Instansi`];
            if(instansi && instansi.trim() !== '') {
                // Info Riwayat untuk Card Atas
                let d = formatTanggalIndo(data[`RK_${i}_Dari`]);
                let s = formatTanggalIndo(data[`RK_${i}_Sampai`]);
                let t = data[`RK_${i}_Tahun_Usul`] || 0;
                let b = data[`RK_${i}_Bulan_Usul`] || 0;
                riwayatHtml += `<li><strong>${instansi}</strong><span>${d} s.d. ${s} (${t} Tahun, ${b} Bulan)</span></li>`;
                
                // Form Input Hitungan Disetujui (Bagian Bawah)
                // Sesuaikan dengan nama kolom Verif_RK_...
                let savedT = data[`Verif_RK_${i}_Tahun`] !== undefined ? data[`Verif_RK_${i}_Tahun`] : t;
                let savedB = data[`Verif_RK_${i}_Bulan`] !== undefined ? data[`Verif_RK_${i}_Bulan`] : b;
                let savedJenis = data[`Verif_RK_${i}_Jenis`] || ""; 

                const formHtml = `
                    <div class="input-group" style="margin-bottom: 12px;">
                        <label style="font-size: 0.85rem; color: #475569; font-weight: 600;">Masa Kerja Disetujui ${indexVerif} <span style="font-weight:normal; font-style:italic;">(${instansi})</span></label>
                        <div class="duration-flex">
                            <select id="accJenis_${i}" class="verif-jenis-instansi" required style="background-color: #FFFFFF;">
                                <option value="" disabled ${!savedJenis ? 'selected' : ''}>-- Jenis --</option>
                                <option value="Negeri" ${savedJenis === 'Negeri' ? 'selected' : ''}>Negeri</option>
                                <option value="Swasta" ${savedJenis === 'Swasta' ? 'selected' : ''}>Swasta</option>
                            </select>
                            <input type="number" id="accThn_${i}" class="verif-input-tahun" value="${savedT}" min="0" oninput="hitungTotalVerifikasi()" required style="background-color: #FFFFFF;">
                            <input type="number" id="accBln_${i}" class="verif-input-bulan" value="${savedB}" min="0" max="11" oninput="hitungTotalVerifikasi()" required style="background-color: #FFFFFF;">
                        </div>
                    </div>`;
                containerVerifMasaKerja.insertAdjacentHTML('beforeend', formHtml);
                indexVerif++;
            }
        }

        const bodyCard = detailModal.querySelector('.usulan-body');
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
                        <tr><td>Unor Induk</td><td>: <strong>${data.Unor_Induk}</strong></td></tr>
                        <tr><td>No. WA</td><td>: ${data.Nomor_WA}</td></tr>
                    </table>
                </div>
                <div>
                    <h4 style="margin-bottom: 12px; color: #0F172A; border-bottom: 2px solid #F1F5F9; padding-bottom: 5px;"><i class="fas fa-briefcase"></i> Riwayat Kerja (Usulan)</h4>
                    <ul class="experience-list">${riwayatHtml}</ul>
                </div>
            </div>
        `;

        // 2. Pre-fill Form Status
        document.getElementById('statusVerifikator').value = (data.Verifikator_Status && data.Verifikator_Status !== 'Belum Diproses') ? data.Verifikator_Status : "";
        document.getElementById('catatanEksternal').value = data.Verifikator_Catatan || "";
        document.getElementById('catatanInternal').value = data.Keterangan_Internal || ""; // Sesuai sheet

        // Hitung total langsung
        hitungTotalVerifikasi();
        bukaModal(detailModal);
    }

    window.hitungTotalVerifikasi = function() {
        let totalMonths = 0;
        const inputTahuns = document.querySelectorAll('.verif-input-tahun');
        const inputBulans = document.querySelectorAll('.verif-input-bulan');

        for(let i = 0; i < inputTahuns.length; i++) {
            totalMonths += ((parseInt(inputTahuns[i].value) || 0) * 12) + (parseInt(inputBulans[i].value) || 0);
        }
        totalVerifTahun.value = Math.floor(totalMonths / 12) + " Tahun";
        totalVerifBulan.value = (totalMonths % 12) + " Bulan";
    };

    if(formVerifikasi) {
        formVerifikasi.addEventListener('submit', function(e) {
            e.preventDefault();
            btnSimpanVerifikasi.classList.add('loading');
            btnSimpanVerifikasi.disabled = true;

            const payloadData = {
                ID: activeUsulanId,
                Verifikator_Status: document.getElementById('statusVerifikator').value,
                Verifikator_Catatan: document.getElementById('catatanEksternal').value,
                Keterangan_Internal: document.getElementById('catatanInternal').value,
                Verifikator_Tanggal: new Date().toISOString(),
                Keterangan_Tanggal: new Date().toISOString() // Menyimpan kapan catatan internal dibuat
            };

            // Loop dan cari input yg di-generate (ID berformat accThn_1, accThn_2 dst)
            for (let i = 1; i <= 5; i++) {
                let inputJenis = document.getElementById(`accJenis_${i}`);
                let inputThn = document.getElementById(`accThn_${i}`);
                let inputBln = document.getElementById(`accBln_${i}`);
                
                if (inputThn && inputBln && inputJenis) {
                    payloadData[`Verif_RK_${i}_Jenis`] = inputJenis.value;
                    payloadData[`Verif_RK_${i}_Tahun`] = parseInt(inputThn.value) || 0;
                    payloadData[`Verif_RK_${i}_Bulan`] = parseInt(inputBln.value) || 0;
                }
            }
            
            // Masukkan Total Akhir Verif
            let totalTahunStr = totalVerifTahun.value.split(' ')[0];
            let totalBulanStr = totalVerifBulan.value.split(' ')[0];
            payloadData.Total_Verif_Tahun = parseInt(totalTahunStr) || 0;
            payloadData.Total_Verif_Bulan = parseInt(totalBulanStr) || 0;

            const requestData = { action: 'updateUsulan', payload: payloadData };

            fetch(API_PMK_URL, {
                method: 'POST',
                body: JSON.stringify(requestData)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success', title: 'Verifikasi Disimpan', text: 'Data usulan telah diperbarui.', confirmButtonColor: '#3B82F6', timer: 1500
                    }).then(() => {
                        tutupModal(detailModal);
                        loadDataTabel(); 
                    });
                } else {
                    Swal.fire('Gagal', data.message, 'error');
                }
            })
            .catch(err => Swal.fire('Error', 'Gagal menghubungi server.', 'error'))
            .finally(() => {
                btnSimpanVerifikasi.classList.remove('loading');
                btnSimpanVerifikasi.disabled = false;
            });
        });
    }

    // ==========================================
    // 7. FITUR HAPUS USULAN (Keamanan Ketat)
    // ==========================================
    window.hapusUsulan = function(id) {
        // 1. Generate 4 Angka Acak
        const randomCode = Math.floor(1000 + Math.random() * 9000).toString();

        // 2. Tampilkan Konfirmasi Input dengan SweetAlert
        Swal.fire({
            title: 'Hapus Usulan?',
            html: `Tindakan ini akan menghapus usulan <b>${id}</b> beserta foldernya secara permanen.<br><br>Masukkan angka <b>${randomCode}</b> pada kotak berikut:`,
            icon: 'warning',
            input: 'text',
            inputAttributes: {
                autocapitalize: 'off',
                autocomplete: 'off',
                maxlength: 4,
                style: 'text-align: center; font-size: 1.5rem; letter-spacing: 5px; font-weight: bold;'
            },
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#94A3B8',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
            preConfirm: (inputValue) => {
                // Validasi input
                if (inputValue !== randomCode) {
                    Swal.showValidationMessage('Kode keamanan tidak sesuai!');
                    return false;
                }
                return true;
            }
        }).then((result) => {
            // 3. Jika input benar, eksekusi penghapusan ke API
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Menghapus Data & Folder...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                fetch(API_PMK_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'deleteUsulan',
                        payload: { ID: id }
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire('Terhapus!', data.message, 'success').then(() => {
                            loadDataTabel(); // Refresh tabel setelah dihapus
                        });
                    } else {
                        Swal.fire('Gagal Menghapus', data.message, 'error');
                    }
                })
                .catch(err => Swal.fire('Error', 'Gagal menghubungi server.', 'error'));
            }
        });
    }

    // ==========================================
    // 8. FITUR UNDUH EXCEL
    // ==========================================
    if (btnUnduhRekap) {
        btnUnduhRekap.addEventListener('click', function() {
            if (filteredData.length === 0) {
                Swal.fire('Data Kosong', 'Tidak ada usulan untuk diunduh.', 'warning');
                return;
            }

            const excelData = filteredData.map((item, index) => {
                return {
                    "No.": index + 1,
                    "NIP": "'" + item.NIP, 
                    "Nama": item.Nama || "-",
                    "Instansi": item.Unor_Induk || "-",
                    "Status Verifikator": item.Verifikator_Status || "Belum Diproses",
                    "Catatan Evaluasi": item.Verifikator_Catatan || "-",
                    "Masa Kerja Disetujui": `${item.Total_Verif_Tahun || 0} Tahun, ${item.Total_Verif_Bulan || 0} Bulan`,
                    "Keterangan": item.Keterangan_Internal || "-"
                };
            });

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wscols = [{wch: 5}, {wch: 22}, {wch: 30}, {wch: 25}, {wch: 20}, {wch: 40}, {wch: 25}, {wch: 30}];
            ws['!cols'] = wscols;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Rekap PMK");
            
            let dateNow = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Rekap_Verifikasi_PMK_${dateNow}.xlsx`);
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
                confirmButtonText: 'Ya, Keluar',
                cancelButtonText: 'Batal'
            }).then((res) => {
                if (res.isConfirmed) { sessionStorage.clear(); window.location.href = 'index.html'; }
            });
        });
    }

}); // DOMContentLoaded